/**
 * Copyright 2017 Google Inc. All Rights Reserved.
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


/**
 * Runs an analytics.js command.
 * @param {...*} args
 */
export function run(...args) {
  const ga = window[window.GoogleAnalyticsObject || 'ga'];
  if (typeof ga == 'function') {
    ga(...args);
  }
}


/**
 * Returns an array of provided analytics.js plugins.
 * @return {!Array}
 */
export function getProvidedPlugins() {
  return Object.keys(window.gaplugins || {});
}


/**
 * Overrides the trackers `sendHitTask` to sends hits to a log server.
 * Hits are sent with a test name to allow for grouping on the back end.
 * @param {string} testId A unque test name.
 */
export function logHitData(testId) {
  const ga = window[window.GoogleAnalyticsObject || 'ga'];
  if (typeof ga == 'function') {
    ga((tracker) => {
      const oldSendHitTask = tracker.get('sendHitTask');
      tracker.set('sendHitTask', (model) => {
        const hitIndex = +(localStorage.getItem('hitcounter') || -1) + 1;
        const hitTime = +new Date() - (model.get('queueTime') || 0);
        const hitPayload =
            `${model.get('hitPayload')}&time=${hitTime}&index=${hitIndex}`;

        oldSendHitTask(model);

        if (typeof navigator.sendBeacon == 'function') {
          navigator.sendBeacon(`/collect/${testId}`, hitPayload);
        } else {
          const beacon = new Image();
          beacon.src = `/collect/${testId}?${hitPayload}`;
        }
        localStorage.setItem('hitcounter', hitIndex);
      });
    });
  }
}

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
export function sendEmptyHit(baseUrl, testId) {
  const beacon = new Image();
  const z = Math.round(Math.random() * 0xffffffff);
  beacon.src = `${baseUrl}/collect/${testId}?empty=1&index=1?nocache=${z}`;
}
