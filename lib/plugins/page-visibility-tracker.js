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
import TrackerQueue from '../tracker-queue';
import {plugins, trackUsage} from '../usage';
import {assign, createFieldsObj, isObject, now, uuid} from '../utilities';


const HIDDEN = 'hidden';
const VISIBLE = 'visible';
const PAGE_ID = uuid();
const SECONDS = 1000;


const isSafari_ = !!(typeof safari === 'object' && safari.pushNotification);


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

    this.lastPageVisibilityState = document.visibilityState;
    this.visibleThresholdTimeout_ = null;
    this.isInitialPageviewSent_ = false;

    // Binds methods to `this`.
    this.init = this.init.bind(this);
    this.trackerSetOverride = this.trackerSetOverride.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
    this.handleExternalStoreSet = this.handleExternalStoreSet.bind(this);

    // Override the built-in tracker.set method to watch for changes.
    MethodChain.add(tracker, 'set', this.trackerSetOverride);

    addEventListener('visibilitychange', this.handleChange, true);

    // Safari does not reliably fire the `pagehide` or `visibilitychange`
    // events when closing a tab, so we have to use `beforeunload` with a
    // timeout to check whether the default action was prevented.
    // - https://bugs.webkit.org/show_bug.cgi?id=151610
    // - https://bugs.webkit.org/show_bug.cgi?id=151234
    // NOTE: we only add this to Safari because adding it to Firefox would
    // prevent the page from being eligible for bfcache.
    if (isSafari_) {
      addEventListener('beforeunload', this.handleChange, true);
    }

    const trackingId = tracker.get('trackingId');

    this.store = Store.getOrCreate(
        trackingId, 'plugins/page-visibility-tracker', {timestampKey: 'time'});

    this.store.on('externalSet', this.handleExternalStoreSet);

    this.session = Session.getOrCreate(
        tracker, this.opts.sessionTimeout, this.opts.timeZone);

    // Queue the rest of the initialization of the plugin idly.
    this.queue = TrackerQueue.getOrCreate(trackingId);
    this.queue.pushTask(this.init);
  }

  /**
   * Idly initializes the rest of the plugin instance initialization logic.
   * @param {{visibilityState: (string), time: (number)}} param1
   */
  init({visibilityState, time}) {
    if (visibilityState == VISIBLE) {
      if (this.opts.sendInitialPageview) {
        this.sendPageview({pageviewTime: time, isPageLoad: true});
        this.isInitialPageviewSent_ = true;
      }
      this.store.update(/** @type {PageVisibilityStoreData} */ ({
        time: time,
        state: VISIBLE,
        pageId: PAGE_ID,
        sessionId: this.session.id,
      }));
    } else {
      if (this.opts.sendInitialPageview && this.opts.pageLoadsMetricIndex) {
        this.sendPageLoad({pageLoadTime: time});
      }
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
    if (!(document.visibilityState == VISIBLE ||
        document.visibilityState == HIDDEN)) {
      return;
    }

    // If the visibilityState has changed to hidden, clear any scheduled
    // pageviews waiting for the visibleThreshold timeout.
    if (document.visibilityState == HIDDEN) {
      clearTimeout(this.visibleThresholdTimeout_);
    }

    // In some cases this method is invoked immediately before any
    // `tracker.set()`` calls will change the tracker's page field, but since
    // the Page Visibility event is idly queued we have to store the page at
    // the time right before the change.
    const page = this.tracker.get('page');

    this.queue.pushTask(({visibilityState, time}) => {
      const lastStoredChange = this.getAndValidateChangeData();

      /** @type {PageVisibilityStoreData} */
      const change = {
        time: time,
        state: visibilityState,
        pageId: PAGE_ID,
        sessionId: this.session.id,
      };

      if (this.session.isExpired(lastStoredChange.sessionId)) {
        this.store.clear();

        if (this.lastPageVisibilityState == HIDDEN &&
            visibilityState == VISIBLE) {
          // If the session has expired, changes from hidden to visible should
          // be considered a new pageview rather than a visibility event.
          // This behavior ensures all sessions contain a pageview so
          // session-level page dimensions and metrics (e.g. ga:landingPagePath
          // and ga:entrances) are correct.
          // Also, in order to prevent false positives, we add a small timeout
          // that is cleared if the visibilityState changes to hidden shortly
          // after the change to visible. This can happen if a user is quickly
          // switching through their open tabs but not actually interacting
          // with any of them. It can also happen when a user goes to a tab
          // just to immediately close it. Such cases should not be considered
          // pageviews.
          clearTimeout(this.visibleThresholdTimeout_);

          this.visibleThresholdTimeout_ = setTimeout(() => {
            this.store.update(change);
            this.sendPageview({pageviewTime: time, sessionDidExpire: true});
          }, this.opts.visibleThreshold);
        }
      } else {
        this.store.update(change);

        // If the visibilityState has changed to visible and the initial
        // pageview has not been sent (and the `sendInitialPageview` option
        // is `true`). Send the initial pageview now.
        // Otherwise, track the time the page has been visible if the last
        // recorded change was for the current page.
        if (visibilityState == VISIBLE &&
            this.opts.sendInitialPageview && !this.isInitialPageviewSent_) {
          this.sendPageview({pageviewTime: time});
          this.isInitialPageviewSent_ = true;
        } else if (lastStoredChange.pageId == PAGE_ID &&
            lastStoredChange.state == VISIBLE) {
          this.sendPageVisibilityEvent({
            startTime: lastStoredChange.time,
            endTime: time,
            page: page,
          });
        }
      }

      this.lastPageVisibilityState = visibilityState;
    });
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
        /** @type {PageVisibilityStoreData} */ (this.store.data);

    if (this.lastPageVisibilityState == VISIBLE &&
        lastStoredChange.state == HIDDEN &&
        lastStoredChange.pageId != PAGE_ID) {
      lastStoredChange.state = VISIBLE;
      lastStoredChange.pageId = PAGE_ID;
      this.store.update(lastStoredChange);
    }
    return lastStoredChange;
  }

  /**
   * Sends a Page Visibility event to track the time this page was in the
   * visible state (assuming it was in that state long enough to meet the
   * threshold).
   * @param {{
   *   startTime: (number|undefined),
   *   endTime: (number|undefined),
   *   page: (string|undefined),
   * }} param1
   */
  sendPageVisibilityEvent({startTime, endTime, page}) {
    const delta = endTime - startTime;

    // If the detla is greater than the visibileThreshold, report it.
    if (delta && delta >= this.opts.visibleThreshold) {
      const deltaInSeconds = Math.round(delta / SECONDS);

      this.queue.pushTask(() => {
        /** @type {FieldsObj} */
        const defaultFields = {
          transport: 'beacon',
          nonInteraction: true,
          eventCategory: 'Page Visibility',
          eventAction: 'track',
          eventValue: deltaInSeconds,
          eventLabel: NULL_DIMENSION,
          queueTime: now() - endTime,
        };

        // `lastVisiblePage` can be an empty string.
        if (typeof page == 'string') {
          defaultFields.page = page;
        }

        // If a custom metric was specified, set it equal to the event value.
        if (this.opts.visibleMetricIndex) {
          defaultFields['metric' + this.opts.visibleMetricIndex] =
              deltaInSeconds;
        }

        this.tracker.send('event',
            createFieldsObj(defaultFields, this.opts.fieldsObj,
                this.tracker, this.opts.hitFilter));
      });
    }
  }

  /**
   * Sends a page load event.
   * @param {{pageLoadTime: (number)}} param1
   */
  sendPageLoad({pageLoadTime}) {
    this.queue.pushTask(() => {
      /** @type {FieldsObj} */
      const defaultFields = {
        transport: 'beacon',
        eventCategory: 'Page Visibility',
        eventAction: 'page load',
        eventLabel: NULL_DIMENSION,
        ['metric' + this.opts.pageLoadsMetricIndex]: 1,
        nonInteraction: true,
        queueTime: pageLoadTime ? now() - pageLoadTime : undefined,
      };

      this.tracker.send('event',
          createFieldsObj(defaultFields, this.opts.fieldsObj,
              this.tracker, this.opts.hitFilter));
    });
  }

  /**
   * Sends a pageview, optionally calculating an offset if time is passed.
   * @param {{
   *   pageviewTime: (number),
   *   isPageLoad: (boolean|undefined),
   *   sessionDidExpire: (boolean|undefined),
   * }} param1
   */
  sendPageview({pageviewTime, isPageLoad, sessionDidExpire}) {
    this.queue.pushTask(() => {
      /** @type {FieldsObj} */
      const defaultFields = {
        transport: 'beacon',
        queueTime: now() - pageviewTime,
      };

      if (isPageLoad && this.opts.pageLoadsMetricIndex) {
        defaultFields['metric' + this.opts.pageLoadsMetricIndex] = 1;
      }

      this.tracker.send('pageview',
          createFieldsObj(defaultFields, this.opts.fieldsObj,
              this.tracker, this.opts.hitFilter));

      // If the session expired, sending a new pageview will generate a new
      // session ID. We need to make sure the store has that updated ID.
      if (sessionDidExpire) {
        this.store.update({sessionId: this.session.id});
      }
    });
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
        if (this.lastPageVisibilityState == VISIBLE) {
          this.handleChange();
        }
      }
      originalMethod(field, value);
    };
  }

  /**
   * Handles responding to the `storage` event.
   * The code on this page needs to be informed when other tabs or windows are
   * updating the stored page visibility state data. This method checks to see
   * if a hidden state is stored when there are still visible tabs open, which
   * can happen if multiple windows are open at the same time.
   * @param {!PageVisibilityStoreData} newData
   * @param {!PageVisibilityStoreData} oldData
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
      this.sendPageVisibilityEvent({
        startTime: oldData.time,
        endTime: newData.time,
      });
    }
  }

  /**
   * Handles responding to the `beforeunload` event.
   * Since some browsers don't emit a `visibilitychange` event in all cases
   * where a page might be unloaded, it's necessary to hook into the
   * `beforeunload` event to ensure the correct state is always stored.
   */
  handleBeforeUnload() {
    // If the stored visibility state isn't hidden when the beforeunload event
    // fires, it means the visibilitychange event didn't fire as the document
    // was being unloaded, so we invoke it manually.
    if (this.lastPageVisibilityState != HIDDEN) {
      this.handleChange();
    }
  }

  /**
   * Removes all event listeners and restores overridden methods.
   */
  remove() {
    this.queue.destroy();
    this.store.destroy();
    this.session.destroy();

    MethodChain.remove(this.tracker, 'set', this.trackerSetOverride);
    removeEventListener('beforeunload', this.handleBeforeUnload, true);
    removeEventListener('visibilitychange', this.handleChange, true);
  }
}


provide('pageVisibilityTracker', PageVisibilityTracker);
