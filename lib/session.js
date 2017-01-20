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


import MethodChain from './method-chain';
import Store from './store';
import {now} from './utilities';


const SECONDS = 1000;
const MINUTES = 60 * SECONDS;


const instances = {};


/**
 * A session management class that helps track session boundaries
 * across multiple open tabs/windows.
 */
export default class Session {
  /**
   * Gets an existing instance for the passed arguments or creates a new
   * instance if one doesn't exist.
   * @param {!Tracker} tracker An analytics.js tracker object.
   * @param {number} timeout The session timeout (in minutes). This value
   *     should match what's set in the "Session settings" section of the
   *     Google Analytics admin.
   * @param {string=} timeZone The optional IANA time zone of the view. This
   *     value should match what's set in the "View settings" section of the
   *     Google Analytics admin. (Note: this assumes all views for the property
   *     use the same time zone. If that's not true, it's better not to use
   *     this feature).
   * @return {Session} The Session instance.
   */
  static getOrCreate(tracker, timeout, timeZone) {
    // Don't create multiple instances for the same property.
    const trackingId = tracker.get('trackingId');
    if (instances[trackingId]) {
      return instances[trackingId];
    } else {
      return instances[trackingId] = new Session(tracker, timeout, timeZone);
    }
  }

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
   */
  constructor(tracker, timeout, timeZone) {
    this.tracker = tracker;
    this.timeout = timeout || Session.DEFAULT_TIMEOUT;
    this.timeZone = timeZone;

    // Binds methods.
    this.sendHitTaskOverride = this.sendHitTaskOverride.bind(this);

    // Overrides into the trackers sendHitTask method.
    MethodChain.add(tracker, 'sendHitTask', this.sendHitTaskOverride);

    // Some browser doesn't support various features of the
    // `Intl.DateTimeFormat` API, so we have to try/catch it. Consequently,
    // this allows us to assume the presence of `this.dateTimeFormatter` means
    // it works in the current browser.
    try {
      this.dateTimeFormatter =
          new Intl.DateTimeFormat('en-US', {timeZone: this.timeZone});
    } catch(err) {
      // Do nothing.
    }

    // Creates the session store and adds change listeners.
    /** @type {SessionStoreData} */
    const defaultProps = {
      hitTime: 0,
      isExpired: false,
    };
    this.store = Store.getOrCreate(
        tracker.get('trackingId'), 'session', defaultProps);
  }

  /**
   * Accepts a tracker object and returns whether or not the session for that
   * tracker has expired. A session can expire for two reasons:
   *   - More than 30 minutes has elapsed since the previous hit
   *     was sent (The 30 minutes number is the Google Analytics default, but
   *     it can be modified in GA admin "Session settings").
   *   - A new day has started since the previous hit, in the
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
  isExpired(sessionData = this.store.get()) {
    // True if the sessionControl field was set to 'end' on the previous hit.
    if (sessionData.isExpired) return true;

    const currentDate = new Date();
    const oldHitTime = sessionData.hitTime;
    const oldHitDate = oldHitTime && new Date(oldHitTime);

    if (oldHitTime) {
      if (currentDate - oldHitDate > (this.timeout * MINUTES)) {
        // If more time has elapsed than the session expiry time,
        // the session has expired.
        return true;
      } else if (this.datesAreDifferentInTimezone(currentDate, oldHitDate)) {
        // A new day has started since the previous hit, which means the
        // session has expired.
        return true;
      }
    }

    // For all other cases return false.
    return false;
  }

  /**
   * Returns true if (and only if) the timezone date formatting is supported
   * in the current browser and if the two dates are diffinitiabely not the
   * same date in the session timezone. Anything short of this returns false.
   * @param {!Date} d1
   * @param {!Date} d2
   * @return {boolean}
   */
  datesAreDifferentInTimezone(d1, d2) {
    return !(this.dateTimeFormatter && this.dateTimeFormatter.format(d1)
        === this.dateTimeFormatter.format(d2));

  }

  /**
   * Keeps track of when the previous hit was sent to determine if a session
   * has expired. Also inspects the `sessionControl` field to handles
   * expiration accordingly.
   * @param {function(!Model)} originalMethod A reference to the overridden
   *     method.
   * @return {function(!Model)}
   */
  sendHitTaskOverride(originalMethod) {
    return (model) => {
      originalMethod(model);

      const sessionData = this.store.get();
      const isSessionExpired = this.isExpired(sessionData);
      const sessionControl = model.get('sessionControl');

      const sessionWillStart = sessionControl == 'start' || isSessionExpired;
      const sessionWillEnd = sessionControl == 'end';

      // Update the stored session data.
      sessionData.hitTime = now();
      if (sessionWillStart) {
        sessionData.isExpired = false;
      }
      if (sessionWillEnd) {
        sessionData.isExpired = true;
      }
      this.store.set(sessionData);
    }
  }

  /**
   * Restores the tracker's original `sendHitTask` to the state before
   * session control was initialized and removes this instance from the global
   * store.
   */
  destroy() {
    MethodChain.remove(this.tracker, 'sendHitTask', this.sendHitTaskOverride);
    this.store.destroy();
    delete instances[this.tracker.get('trackingId')];
  }
}


Session.DEFAULT_TIMEOUT = 30; // minutes
