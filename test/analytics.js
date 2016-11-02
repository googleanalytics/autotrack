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


var get = require('lodash/get');


module.exports =  {

  run: function() {
    var ga = window[window.GoogleAnalyticsObject || 'ga'];
    ga.apply(null, arguments);
  },

  getProvidedPlugins: function() {
    return window.gaplugins;
  },

  getHitData: function() {
    return window.hitData;
  },

  trackHitData: function() {
    window.hitData = [];
    var ga = window[window.GoogleAnalyticsObject || 'ga'];
    ga('set', 'sendHitTask', function(model) {
      window.hitData.push({
        hitType: model.get('hitType'),
        location: model.get('location'),
        page: model.get('page'),
        title: model.get('title'),
        eventCategory: model.get('eventCategory'),
        eventAction: model.get('eventAction'),
        eventLabel: model.get('eventLabel'),
        eventValue: model.get('eventValue'),
        socialNetwork: model.get('socialNetwork'),
        socialAction: model.get('socialAction'),
        socialTarget: model.get('socialTarget'),
        dimension1: model.get('dimension1'),
        dimension2: model.get('dimension2'),
        metric1: model.get('metric1'),
        metric2: model.get('metric2'),
        nonInteraction: model.get('nonInteraction'),
        devId: model.get('&did'),
        '&_av': model.get('&_av'),
        '&_au': model.get('&_au')
      });
    });
  },

  logHitData: function(testId) {
    var ga = window[window.GoogleAnalyticsObject || 'ga'];
    ga('set', 'sendHitTask', function(model) {
      var hitPayload = model.get('hitPayload');
      if ('sendBeacon' in navigator) {
        navigator.sendBeacon('/collect/' + testId, hitPayload);
      } else {
        var beacon = new Image();
        beacon.src = '/collect/' + testId + '?' + hitPayload;
      }
    });
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
    beacon.src = baseUrl + '/collect/' + testId + '?empty=1';
  },

  hitDataMatches: function(expected, compareFunction) {
    return function() {
      var hitData = browser.execute(this.getHitData).value;
      if (compareFunction) {
        hitData = hitData.sort(compareFunction);
      }
      return expected.every(function(item) {
        return get(hitData, item[0]) === item[1];
      });
    }.bind(this);
  },

  getTrackerData: function() {
    var ga = window[window.GoogleAnalyticsObject || 'ga'];
    var tracker = ga.getAll()[0];
    return {
      dimension1: tracker.get('dimension1'),
      dimension2: tracker.get('dimension2')
    };
  },

  trackerDataMatches: function(expected) {
    return function() {
      var trackerData = browser.execute(this.getTrackerData);
      return expected.every(function(item) {
        return get(trackerData.value, item[0]) === item[1];
      });
    }.bind(this);
  },

  clearHitData: function() {
    window.hitData = [];
  }
};
