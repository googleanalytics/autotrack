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


import {IdleValue} from 'idlize/IdleValue.mjs';
import MethodChain from './method-chain';
import Store from './store';
import {now, uuid} from './utilities';


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
    // Don't create multiple instances for the same tracker.
    const trackingId = tracker.get('trackingId');

    if (!(trackingId in instances)) {
      instances[trackingId] = {
        references: 0,
        value: new Session(tracker, timeout, timeZone),
      };
    }

    ++instances[trackingId].references;
    return instances[trackingId].value;
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

    // Initialize the store idly since it can be expensive.
    this.idleStore_ = new IdleValue(() => {
      /** @type {SessionStoreData} */
      const defaultProps = {
        hitTime: 0,
        isExpired: false,
      };
      const store = Store.getOrCreate(tracker.get('trackingId'), 'session', {
        defaults: defaultProps,
        timestampKey: 'hitTime',
      });
      // Ensure the session has an ID.
      if (!store.data.id) {
        store.update(/** @type {SessionStoreData} */ ({id: uuid()}));
      }
      return store;
    });

    // Initialize the DateTimeFormat object idly since it can be expensive.
    this.idleDateTimeFormatter_ = new IdleValue(() => {
      if (this.timeZone) {
        try {
          return new Intl.DateTimeFormat('en-US', {timeZone: this.timeZone});
        } catch (err) {
          // Do nothing.
        }
      }
      // Return null (not undefined) so the init function isn't re-run.
      return null;
    });

    // Overrides into the trackers sendHitTask method.
    MethodChain.add(tracker, 'sendHitTask', this.sendHitTaskOverride);
  }

  /** @return {!Store} */
  get store_() {
    return this.idleStore_.getValue();
  }

  /** @return {!Intl.DateTimeFormat} */
  get dateTimeFormatter_() {
    return this.idleDateTimeFormatter_.getValue();
  }

  /**
   * Returns the ID of the current session.
   * @return {string}
   */
  get id() {
    return this.store_.data.id;
  }

  /**
   * Accepts a session ID and returns true if the specified session has
   * evidentially expired. A session can expire for two reasons:
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
   * @param {string} id The ID of a session to check for expiry.
   * @return {boolean} True if the session has not exp
   */
  isExpired(id = this.id) {
    // If a session ID is passed and it doesn't match the current ID,
    // assume it's from an expired session. If no ID is passed, assume the ID
    // of the current session.
    if (id != this.id) return true;

    /** @type {SessionStoreData} */
    const sessionData = this.store_.data;

    // `isExpired` will be `true` if the sessionControl field was set to
    // 'end' on the previous hit.
    if (sessionData.isExpired) return true;

    const oldHitTime = sessionData.hitTime;

    // Only consider a session expired if previous hit time data exists, and
    // the previous hit time is greater than that session timeout period or
    // the hits occurred on different days in the session timezone.
    if (oldHitTime) {
      const currentDate = new Date();
      const oldHitDate = new Date(oldHitTime);
      if (currentDate - oldHitDate > (this.timeout * MINUTES) ||
          this.datesAreDifferentInTimezone(currentDate, oldHitDate)) {
        return true;
      }
    }

    // For all other cases return false.
    return false;
  }

  /**
   * Returns true if (and only if) the timezone date formatting is supported
   * in the current browser and if the two dates are definitively not the
   * same date in the session timezone. Anything short of this returns false.
   * @param {!Date} d1
   * @param {!Date} d2
   * @return {boolean}
   */
  datesAreDifferentInTimezone(d1, d2) {
    if (this.dateTimeFormatter_) {
      return this.dateTimeFormatter_.format(d1) !=
          this.dateTimeFormatter_.format(d2);
    } else {
      return false;
    }
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

      const sessionControl = model.get('sessionControl');
      const sessionWillStart = sessionControl == 'start' || this.isExpired();
      const sessionWillEnd = sessionControl == 'end';

      /** @type {SessionStoreData} */
      const sessionData = this.store_.data;
      sessionData.hitTime = now();
      if (sessionWillStart) {
        sessionData.isExpired = false;
        sessionData.id = uuid();
      }
      if (sessionWillEnd) {
        sessionData.isExpired = true;
      }
      this.store_.update(sessionData);
    };
  }

  /**
   * Restores the tracker's original `sendHitTask` to the state before
   * session control was initialized and removes this instance from the global
   * store.
   */
  destroy() {
    const trackingId = this.tracker.get('trackingId');

    --instances[trackingId].references;

    if (instances[trackingId].references === 0) {
      MethodChain.remove(this.tracker, 'sendHitTask', this.sendHitTaskOverride);
      this.store_.destroy();
      delete instances[trackingId];
    }
  }
}


Session.DEFAULT_TIMEOUT = 30; // minutes
