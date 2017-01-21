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


module.exports =  {

  run: function() {
    var ga = window[window.GoogleAnalyticsObject || 'ga'];
    if (typeof ga == 'function') {
      ga.apply(window, arguments);
    }
  },

  getProvidedPlugins: function() {
    return Object.keys(window.gaplugins || {});
  },

  logHitData: function(testId) {
    var ga = window[window.GoogleAnalyticsObject || 'ga'];
    if (typeof ga == 'function') {
      ga(function(tracker) {
        var oldSendHitTask = tracker.get('sendHitTask');
        tracker.set('sendHitTask', function(model) {
          var hitIndex = +(localStorage.getItem('hitcounter') || -1) + 1;
          var hitTime = +new Date() - (model.get('queueTime') || 0);
          var hitPayload = model.get('hitPayload') +
              '&time=' + hitTime + '&index=' + hitIndex;

          oldSendHitTask(model);

          if ('sendBeacon' in navigator) {
            navigator.sendBeacon('/collect/' + testId, hitPayload);
          } else {
            var beacon = new Image();
            beacon.src = '/collect/' + testId + '?' + hitPayload;
          }
          localStorage.setItem('hitcounter', hitIndex);
        });
      });
    }
  },


  /**
   * Sends a hit with no data to the collect endpoint for the passed test ID.
   * This can be helpful in cases where you need to assert that no hits were
   * sent, but you want to avoid false positives from hits failing for
   * some other reason. Sending an empty hit allows you to assert that hits
   * are being received and that no hit was received prior to receiving the
   * test hit.
   * @param {string} baseUrl The base URL of the log server.
   * @param {string} testId The test endpoint to target.
   */
  sendEmptyHit: function(baseUrl, testId) {
    var beacon = new Image();
    beacon.src = baseUrl + '/collect/' + testId +
        '?empty=1&index=1?nocache=' + Math.random();
  },
};
