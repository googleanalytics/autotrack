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


var Store = require('./storage');
var now = require('./utilities').now;


var MINUTES = 60 * 1000;


var instances = {};


/**
 * Creates a session management object that helps track session boundaries
 * across multple open tabs/windows.
 * @param {Object} tracker An analytics.js tracker object.
 * @param {number} timeout The session timeout (in minutes). This value should
 *     match what's set in the "Session settings" section of the Google
 *     Analytics admin.
 * @param {string=} timeZone The optional IANA time zone of the view. This
 *     value should match what's set in the "View settings" section of the
 *     Google Analytics admin. (Note: this assumes all views for the property
 *     use the same time zone. If that's not true, it's better not to use
 *     this feature).
 * @return {Session} The Session instance.
 */
function Session(tracker, timeout, timeZone) {
  // Don't create multiple instances for the same property.
  var trackingId = tracker.get('trackingId');
  if (instances[trackingId]) {
    return instances[trackingId];
  } else {
    instances[trackingId] = this;
  }

  this.tracker = tracker;
  this.timeout = timeout || Session.DEFAULT_TIMEOUT;
  this.timeZone = timeZone;

  this.isInitialScreenOrPageviewSent_ = false;
  this.isTrackerActiveInSession_ = false;
  this.sessionCount_ = 0;

  // Binds methods.
  this.sendHitTask = this.sendHitTask.bind(this);
  this.handleStorage = this.handleStorage.bind(this);

  // Overrides the trackers sendHitTask.
  this.oldSendHitTask = this.tracker.get('sendHitTask');
  this.tracker.set('sendHitTask', this.sendHitTask);

  // Creates the session store and adds change listeners.
  this.store = new Store(trackingId, 'session', {hitTime: 0, sessionCount: 0});
  this.store.storageDidChangeInAnotherWindow = this.handleStorage;
}


/**
 * Accepts a tracker object and returns whether or not the session for that
 * tracker has expired. A session can expire for two reasons:
 *   - More than 30 minutes has elapsed since the previous interaction hit
 *     was sent (The 30 minutes number is the Google Analytics default, but
 *     it can be modified in GA admin "Session settings").
 *   - A new day has started since the previous interaction hit, in the
 *     specified time zone (should correspond to the time zone of the
 *     property's views).
 *
 * Note: since real session boundaries are determined at processing time,
 * this is just a best guess rather than a source of truth.
 *
 * @param {Object=} sessionData An optional sessionData object which avoids
 *     an additional localStorage read if the data is known to be fresh.
 * @return {boolean} True of the session has expired.
 */
Session.prototype.isExpired = function(sessionData) {
  if (!sessionData) {
    sessionData = this.store.get();
  }

  var currentData = new Date();
  var oldHitTime = sessionData.hitTime;
  var oldHitDate = oldHitTime && new Date(oldHitTime);

  if (oldHitTime) {
    if (currentData - oldHitDate > (this.timeout * MINUTES)) {
      // If more time has elapsed than the session expiry time,
      // the session has expired.
      return true;
    } else if (this.timeZone &&
        getDateInTimezone(currentData, this.timeZone) !=
        getDateInTimezone(oldHitDate, this.timeZone)) {
      // A new day has started since the previous hit, which means the
      // session has expired.
      return true;
    }
  }

  // For all other cases return false.
  return false;
};


/**
 * Returns true if the tracker has a record of an interaction hit occuring
 * as well as a record of it being from a previous session. If any of that
 * information is missing, err on the side of caution.
 * Note: this is different from the `isExpired` method in that it only refers
 * to the current tracker. It's possible another tab is open and sending hits
 * (meaning the session is not expired), but this tracker has not sent a hit
 * this session.
 * @return {boolean} True if enough evidence exists to be fairly certain.
 */
Session.prototype.isLastTrackerInteractionFromPreviousSession = function() {
  var globalSessionCount = this.store.get().sessionCount;
  var trackerSessionCount = this.sessionCount_;
  var hasBeenActiveEver = this.hasSentInteractionHit;

  return hasBeenActiveEver && globalSessionCount > trackerSessionCount;
};


