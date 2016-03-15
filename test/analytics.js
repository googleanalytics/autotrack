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


/* global ga */


var get = require('lodash/object/get');


module.exports =  {

  createTracker: function() {
    var ga = window[window.GoogleAnalyticsObject || 'ga'];
    ga('create', 'UA-XXXXX-Y', 'auto');
  },

  getProvidedPlugins: function() {
    return gaplugins;
  },

  requirePlugin: function(plugin, opts) {
    var ga = window[window.GoogleAnalyticsObject || 'ga'];
    ga('require', plugin, opts);
  },

  sendHit: function(hitType, fieldsObject) {
    var ga = window[window.GoogleAnalyticsObject || 'ga'];
    ga('send', hitType, fieldsObject);
  },

  getHitData: function() {
    return hitData;
  },

  trackHitData: function() {
    // Note(philipwalton):
    // Selenium on Windows 10 Edge doesn't handle arrays well, so we fake it.
    window.hitData = {count: 0};
    var ga = window[window.GoogleAnalyticsObject || 'ga'];
    ga('set', 'sendHitTask', function(model) {

      hitData[hitData.count] = {
        hitType: model.get('hitType'),
        eventCategory: model.get('eventCategory'),
        eventAction: model.get('eventAction'),
        eventLabel: model.get('eventLabel'),
        devId: model.get('&did')
      };
      hitData.count++;
    });
  },

  hitDataMatches: function(expected) {
    return function() {
      return browser.execute(this.getHitData).then(function(hitData) {
        return expected.every(function(item) {
          return get(hitData.value, item[0]) === item[1];
        });
      });
    }.bind(this);
  },

  clearHitData: function() {
    window.hitData = {count: 0};
  },

  removeTracker: function() {
    var ga = window[window.GoogleAnalyticsObject || 'ga'];
    ga('remove');
  }
};
