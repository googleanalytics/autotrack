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


import {parseUrl} from 'dom-utils';
import provide from '../provide';
import Session from '../session';
import Store from '../storage';
import {plugins, trackUsage} from '../usage';
import {assign, createFieldsObj, now, uuid} from '../utilities';

// import historyWatcher from '../history-watcher';
// import TrackerWatcher from '../tracker-watcher';

const HIDDEN = 'hidden';
const VISIBLE = 'visible';
const PAGE_ID = uuid();
const SECONDS = 1000;

// visibilitychange
// urlchange


/**
 * Class for the `mediaQueryTracker` analytics.js plugin.
 */
class PageVisibilityTracker {
  /**
   * Registers outbound link tracking on tracker object.
   * @constructor
   * @param {Object} tracker Passed internally by analytics.js
   * @param {?Object} opts Passed by the require command.
   */
  constructor(tracker, opts) {
    trackUsage(tracker, plugins.PAGE_VISIBILITY_TRACKER);

    // Feature detects to prevent errors in unsupporting browsers.
    if (!window.addEventListener) return;

    this.opts = assign({
      sessionTimeout: Session.DEFAULT_TIMEOUT,
      timeZone: null,
      hiddenMetricIndex: null,
      visibleMetricIndex: null,
      changeTemplate: this.changeTemplate,
      fieldsObj: {},
      hitFilter: null
    }, opts);

    const trackingId = tracker.get('trackingId');
    this.tracker = tracker;

    // Tracks the initial pageview to ensure Page Visibility events aren't
    // sent prior to the initial pageview being sent.
    this.isInitialPageviewSent = false;
    this.isInitialVisibilityChangeSent = false;

    // Binds methods to `this`.
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.handleWindowUnload = this.handleWindowUnload.bind(this);
    this.handleStorageChange = this.handleStorageChange.bind(this);

    // Creates the store and binds storage change events.
    this.store = new Store(trackingId, 'plugins/page-visibility-tracker');
    this.store.storageDidChangeInAnotherWindow = this.handleStorageChange;

    // Creates the session and binds session events.
    this.session = new Session(tracker, opts.sessionTimeout, opts.timeZone);

    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('unload', this.handleWindowUnload);
    this.handleVisibilityChange();
  }

  /**
   * Updates the store and schedules a new heartbeat anytime a new sessions
   * start is detected in the current tab.
   */
  newSessionDidStart() {
    // Updates the previously stored page and change time to avoid reporting
    // deltas with events in a prior session.
    this.store.set({
      time: now(),
      page: this.getPage(),
      pageId: PAGE_ID,
      // Do not update state, it should only be updated in the change handler.
    });
  }

  /**
   * Handles responding to `visiblitychange` events.
   * This method sends events when the visibility state changes during active
   * session (active meaning the session has not expired). If the session has
   * expired, a change to `visible` will trigger an additional pageview.
   * This method also sends as the event value (and optionally custom metrics)
   * the elapsed time between this event and the previously reported one change
   * in the same session, allowing you to more accurately determine when users
   * were actually looking at your page versus when it was in the background.
   */
  handleVisibilityChange() {
    // Stores the visibility state on the instance so it can be referenced
    // in the unload handler.
    // TODO(philipwalton): consider storing this on the tracker as well.
    const visibilityState = this.visibilityState = this.getVisibilityState();

    // Ignore visibilityStates that aren't hidden or visible.
    if (!(visibilityState == VISIBLE || visibilityState == HIDDEN)) return;

    if (visibilityState == HIDDEN) {
      // Hidden events should never be sent if a session has expired
      // (if they are, they'll likely start a new session with just this event).
      if (this.session.isExpired()) {
        this.store.clear();
        return;
      }
    }

    if (visibilityState == VISIBLE) {
      // If the session has expired, or if a new session has started in another
      // tab, but the current tab hasn't sent any interaction hits in the new
      // session, send a pageview prior to the visible event.
      // This behavior ensures all new sessions start with a pageview so
      // session-level page dimensions and metrics (e.g. ga:landingPagePath
      // and ga:entrances) are correct.
      if (this.session.isExpired() ||
          this.session.isLastTrackerInteractionFromPreviousSession()) {
        const defaultFields = {transport: 'beacon'};
        this.tracker.send('pageview',
            createFieldsObj(defaultFields, this.opts.fieldsObj,
                this.tracker, this.opts.hitFilter));
      }
    }

    const lastVisibilityChange = this.store.get();
    this.sendPageVisibilityEvent(lastVisibilityChange);
    this.store.set({
      time: now(),
      state: visibilityState,
      page: this.getPage(),
      pageId: PAGE_ID,
    });
  }

