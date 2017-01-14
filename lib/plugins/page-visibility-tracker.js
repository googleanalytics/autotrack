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
import Hook from '../hook';
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
 * Class for the `mediaQueryTracker` analytics.js plugin.
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
    this.visibilityState = null;

    // Binds methods to `this`.
    this.trackerSetHook = this.trackerSetHook.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.handleWindowUnload = this.handleWindowUnload.bind(this);
    this.handleExternalStoreSet = this.handleExternalStoreSet.bind(this);

    // Creates the store and binds storage change events.
    this.store = Store.getOrCreate(
        tracker.get('trackingId'), 'plugins/page-visibility-tracker');
    this.store.on('externalSet', this.handleExternalStoreSet);

    // Creates the session and binds session events.
    this.session = new Session(tracker, opts.sessionTimeout, opts.timeZone);

    // analytics.js trackers treat `title` as a special field. If you don't
    // ever call `set()` and pass in a title, calling `get()` will just return
    // document.title. To get analytics.js to treat it like every other field
    // we set it to its current value.
    // NOTE: this could have some side-effects if people unknowingly depend
    // on this auto title behavior, but for the sake of consistency it seems
    // worth normalizing in this plugin.
    tracker.set('title', tracker.get('title'));

    // Override the built-in tracker.set method to watch for changes.
    Hook.addBefore(tracker, 'set', this.trackerSetHook);

    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('unload', this.handleWindowUnload);
    if (getVisibilityState() == VISIBLE) {
      this.updateVisibilityState();
    }
  }

  /**
   * Handles responding to `visiblitychange` events. If the visibility
   * state is changing to hidden, ensure the last visibility state is accurate
   * before tracking the visibility event.
   */
  handleVisibilityChange() {
    let lastVisibilityChange;
    if (getVisibilityState() == HIDDEN) {
      lastVisibilityChange =
          this.ensureProperLastVisibilityChange(this.store.get());
    }
    this.updateVisibilityState(lastVisibilityChange);
  }

  /**
   * Detects changes to the tracker object and triggers a visibility
   * update if the page or title fields change.
   * @param {Object|string} field The analytics field name or an objct of
   *     field/value pairs.
   * @param {*=} value The field value or undefined if `field` is an object.
   */
  trackerSetHook(field, value) {
    const fields = isObject(field) ? field : {[field]: value};
    if (fields.page && fields.page !== this.tracker.get('page') ||
        fields.title && fields.title !== this.tracker.get('title')) {

      const lastVisibilityChange =
          this.ensureProperLastVisibilityChange(this.store.get());

      this.updateVisibilityState(lastVisibilityChange);
    }
  }

  /**
   * In cases where multiple windows are open and one of those windows gets
   * closed, there could be open windows in the visible state state but
   * that state is not reflected in the store. To handle this, we wait for
   * a subsequent interaction and then retroactively update the last
   * visibility change data with the current page ID.
   * @param {PageVisibilityStoreData} lastVisibilityChange
   * @return {PageVisibilityStoreData}
   */
  ensureProperLastVisibilityChange(lastVisibilityChange) {
    if (lastVisibilityChange.pageId != PAGE_ID) {
      lastVisibilityChange.state = VISIBLE;
      lastVisibilityChange.pageId = PAGE_ID;
      this.store.set(lastVisibilityChange);
    }
    return lastVisibilityChange;
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
   * @param {PageVisibilityStoreData=} lastVisibilityChange
   */
  updateVisibilityState(lastVisibilityChange = this.store.get()) {
    const visibilityState = getVisibilityState();

    /** @type {PageVisibilityStoreData} */
    const visibilityChange = {
      time: now(),
      state: visibilityState,
      pageId: PAGE_ID,
    };

    if (this.session.isExpired()) {
      if (visibilityState == HIDDEN) {
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

        this.store.set(visibilityChange);
      }
    } else {
      if (lastVisibilityChange.pageId == PAGE_ID) {
        this.sendPageVisibilityEvent(lastVisibilityChange);
      }
      this.store.set(visibilityChange);
    }
  }

  /**
   * Sends a Page Visibility event with the passed event action and visibility
   * state. If a previous state change exists within the same session, the time
   * delta is tracked as the event label and optionally as a custom metric.
   * @param {Object} lastVisibilityChange The last stored visibility change data
   */
  sendPageVisibilityEvent(lastVisibilityChange) {
    if (lastVisibilityChange.state != VISIBLE) return;

    const timeSinceLastVisibilityChange =
        this.getTimeSinceLastVisibilityChange(lastVisibilityChange.time);

    /** @type {FieldsObj} */
    const defaultFields = {
      transport: 'beacon',
      nonInteraction: true,
      eventCategory: 'Page Visibility',
      eventAction: 'track',
      eventLabel: NULL_DIMENSION,
    };

    // If at least a one second delta exists, report it.
    if (timeSinceLastVisibilityChange) {
      defaultFields.eventValue = timeSinceLastVisibilityChange;

      // If a custom metric was specified for the current visibility state,
      // give it the same value as the event value.
      const metric = this.opts.visibleMetricIndex;
      if (metric) {
        defaultFields['metric' + metric] = timeSinceLastVisibilityChange;
      }
    }

    this.tracker.send('event',
        createFieldsObj(defaultFields, this.opts.fieldsObj,
            this.tracker, this.opts.hitFilter));
  }

  /**
   * Calculates the time since the last visibility change event in the current
   * session. If the session has expired the reported time is zero.
   * @param {number} lastVisibilityChangeTime The timestamp of the last change
   *     event.
   * @return {number} The time (in ms) since the last change.
   */
  getTimeSinceLastVisibilityChange(lastVisibilityChangeTime) {
    const isSessionActive = !this.session.isExpired();
    const timeSinceChange = lastVisibilityChangeTime &&
        Math.round((now() - lastVisibilityChangeTime) / SECONDS);

    return isSessionActive && timeSinceChange > 0 ? timeSinceChange : 0;
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
    if (oldData.pageId == PAGE_ID) {
      this.sendPageVisibilityEvent(oldData);
    }
  }

  /**
   * Handles responding to the `unload` event.
   * Since some browsers don't emit a `visibilitychange` event in all cases
   * where a page might be unloaded, it's necessary to hook into the `unload`
   * event to ensure the correct state is always stored.
   */
  handleWindowUnload() {
    const lastVisibilityChange = this.store.get();
    if (!(lastVisibilityChange.state == HIDDEN &&
        lastVisibilityChange.pageId == PAGE_ID)) {
      this.updateVisibilityState();
    }
  }

  /**
   * Removes all event listeners and restores overridden methods.
   */
  remove() {
    this.session.destroy();
    Hook.removeBefore(this.tracker, 'set', this.trackerSetHook);
    window.removeEventListener('unload', this.handleWindowUnload);
    document.removeEventListener('visibilitychange',
        this.handleVisibilityChange);
  }
}


provide('pageVisibilityTracker', PageVisibilityTracker);


/**
 * Returns the visibility state of the document. The primary purpose of this
 * method is for testing since `document.visibilityState` can't be altered.
 * @return {string} The visibility state.
 */
function getVisibilityState() {
  return document.visibilityState;
}
