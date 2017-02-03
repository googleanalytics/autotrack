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
import {assign, createFieldsObj, isObject, now, uuid} from '../utilities';


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
    if (!window.addEventListener) return;

    /** @type {PageVisibilityTrackerOpts} */
    const defaultOpts = {
      sessionTimeout: Session.DEFAULT_TIMEOUT,
      // timeZone: undefined,
      // visibleMetricIndex: undefined,
      fieldsObj: {},
      // hitFilter: undefined
    };

    this.opts = /** @type {PageVisibilityTrackerOpts} */ (
        assign(defaultOpts, opts));

    this.tracker = tracker;
    this.lastPageState = null;

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
    this.session = new Session(
        tracker, this.opts.sessionTimeout, this.opts.timeZone);

    // Override the built-in tracker.set method to watch for changes.
    MethodChain.add(tracker, 'set', this.trackerSetOverride);

    document.addEventListener('visibilitychange', this.handleChange);
    window.addEventListener('unload', this.handleWindowUnload);
    if (document.visibilityState == VISIBLE) {
      this.handleChange();
    }
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
    const lastStoredChange = this.validateChangeData(this.store.get());

    /** @type {PageVisibilityStoreData} */
    const change = {
      time: now(),
      state: document.visibilityState,
      pageId: PAGE_ID,
    };

    if (this.session.isExpired()) {
      if (document.visibilityState == HIDDEN) {
        // Hidden events should never be sent if a session has expired (if
        // they are, they'll likely start a new session with just this event).
        this.store.clear();
      } else {
        // If the session has expired, changes to visible should be considered
        // a new pageview rather than a visibility event.
        // This behavior ensures all sessions contain a pageview so
        // session-level page dimensions and metrics (e.g. ga:landingPagePath
        // and ga:entrances) are correct.

        /** @type {FieldsObj} */
        const defaultFields = {transport: 'beacon'};
        this.tracker.send('pageview',
            createFieldsObj(defaultFields, this.opts.fieldsObj,
                this.tracker, this.opts.hitFilter));

        this.store.set(change);
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
   * @param {PageVisibilityStoreData} lastStoredChange
   * @return {PageVisibilityStoreData}
   */
  validateChangeData(lastStoredChange) {
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
   * Sends a Page Visibility event with the passed event action and visibility
   * state. If a previous state change exists within the same session, the time
   * delta is tracked as the event label and optionally as a custom metric.
   * @param {PageVisibilityStoreData} lastStoredChange
   * @param {number|undefined=} hitTime A hit timestap used to help ensure
   *     original order when reporting across multiple windows/tabs.
   */
  sendPageVisibilityEvent(lastStoredChange, hitTime = undefined) {
    /** @type {FieldsObj} */
    const defaultFields = {
      transport: 'beacon',
      nonInteraction: true,
      eventCategory: 'Page Visibility',
      eventAction: 'track',
      eventLabel: NULL_DIMENSION,
    };
    if (hitTime) {
      defaultFields.queueTime = now() - hitTime;
    }

    const delta = this.getTimeSinceLastStoredChange(lastStoredChange, hitTime);

    // If at least a one second delta exists, report it.
    if (delta) {
      defaultFields.eventValue = delta;

      // If a custom metric was specified, set it equal to the event value.
      if (this.opts.visibleMetricIndex) {
        defaultFields['metric' + this.opts.visibleMetricIndex] = delta;
      }
    }

    this.tracker.send('event',
        createFieldsObj(defaultFields, this.opts.fieldsObj,
            this.tracker, this.opts.hitFilter));
  }

  /**
   * Detects changes to the tracker object and triggers an update if the page
   * field has changed.
   * @param {function(...*)} originalMethod A reference to the overridden
   *     method.
   * @return {function(...*)}
   */
  trackerSetOverride(originalMethod) {
    return (...args) => {
      /** @type {!FieldsObj} */
      const fields = isObject(args[0]) ? args[0] : {[args[0]]: args[1]};
      if (fields.page && fields.page !== this.tracker.get('page')) {
        if (this.lastPageState == VISIBLE) {
          this.handleChange();
        }
      }
      originalMethod(...args);
    };
  }

  /**
   * Calculates the time since the last visibility change event in the current
   * session. If the session has expired the reported time is zero.
   * @param {PageVisibilityStoreData} lastStoredChange
   * @param {number=} hitTime The timestamp of the current hit, defaulting
   *     to now.
   * @return {number} The time (in ms) since the last change.
   */
  getTimeSinceLastStoredChange(lastStoredChange, hitTime = now()) {
    const isSessionActive = !this.session.isExpired();
    const timeSinceLastStoredChange = lastStoredChange.time &&
        Math.round((hitTime - lastStoredChange.time) / SECONDS);

    return isSessionActive &&
        timeSinceLastStoredChange > 0 ? timeSinceLastStoredChange : 0;
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
        oldData.state == VISIBLE) {
      this.sendPageVisibilityEvent(oldData, newData.time);
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
    this.session.destroy();
    MethodChain.remove(this.tracker, 'set', this.trackerSetOverride);
    window.removeEventListener('unload', this.handleWindowUnload);
    document.removeEventListener('visibilitychange', this.handleChange);
  }
}


provide('pageVisibilityTracker', PageVisibilityTracker);
