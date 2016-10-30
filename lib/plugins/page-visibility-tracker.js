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


var assign = require('object-assign');
var provide = require('../provide');
var session = require('../session');
var storage = require('../storage');
var usage = require('../usage');
var createFieldsObj = require('../utilities').createFieldsObj;
var isObject = require('../utilities').isObject;
var now = require('../utilities').now;
var uuid = require('../utilities').uuid;


var DEFAULT_SESSION_TIMEOUT = 30; // 30 minutes.
var HIDDEN = 'hidden';
var VISIBLE = 'visible';
var PAGE_ID = uuid();


/**
 * Registers outbound link tracking on tracker object.
 * @constructor
 * @param {Object} tracker Passed internally by analytics.js
 * @param {?Object} opts Passed by the require command.
 */
function PageVisibilityTracker(tracker, opts) {
  usage.track(tracker, usage.plugins.PAGE_VISIBILITY_TRACKER);

  // Feature detects to prevent errors in unsupporting browsers.
  if (!window.addEventListener) return;

  this.opts = assign({
    sessionTimeout: DEFAULT_SESSION_TIMEOUT,
    timeZone: null,
    hiddenMetricIndex: null,
    visibleMetricIndex: null,
    fieldsObj: {},
    hitFilter: null
  }, opts);

  this.tracker = tracker;
  this.store = storage.bindAccessors(
      tracker.get('trackingId'), 'plugins/page-visibility-tracker');

  // Tracks the initial pageview to ensure Page Visibility events aren't
  // sent prior to the initial pageview being sent.
  this.isInitialPageviewSent = false;
  this.isInitialVisibilityChangeSent = false;

  // Binds methods to `this`.
  this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  this.handleWindowUnload = this.handleWindowUnload.bind(this);
  this.handleStorageChange = this.handleStorageChange.bind(this);

  session.initSessionControl(tracker);
  this.overrideTrackerSendMethod();
}


/**
 * Runs after the initial pageview has been sent. This is to ensure a
 * visibility change event doesn't preceed the initial pageview and produce
 * sessions with a "(not set)" value for the landing page.
 */
PageVisibilityTracker.prototype.initialPageviewDidSend = function() {
  if (!this.isInitialVisibilityChangeSent) {
    this.isInitialPageviewSent = true;

    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('storage', this.handleStorageChange);
    window.addEventListener('unload', this.handleWindowUnload);
    this.handleVisibilityChange();
  }
};


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
PageVisibilityTracker.prototype.handleVisibilityChange = function() {
  // Stores the visibility state on the instance so it can be referenced
  // in the unload handler.
  // TODO(philipwalton): consider storing this on the tracker as well.
  var visibilityState = this.visibilityState = this.getVisibilityState();

  // Ignore visibilityStates that aren't hidden or visible.
  if (!(visibilityState == VISIBLE || visibilityState == HIDDEN)) return;

  // Hidden events should never be sent if a session has expired
  // (if they are, they'll likely start a new session with just this event).
  if (visibilityState == HIDDEN && this.isSessionExpired()) return;

  this.sendPageVisibilityEvent('change', visibilityState);
  this.store.set({
    time: now(),
    state: visibilityState,
    pageId: PAGE_ID,
  });
};


/**
 * Sends a Page Visibility event with the passed event action and visibility
 * state. If a previous state change exists within the same session, the time
 * delta is tracked as the event label and optionally as a custom metric.
 * @param {string} action The event action.
 * @param {string} visibilityState The pages current visibility state, which
 *     gets set as the event label.
 */
PageVisibilityTracker.prototype.sendPageVisibilityEvent =
    function(action, visibilityState) {
  var lastVisibilityChange = this.store.get();

  var timeSinceLastVisibilityChange =
      this.getTimeSinceLastVisibilityChange(lastVisibilityChange.time);

  var defaultFields = {
    transport: 'beacon',
    eventCategory: 'Page Visibility',
    eventAction: action,
    eventLabel: visibilityState,
    nonInteraction: true,
  };

  // If at least a one second delta exists, report it.
  if (timeSinceLastVisibilityChange) {
    defaultFields.eventValue = timeSinceLastVisibilityChange;

    // If a custom metric was specified for the current visibility state,
    // give it the same value as the event value.
    var metric = this.opts[lastVisibilityChange.state + 'MetricIndex'];
    if (metric) {
      defaultFields['metric' + metric] = timeSinceLastVisibilityChange;
    }
  }

  this.tracker.send('event',
      createFieldsObj(defaultFields, this.opts.fieldsObj,
          this.tracker, this.opts.hitFilter));

  // Tracks whether a visibility change event has already been sent to avoid
  // double sending for the initial pageload.
  this.isInitialVisibilityChangeSent = true;
};