/**
 * Keeps track of when the previous interaction hits were sent as well as
 * when the initial pageview or screenview is sent. The last interaction hit
 * time is used to determine if the session has expired.
 * @param {Object} model The analytics.js model object.
 */
Session.prototype.sendHitTask = function(model) {
  var hitType = model.get('hitType');
  var isInteractionHit = !(
      model.get('nonInteraction') ||
      hitType == 'timing' ||
      hitType == 'data');

  // Try sending the hit and, if it throws, exit early. Note, once the
  //  original sendHitTask is run, you should not access the `model` object.
  try {
    this.oldSendHitTask.call(null, model);
  } catch(err) {
    return;
  }

  var sessionData = this.store.get();
  if (isInteractionHit) {
    var isSessionExpired = this.isExpired(sessionData);

    // Update the stored session data.
    sessionData.hitTime = now();
    if (isSessionExpired) sessionData.sessionCount++;
    this.store.set(sessionData);

    // TODO(philipwalton): Update the session count on the tracker as well.
    // to determine if the correct tracker is active in the current session.
    this.sessionCount_ = sessionData.sessionCount;
    this.hasSentInteractionHit = true;

    // Interaction hits are always active in the current session.
    this.isTrackerActiveInSession_ = true;

    // Trigger callbacks if the session has expired. This should be done
    // after the new data in stored in case it needs to be read.
    if (isSessionExpired) this.newSessionDidStart();
  }

  if ((hitType == 'pageview' || hitType == 'screenview') &&
      !this.isInitialScreenOrPageviewSent_) {
    this.isInitialScreenOrPageviewSent_ = true;
    this.initialScreenOrPageviewDidSend();
  }
};


/**
 * Handles changes to the localStorage key from other tabs.
 * If the change incremented the session count, it invokes the
 * `newSessionDidStartInAnotherWindow()` method.
 * @param {Object} newData The data after the write.
 * @param {Object} oldData The data before the write.
 */
Session.prototype.handleStorage = function(newData, oldData) {
  if (newData.sessionCount > oldData.sessionCount) {
    this.newSessionDidStartInAnotherWindow();
  }
};


/**
 * Restores the tracker's original `sendHitTask` to the state before
 * session control was initialized and removes this instance from the global
 * store.
 * @param {Object} tracker The analytics.js tracker object.
 */
Session.prototype.destroy = function() {
  if (this.oldSendHitTask) {
    this.tracker.set('sendHitTask', this.oldSendHitTask);
    this.oldSendHitTask = null;
  }
  this.store.destroy();
  delete instances[this.tracker.get('trackingId')];
};


/**
 * Placeholder to be set on the instance itself.
 */
Session.prototype.initialScreenOrPageviewDidSend = function() {
  // TODO(philipwalton): consider allowing multiple callbacks here.
  // As it stands, if another plugin creates an instance for the same
  // tracker, these methods will be overridden.
};


/**
 * Placeholder to be set on the instance itself.
 */
Session.prototype.newSessionDidStart = function() {
  // TODO(philipwalton): consider allowing multiple callbacks here.
  // As it stands, if another plugin creates an instance for the same
  // tracker, these methods will be overridden.
};


/**
 * Placeholder to be set on the instance itself.
 */
Session.prototype.newSessionDidStartInAnotherWindow = function() {
  // TODO(philipwalton): consider allowing multiple callbacks here.
  // As it stands, if another plugin creates an instance for the same
  // tracker, these methods will be overridden.
};


Session.DEFAULT_TIMEOUT = 30; // Minutes.


module.exports = Session;


/**
 * Accepts a date a returns a date string in the passed time zone.
 * Note: the format of the returned date string is not relevant because it is
 * never parsed, it's only compared to see if two dates are the same.
 * @param {Date} date The date object to convert.
 * @param {string} timeZone The IANA time zone, e.g. 'America/Los_Angeles'.
 * @return {string} The formatted date string in the passed time zone.
 */
function getDateInTimezone(date, timeZone) {
  // Not all browsers support all time zones, so catch possible errors and
  // return false if the formatting fails.
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone
    }).format(date);
  } catch(err) {
    return false;
  }
}