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
        return function() {
          return server.getHitLogs(testId).length === count;
        };
      },
      hitCountIsAtLeast: function(count) {
        return function() {
          return server.getHitLogs(testId).length >= count;
        };
      },
      assertNoHitsReceived: function() {
        assert.strictEqual(accessors.getHits().length, 0);

        browser.execute(ga.sendEmptyHit, browser.options.baseUrl, testId);
        browser.waitUntil(accessors.hitCountEquals(1));
        assert.strictEqual(accessors.getHits()[0].empty, '1');
        accessors.removeHits();
      }
    };
    return accessors;
  },

};