/**
 * Calculates the time since the last visibility change event in the current
 * session. If the session has expired the reported time is zero.
 * @param {number} lastVisibilityChangeTime The timestamp of the last change
 *     event.
 * @return {number} The time (in ms) since the last change.
 */
PageVisibilityTracker.prototype.getTimeSinceLastVisibilityChange =
    function(lastVisibilityChangeTime) {
  var isSessionActive = !this.isSessionExpired();
  var timeSinceChange = lastVisibilityChangeTime &&
      Math.round((now() - lastVisibilityChangeTime) / 1000);

  return isSessionActive && timeSinceChange > 0 ? timeSinceChange : 0;
};


/**
 * Handles responding to the `storage` event.
 * The code on this page needs to be informed when other tabs or windows are
 * updating the stored page visibility state data. This method checks to see
 * if a hidden state is stored when there are still visible tabs open, which
 * can happen if multiple windows are open at the same time.
 */
PageVisibilityTracker.prototype.handleStorageChange = function() {
  if (this.getVisibilityState() == VISIBLE) {
    var lastVisibilityChange = this.store.get();

    if (lastVisibilityChange.state == HIDDEN) {
      // Writing to localStorage inside a storage event handler is dangerous as
      // it can easily lead to an infinite loop. In this case the write only
      // happens on pages whose visibility state is `visible` and for which
      // another page updated the stored visibility state to `hidden`. When
      // that happens all visible tabs will then invoke this update, but it
      // won't be invoked a second time per page because after the first time
      // the stored visibility state will be `visible`. The end result will
      // be a single page ID stored in the visible state.
      this.store.set({state: VISIBLE, pageId: PAGE_ID});
      this.scheduleNextHeartbeat();
    }
  }
};


/**
 * Handles responding to the `unload` event.
 * Since some browsers don't emit a `visibilitychange` event in all cases where
 * a page might be unloaded, it's necessary to hook into the `unload` event to
 * ensure the correct state is always stored.
 */
PageVisibilityTracker.prototype.handleWindowUnload = function() {
  if (this.visibilityState != HIDDEN) {
    this.handleVisibilityChange();
  }
};


/**
 * Returns the visibility state of the document. The primary purpose of this
 * method is for testing since `document.visibilityState` can't be altered.
 * @return {string} The visibility state.
 */
PageVisibilityTracker.prototype.getVisibilityState = function() {
  return document.visibilityState;
};


/**
 * Uses the `session` module to determine if the session has expired.
 * @return {boolean} True if the session has expired.
 */
PageVisibilityTracker.prototype.isSessionExpired = function() {
  return session.isExpired(
      this.tracker, this.opts.sessionTimeout, this.opts.timeZone);
};


/**
 * Overrides the `tracker.send` method to send a pageview hit before the
 * current hit being sent if the session has expired and the current hit is
 * not a pageview itself.
 */
PageVisibilityTracker.prototype.overrideTrackerSendMethod = function() {
  this.oldTrackerSendMethod = this.tracker.send;

  this.tracker.send = function() {
    var args = Array.prototype.slice.call(arguments);
    var firstArg = args[0];
    var hitType = isObject(firstArg) ? firstArg.hitType : firstArg;
    var isPageview = hitType == 'pageview';
    var isSessionExpired = this.isSessionExpired();
    var isInitialPageviewSent = this.isInitialPageviewSent;

    // Any time a hit is sent and the previous session has expired,
    // clear the stored visibility change data.
    if (isSessionExpired) this.store.clear();

    // Ensures all new sessions start with a pageview so proper
    // session-level page dimensions (e.g. ga:landingPagePath) are set.
    if (!isPageview && isSessionExpired && isInitialPageviewSent) {
      var defaultFields = {transport: 'beacon', sessionControl: 'start'};
      this.oldTrackerSendMethod.call(this.tracker, 'pageview',
          createFieldsObj(defaultFields, this.opts.fieldsObj,
              this.tracker, this.opts.hitFilter));
    }

    this.oldTrackerSendMethod.apply(this.tracker, args);

    if (isPageview && !isInitialPageviewSent) {
      this.initialPageviewDidSend();
    }
  }.bind(this);
};


/**
 * Removes all event listeners and instance properties.
 */
 PageVisibilityTracker.prototype.remove = function() {
  clearTimeout(this.heartbeatTimeout);
  this.tracker.send = this.oldTrackerSendMethod;
  session.restoreSessionControl(this.tracker);
  document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  window.removeEventListener('storage', this.handleStorageChange);
  window.removeEventListener('unload', this.handleWindowUnload);
};


provide('pageVisibilityTracker', PageVisibilityTracker);