  /**
   * Sends a Page Visibility event with the passed event action and visibility
   * state. If a previous state change exists within the same session, the time
   * delta is tracked as the event label and optionally as a custom metric.
   * @param {Object} lastVisibilityChange The last stored visibility change data
   */
  sendPageVisibilityEvent(lastVisibilityChange) {
    const visibilityState = this.getVisibilityState();
    const timeSinceLastVisibilityChange =
        this.getTimeSinceLastVisibilityChange(lastVisibilityChange.time);

    const defaultFields = {
      transport: 'beacon',
      nonInteraction: true,
      eventCategory: 'Page Visibility',
      eventAction: 'change',
      eventLabel: this.formatChange(visibilityState, lastVisibilityChange),
    };

    // If at least a one second delta exists, report it.
    if (timeSinceLastVisibilityChange) {
      defaultFields.eventValue = timeSinceLastVisibilityChange;

      // If a custom metric was specified for the current visibility state,
      // give it the same value as the event value.
      const metric = this.opts[lastVisibilityChange.state + 'MetricIndex'];
      if (metric) {
        defaultFields['metric' + metric] = timeSinceLastVisibilityChange;
      }
    }

    // A previous page path is stored, set it as the page value.
    if (lastVisibilityChange.page) {
      defaultFields.page = lastVisibilityChange.page;
    }

    this.tracker.send('event',
        createFieldsObj(defaultFields, this.opts.fieldsObj,
            this.tracker, this.opts.hitFilter));

    // Tracks whether a visibility change event has already been sent to avoid
    // double sending for the initial pageload.
    this.isInitialVisibilityChangeSent = true;
  }

  /**
   * Computes the visibility change from and to states and invokes the change
   * template.
   * @param {string} visibilityState The current visibility state.
   * @param {Object} lastVisibilityChange The last visiblity change data. If this
   *     does not include state data, the inverse of `visibilityState` is used.
   * @return {string} The result of the change template function.
   */
  formatChange(visibilityState, lastVisibilityChange) {
    const lastVisibilityState = lastVisibilityChange.state ||
        (visibilityState == HIDDEN ? VISIBLE : HIDDEN);
    return this.opts.changeTemplate(lastVisibilityState, visibilityState);
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
   */
  handleStorageChange() {
    if (this.getVisibilityState() == VISIBLE) {
      const lastVisibilityChange = this.store.get();

      if (lastVisibilityChange.state == HIDDEN) {
        // Writing to localStorage inside a storage event handler is dangerous as
        // it can easily lead to an infinite loop. In this case the write only
        // happens on pages whose visibility state is `visible` and for which
        // another page updated the stored visibility state to `hidden`. When
        // that happens all visible tabs will then invoke this update, but it
        // won't be invoked a second time per page because after the first time
        // the stored visibility state will be `visible`. The end result will
        // be a single page ID stored in the visible state.
        this.store.set({
          state: VISIBLE,
          page: this.getPage(),
          pageId: PAGE_ID,
        });
      }
    }
  }

  /**
   * Handles responding to the `unload` event.
   * Since some browsers don't emit a `visibilitychange` event in all cases where
   * a page might be unloaded, it's necessary to hook into the `unload` event to
   * ensure the correct state is always stored.
   */
  handleWindowUnload() {
    if (this.visibilityState != HIDDEN) {
      this.handleVisibilityChange();
    }
  }

  /**
   * Sets the default formatting of the change event label.
   * This can be overridden by setting the `changeTemplate` option.
   * @param {string} oldValue The value of the media query prior to the change.
   * @param {string} newValue The value of the media query after the change.
   * @return {string} The formatted event label.
   */
  changeTemplate(oldValue, newValue) {
    return oldValue + ' => ' + newValue;
  }

  /**
   * Gets the current page field from the tracker or infers it from the
   * location field.
   * @return {string} The real or inferred page field.
   */
  getPage() {
    const page = this.tracker.get('page');
    if (page) {
      return page;
    } else {
      const locationUrl = parseUrl(this.tracker.get('location'));
      return locationUrl.path + locationUrl.hash;
    }
  }

  /**
   * Returns the visibility state of the document. The primary purpose of this
   * method is for testing since `document.visibilityState` can't be altered.
   * @return {string} The visibility state.
   */
  getVisibilityState() {
    return document.visibilityState;
  }

  /**
   * Removes all event listeners and instance properties.
   */
  remove() {
    this.tracker.send = this.oldTrackerSendMethod;
    this.session.restore();

    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('storage', this.handleStorageChange);
    window.removeEventListener('unload', this.handleWindowUnload);
  }
}


export default provide('pageVisibilityTracker', PageVisibilityTracker);
