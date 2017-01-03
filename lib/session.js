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


import Store from './storage';
import {now} from './utilities';


const MINUTES = 60 * 1000;


const instances = {};


/**
 * A session management class that helps track session boundaries
 * across multple open tabs/windows.
 */
export default class Session {
  /**
   * @param {!Tracker} tracker An analytics.js tracker object.
   * @param {number} timeout The session timeout (in minutes). This value
   *     should match what's set in the "Session settings" section of the
   *     Google Analytics admin.
   * @param {string=} timeZone The optional IANA time zone of the view. This
   *     value should match what's set in the "View settings" section of the
   *     Google Analytics admin. (Note: this assumes all views for the property
   *     use the same time zone. If that's not true, it's better not to use
   *     this feature).
   * @return {!Session} The Session instance.
   */
  constructor(tracker, timeout, timeZone) {
    // Don't create multiple instances for the same property.
    const trackingId = tracker.get('trackingId');
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
    this.hasSentInteractionHit = false;

    // Binds methods.
    this.sendHitTask = this.sendHitTask.bind(this);
    this.handleStorage = this.handleStorage.bind(this);

    // Overrides the trackers sendHitTask.
    this.oldSendHitTask = this.tracker.get('sendHitTask');
    this.tracker.set('sendHitTask', this.sendHitTask);

    // Creates the session store and adds change listeners.
    /** @type {SessionStoreData} */
    const defaultProps = {
      hitTime: 0,
      sessionCount: 0,
      isExpired: false,
    };
    this.store = new Store(trackingId, 'session', defaultProps);
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
   * @param {SessionStoreData=} sessionData An optional sessionData object
   *     which avoids an additional localStorage read if the data is known to
   *     be fresh.
   * @return {boolean} True if the session has expired.
   */
  isExpired(sessionData) {
    if (!sessionData) {
      sessionData = this.store.get();
    }

    // True if the sessionControl field was set to 'end' on the previous hit.
    if (sessionData.isExpired) return true;

    const currentData = new Date();
    const oldHitTime = sessionData.hitTime;
    const oldHitDate = oldHitTime && new Date(oldHitTime);

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
  }

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
  isLastTrackerInteractionFromPreviousSession() {
    const globalSessionCount = this.store.get().sessionCount;
    const trackerSessionCount = this.sessionCount_;
    const hasBeenActiveEver = this.hasSentInteractionHit;

    return hasBeenActiveEver && globalSessionCount > trackerSessionCount;
  }

  /**
   * Keeps track of when the previous interaction hits were sent as well as
   * when the initial pageview or screenview is sent. The last interaction hit
   * time is used to determine if the session has expired.
   * @param {!Model} model The analytics.js model object.
   */
  sendHitTask(model) {
    // Try sending the hit and, if it throws, exit early. Note, once the
    // original sendHitTask is run, you should not access the `model` object.
    try {
      this.oldSendHitTask.call(null, model);
    } catch(err) {
      return;
    }

    const sessionData = this.store.get();
    const isSessionExpired = this.isExpired(sessionData);
    const sessionControl = model.get('sessionControl');

    const sessionWillStart = sessionControl == 'start' || isSessionExpired;
    const sessionWillEnd = sessionControl == 'end';

    // Update the stored session data.
    sessionData.hitTime = now();
    if (sessionWillStart) {
      sessionData.sessionCount++;
      sessionData.isExpired = false;
    }
    if (sessionWillEnd) {
      sessionData.isExpired = true;
    }
    this.store.set(sessionData);

    // TODO(philipwalton): Update the session count on the tracker as well.
    // to determine if the correct tracker is active in the current session.
    this.sessionCount_ = sessionData.sessionCount;
    this.hasSentInteractionHit = true;

    // Interaction hits are always active in the current session.
    this.isTrackerActiveInSession_ = true;

    // Trigger callbacks if the session has expired. This should be done
    // after the new data is stored in case it needs to be read.
    if (sessionWillStart) this.newSessionDidStart();
  }

  /**
   * Handles changes to the localStorage key from other tabs.
   * If the change incremented the session count, it invokes the
   * `newSessionDidStartInAnotherWindow()` method.
   * @param {!SessionStoreData} newData The data after the write.
   * @param {!SessionStoreData} oldData The data before the write.
   */
  handleStorage(newData, oldData) {
    if (newData.sessionCount > oldData.sessionCount) {
      this.newSessionDidStartInAnotherWindow();
    }
  }

  /**
   * Restores the tracker's original `sendHitTask` to the state before
   * session control was initialized and removes this instance from the global
   * store.
   */
  destroy() {
    if (this.oldSendHitTask) {
      this.tracker.set('sendHitTask', this.oldSendHitTask);
      this.oldSendHitTask = null;
    }
    this.store.destroy();
    delete instances[this.tracker.get('trackingId')];
  }

  /**
   * Placeholder to be set on the instance itself.
   */
  newSessionDidStart() {
    // TODO(philipwalton): consider allowing multiple callbacks here.
    // As it stands, if another plugin creates an instance for the same
    // tracker, these methods will be overridden.
  }

  /**
   * Placeholder to be set on the instance itself.
   */
  newSessionDidStartInAnotherWindow() {
    // TODO(philipwalton): consider allowing multiple callbacks here.
    // As it stands, if another plugin creates an instance for the same
    // tracker, these methods will be overridden.
  }
}


Session.DEFAULT_TIMEOUT = 30; // Minutes.


/**
 * Accepts a date a returns a date string in the passed time zone.
 * Note: the format of the returned date string is not relevant because it is
 * never parsed, it's only compared to see if two dates are the same.
 * @param {!Date} date The date object to convert.
 * @param {string} timeZone The IANA time zone, e.g. 'America/Los_Angeles'.
 * @return {string|undefined} The formatted date string in the passed time zone.
 */
function getDateInTimezone(date, timeZone) {
  // Not all browsers support all time zones, so catch possible errors and
  // return false if the formatting fails.
  try {
    return new Intl.DateTimeFormat('en-US', {timeZone: timeZone}).format(date);
  } catch(err) {
    // Do nothing.
  }
}
