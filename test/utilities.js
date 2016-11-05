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


var assert = require('assert');
var ga = require('./analytics');
var server = require('./server');


module.exports = {

  /**
   * @param {string} expectedUrl The URL to match.
   * @return {Function} A function that, when invoked, returns a promise
   *     that is fulfilled when the URL in the browsers address bar matches
   *     the passed URL.
   */
  urlMatches: function(expectedUrl) {
    return function() {
      var result = browser.url();
      var actualUrl = result.value;
      return actualUrl.indexOf(expectedUrl) > -1;
    };
  },


  bindLogAccessors: function(testId) {
    var accessors = {
      getHits: server.getHitLogs.bind(server, testId),
      removeHits: server.removeHitLogs.bind(server, testId),
      hitCountEquals: function(count) {
        var callCount = 0;
        return function() {
          var hits = server.getHitLogs(testId);
          var hitCount = hits.length;
          if (hitCount === count) {
            return true;
          } else {
            callCount++;
            if (callCount > 5 && callCount < 10) {
              process.stdout.write(
                  'Still waiting for ' + count + ' hits to be received\n');
            } else if (callCount == 10) {
              process.stdout.write(
                  'Hmmmm, looks like waiting for hits will likely ' +
                  'time out.\nHere are the hits received so far:\n' +
                  JSON.stringify(hits, null, 2) + '\n');
            }
            return false;
          }
        };
      },
      assertNoHitsReceived: function() {
        var browserCaps = browser.session().value;
        if (browserCaps.browserName == 'safari') {
          // Reduces flakiness in Safari.
          var timeToWait = browser.options.baseUrl.indexOf('localhost') > -1 ?
              500 : 2000;
          browser.pause(timeToWait);
          assert.strictEqual(accessors.getHits().length, 0);
        } else {
          assert.strictEqual(accessors.getHits().length, 0);

          // TODO(philipwalton): the following technique fails in Safari for
          // unknown reasons.
          browser.execute(ga.sendEmptyHit, browser.options.baseUrl, testId);
          browser.waitUntil(accessors.hitCountEquals(1));
          assert.strictEqual(accessors.getHits()[0].empty, '1');
          accessors.removeHits();
        }
      }
    };
    return accessors;
  },

};
