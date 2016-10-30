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


var storage = require('./storage');


module.exports = {
  /**
   * Accepts a tracker name and returns whether or not the session for that
   * tracker has expired. A session can expire for two reasons:
   *   - More than 30 minutes has ellapsed since the previous hit was sent
   *     (The 30 minutes number is the Google Analytics default, but it can be
   *     modified in GA admin "Session settings").
   *   - A new day has started since the previous hit, in the specified time
   *     zone (should correspond to the time zone of the property's views).
   *
   * Note: since real session boundaries are determined at processing time,
   * this is just a best guess rather than a source of truth.
   *
   * @param {string} trackingId The tracking ID of the property to check the
   *     last hit time of.
   * @param {number} sessionsExpiryTime The time (in minutes) that sessions
   *     are set to experiece in Google Analytics. This value should match the
   *     value set in "Session settings" in the Google Analytics admin.
   * @param {string} timeZone The IANA time zone of the Google Analytics view.
   * @return {boolean} True of the session has expired.
   */
  hasExpired: function(trackingId, sessionExpiryTime, timeZone) {
    var now = new Date();
    var lastHitTime = storage.get(trackingId, 'lastHitTime');
    var lastHitDate = new Date(lastHitTime);

    if (lastHitTime) {
      if (now - lastHitDate > (sessionExpiryTime * 60 * 1000)) {
        // If more time has elapsed than the session expiry time,
        // the session has expired.
        return true;
      } else if (timeZone &&
          getDateInTimezone(now, timeZone) !=
          getDateInTimezone(lastHitDate, timeZone)) {
        // Otherwise check to see if a new day has started, in which case the
        // previous session has expired.
        return true;
      }
    }

    // For all other cases return false.
    return false;
  }
}


/**
 * Accepts a date a returns a date string in the passed time zone.
 * Note: the format of the returned date string is not relevant because it is
 * never parsed, it's only compared to see if two dates are the same.
 * @param {Date} date The date object to convert.
 * @param {string} The IANA time zone, e.g. 'America/Los_Angeles'.
 * @return {string} The formatted date string in the passed time zone.
 */
function getDateInTimezone(date, timeZone) {
  // Not all browsers support all time zones, so catch possible errors and
  // return false if the formatting fails.
  try {
    return new Intl.DateTimeFormat('en-US', {timeZone: timeZone}).format(date);
  } catch(err) {
    return false;
  }
}
