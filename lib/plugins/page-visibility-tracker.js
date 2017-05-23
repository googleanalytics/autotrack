/**
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


import {NULL_DIMENSION} from '../constants';
import MethodChain from '../method-chain';
import provide from '../provide';
import Session from '../session';
import Store from '../store';
import {plugins, trackUsage} from '../usage';
import {assign, createFieldsObj, deferUntilPluginsLoaded,
    isObject, now, uuid} from '../utilities';


const HIDDEN = 'hidden';
const VISIBLE = 'visible';
const PAGE_ID = uuid();
const SECONDS = 1000;


/**
 * Class for the `pageVisibilityTracker` analytics.js plugin.
 * @implements {PageVisibilityTrackerPublicInterface}
 */
class PageVisibilityTracker {
  /**
   * Registers outbound link tracking on tracker object.
   * @param {!Tracker} tracker Passed internally by analytics.js
   * @param {?Object} opts Passed by the require command.
   */
  constructor(tracker, opts) {
    trackUsage(tracker, plugins.PAGE_VISIBILITY_TRACKER);

    // Feature detects to prevent errors in unsupporting browsers.
    if (!document.visibilityState) return;

    /** @type {PageVisibilityTrackerOpts} */
    const defaultOpts = {
      sessionTimeout: Session.DEFAULT_TIMEOUT,
      visibleThreshold: 5 * SECONDS,
      // timeZone: undefined,
      sendInitialPageview: false,
      // pageLoadsMetricIndex: undefined,
      // visibleMetricIndex: undefined,
      fieldsObj: {},
      // hitFilter: undefined
    };

    this.opts = /** @type {PageVisibilityTrackerOpts} */ (
        assign(defaultOpts, opts));

    this.tracker = tracker;
    this.lastPageState = document.visibilityState;
    this.visibleThresholdTimeout_ = null;
    this.isInitialPageviewSent_ = false;

    // Binds methods to `this`.
    this.trackerSetOverride = this.trackerSetOverride.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleWindowUnload = this.handleWindowUnload.bind(this);
    this.handleExternalStoreSet = this.handleExternalStoreSet.bind(this);

    // Creates the store and binds storage change events.
    this.store = Store.getOrCreate(
        tracker.get('trackingId'), 'plugins/page-visibility-tracker');
    this.store.on('externalSet', this.handleExternalStoreSet);

    // Creates the session and binds session events.
    this.session = Session.getOrCreate(
        tracker, this.opts.sessionTimeout, this.opts.timeZone);

    // Override the built-in tracker.set method to watch for changes.
    MethodChain.add(tracker, 'set', this.trackerSetOverride);

    window.addEventListener('unload', this.handleWindowUnload);
    document.addEventListener('visibilitychange', this.handleChange);

    // Postpone sending any hits until the next call stack, which allows all
    // autotrack plugins to be required sync before any hits are sent.
    deferUntilPluginsLoaded(this.tracker, () => {
      if (document.visibilityState == VISIBLE) {
        if (this.opts.sendInitialPageview) {
          this.sendPageview({isPageLoad: true});
          this.isInitialPageviewSent_ = true;
        }
        this.store.set(/** @type {PageVisibilityStoreData} */ ({
          time: now(),
          state: VISIBLE,
          pageId: PAGE_ID,
          sessionId: this.session.getId(),
        }));
      } else {
        if (this.opts.sendInitialPageview && this.opts.pageLoadsMetricIndex) {
          this.sendPageLoad();
        }
      }
    });
  }

  /**
   * Inspects the last visibility state change data and determines if a
   * visibility event needs to be tracked based on the current visibility
   * state and whether or not the session has expired. If the session has
   * expired, a change to `visible` will trigger an additional pageview.
   * This method also sends as the event value (and optionally a custom metric)
   * the elapsed time between this event and the previously reported change
   * in the same session, allowing you to more accurately determine when users
   * were actually looking at your page versus when it was in the background.
   */
  handleChange() {
    if (!(document.visibilityState == VISIBLE ||
        document.visibilityState == HIDDEN)) {
      return;
    }

    const lastStoredChange = this.getAndValidateChangeData();

    /** @type {PageVisibilityStoreData} */
    const change = {
      time: now(),
      state: document.visibilityState,
      pageId: PAGE_ID,
      sessionId: this.session.getId(),
    };

    // If the visibilityState has changed to visible and the initial pageview
    // has not been sent (and the `sendInitialPageview` option is `true`).
    // Send the initial pageview now.
    if (document.visibilityState == VISIBLE &&
        this.opts.sendInitialPageview && !this.isInitialPageviewSent_) {
      this.sendPageview();
      this.isInitialPageviewSent_ = true;
    }

    // If the visibilityState has changed to hidden, clear any scheduled
    // pageviews waiting for the visibleThreshold timeout.
    if (document.visibilityState == HIDDEN && this.visibleThresholdTimeout_) {
      clearTimeout(this.visibleThresholdTimeout_);
    }

    if (this.session.isExpired(lastStoredChange.sessionId)) {
      this.store.clear();
      if (this.lastPageState == HIDDEN &&
          document.visibilityState == VISIBLE) {
        // If the session has expired, changes from hidden to visible should
        // be considered a new pageview rather than a visibility event.
        // This behavior ensures all sessions contain a pageview so
        // session-level page dimensions and metrics (e.g. ga:landingPagePath
        // and ga:entrances) are correct.
        // Also, in order to prevent false positives, we add a small timeout
        // that is cleared if the visibilityState changes to hidden shortly
        // after the change to visible. This can happen if a user is quickly
        // switching through their open tabs but not actually interacting with
        // and of them. It can also happen when a user goes to a tab just to
        // immediately close it. Such cases should not be considered pageviews.
        clearTimeout(this.visibleThresholdTimeout_);
        this.visibleThresholdTimeout_ = setTimeout(() => {
          this.store.set(change);
          this.sendPageview({hitTime: change.time});
        }, this.opts.visibleThreshold);
      }
    } else {
      if (lastStoredChange.pageId == PAGE_ID &&
          lastStoredChange.state == VISIBLE) {
        this.sendPageVisibilityEvent(lastStoredChange);
      }
      this.store.set(change);
    }

    this.lastPageState = document.visibilityState;
  }

  /**
   * Retroactively updates the stored change data in cases where it's known to
   * be out of sync.
   * This plugin keeps track of each visiblity change and stores the last one
   * in localStorage. LocalStorage is used to handle situations where the user
   * has multiple page open at the same time and we don't want to
   * double-report page visibility in those cases.
   * However, a problem can occur if a user closes a page when one or more
   * visible pages are still open. In such cases it's impossible to know
   * which of the remaining pages the user will interact with next.
   * To solve this problem we wait for the next change on any page and then
   * retroactively update the stored data to reflect the current page as being
   * the page on which the last change event occured and measure visibility
   * from that point.
   * @return {!PageVisibilityStoreData}
   */
  getAndValidateChangeData() {
    const lastStoredChange =
        /** @type {PageVisibilityStoreData} */ (this.store.get());

    if (this.lastPageState == VISIBLE &&
        lastStoredChange.state == HIDDEN &&
        lastStoredChange.pageId != PAGE_ID) {
      lastStoredChange.state = VISIBLE;
      lastStoredChange.pageId = PAGE_ID;
      this.store.set(lastStoredChange);
    }
    return lastStoredChange;
  }

  /**
   * Sends a Page Visibility event to track the time this page was in the
   * visible state (assuming it was in that state long enough to meet the
   * threshold).
   * @param {!PageVisibilityStoreData} lastStoredChange
   * @param {{hitTime: (number|undefined)}=} param1
   *     - hitTime: A hit timestap used to help ensure original order in cases
   *                where the send is delayed.
   */
  sendPageVisibilityEvent(lastStoredChange, {hitTime} = {}) {
    const delta = this.getTimeSinceLastStoredChange(
        lastStoredChange, {hitTime});

    // If the detla is greater than the visibileThreshold, report it.
    if (delta && delta >= this.opts.visibleThreshold) {
      const deltaInSeconds = Math.round(delta / SECONDS);

      /** @type {FieldsObj} */
      const defaultFields = {
        transport: 'beacon',
        nonInteraction: true,
        eventCategory: 'Page Visibility',
        eventAction: 'track',
        eventValue: deltaInSeconds,
        eventLabel: NULL_DIMENSION,
      };

      if (hitTime) {
        defaultFields.queueTime = now() - hitTime;
      }

      // If a custom metric was specified, set it equal to the event value.
      if (this.opts.visibleMetricIndex) {
        defaultFields['metric' + this.opts.visibleMetricIndex] = deltaInSeconds;
      }

      this.tracker.send('event',
          createFieldsObj(defaultFields, this.opts.fieldsObj,
              this.tracker, this.opts.hitFilter));
    }
  }

  /**
   * Sends a page load event.
   */
  sendPageLoad() {
    /** @type {FieldsObj} */
    const defaultFields = {
      transport: 'beacon',
      eventCategory: 'Page Visibility',
      eventAction: 'page load',
      eventLabel: NULL_DIMENSION,
      ['metric' + this.opts.pageLoadsMetricIndex]: 1,
      nonInteraction: true,
    };
    this.tracker.send('event',
        createFieldsObj(defaultFields, this.opts.fieldsObj,
            this.tracker, this.opts.hitFilter));
  }

  /**
   * Sends a pageview, optionally calculating an offset if hitTime is passed.
   * @param {{
   *   hitTime: (number|undefined),
   *   isPageLoad: (boolean|undefined)
   * }=} param1
   *     hitTime: The timestamp of the current hit.
   *     isPageLoad: True if this pageview was also a page load.
   */
  sendPageview({hitTime, isPageLoad} = {}) {
    /** @type {FieldsObj} */
    const defaultFields = {transport: 'beacon'};
    if (hitTime) {
      defaultFields.queueTime = now() - hitTime;
    }
    if (isPageLoad && this.opts.pageLoadsMetricIndex) {
      defaultFields['metric' + this.opts.pageLoadsMetricIndex] = 1;
    }

    this.tracker.send('pageview',
        createFieldsObj(defaultFields, this.opts.fieldsObj,
            this.tracker, this.opts.hitFilter));
  }

  /**
   * Detects changes to the tracker object and triggers an update if the page
   * field has changed.
   * @param {function((Object|string), (string|undefined))} originalMethod
   *     A reference to the overridden method.
   * @return {function((Object|string), (string|undefined))}
   */
  trackerSetOverride(originalMethod) {
    return (field, value) => {
      /** @type {!FieldsObj} */
      const fields = isObject(field) ? field : {[field]: value};
      if (fields.page && fields.page !== this.tracker.get('page')) {
        if (this.lastPageState == VISIBLE) {
          this.handleChange();
        }
      }
      originalMethod(field, value);
    };
  }

  /**
   * Calculates the time since the last visibility change event in the current
   * session. If the session has expired the reported time is zero.
   * @param {PageVisibilityStoreData} lastStoredChange
   * @param {{hitTime: (number|undefined)}=} param1
   *     hitTime: The time of the current hit (defaults to now).
   * @return {number} The time (in ms) since the last change.
   */
  getTimeSinceLastStoredChange(lastStoredChange, {hitTime} = {}) {
    return lastStoredChange.time ?
        (hitTime || now()) - lastStoredChange.time : 0;
  }

  /**
   * Handles responding to the `storage` event.
   * The code on this page needs to be informed when other tabs or windows are
   * updating the stored page visibility state data. This method checks to see
   * if a hidden state is stored when there are still visible tabs open, which
   * can happen if multiple windows are open at the same time.
   * @param {PageVisibilityStoreData} newData
   * @param {PageVisibilityStoreData} oldData
   */
  handleExternalStoreSet(newData, oldData) {
    // If the change times are the same, then the previous write only
    // updated the active page ID. It didn't enter a new state and thus no
    // hits should be sent.
    if (newData.time == oldData.time) return;

    // Page Visibility events must be sent by the tracker on the page
    // where the original event occurred. So if a change happens on another
    // page, but this page is where the previous change event occurred, then
    // this page is the one that needs to send the event (so all dimension
    // data is correct).
    if (oldData.pageId == PAGE_ID &&
        oldData.state == VISIBLE &&
        !this.session.isExpired(oldData.sessionId)) {
      this.sendPageVisibilityEvent(oldData, {hitTime: newData.time});
    }
  }

  /**
   * Handles responding to the `unload` event.
   * Since some browsers don't emit a `visibilitychange` event in all cases
   * where a page might be unloaded, it's necessary to hook into the `unload`
   * event to ensure the correct state is always stored.
   */
  handleWindowUnload() {
    // If the stored visibility state isn't hidden when the unload event
    // fires, it means the visibilitychange event didn't fire as the document
    // was being unloaded, so we invoke it manually.
    if (this.lastPageState != HIDDEN) {
      this.handleChange();
    }
  }

  /**
   * Removes all event listeners and restores overridden methods.
   */
  remove() {
    this.store.destroy();
    this.session.destroy();
    MethodChain.remove(this.tracker, 'set', this.trackerSetOverride);
    window.removeEventListener('unload', this.handleWindowUnload);
    document.removeEventListener('visibilitychange', this.handleChange);
  }
}


provide('pageVisibilityTracker', PageVisibilityTracker);
