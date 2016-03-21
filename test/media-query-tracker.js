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
var constants = require('../lib/constants');


var browserCaps;
var TIMEOUT = 1000;


var autotrackOpts = {
  mediaQueryDefinitions: [
    {
      name: 'Width',
      dimensionIndex: 1,
      items: [
        {name: 'sm', media: 'all'},
        {name: 'md', media: '(min-width: 480px)'},
        {name: 'lg', media: '(min-width: 640px)'}
      ]
    },
    {
      name: 'Height',
      dimensionIndex: 2,
      items: [
        {name: 'sm', media: 'all'},
        {name: 'md', media: '(min-height: 480px)'},
        {name: 'lg', media: '(min-height: 640px)'}
      ]
    }
  ]
}


describe('mediaQueryTracker', function() {

  before(function *() {
    browserCaps = (yield browser.session()).value;

    // Loads the autotrack file since no custom HTML is needed.
    yield browser.url('/test/autotrack.html');
  });


  beforeEach(function() {
    return browser
        .setViewportSize({width:800, height:600}, false)
        .execute(ga.run, 'create', 'UA-XXXXX-Y', 'auto')
        .execute(ga.trackHitData);
  });


  afterEach(function () {
    return browser
        .execute(ga.clearHitData)
        .execute(ga.run, 'mediaQueryTracker:remove')
        .execute(ga.run, 'remove');
  });


  it('should set initial data via custom dimensions', function() {

    if (notSupportedInBrowser()) return;

    return browser
        .execute(ga.run, 'require', 'mediaQueryTracker', autotrackOpts)
        .waitUntil(ga.trackerDataMatches([
          ['dimension1', 'lg'],
          ['dimension2', 'md']
        ]));
  });


  it('should send events when the matched media changes', function() {

    if (notSupportedInBrowser()) return;

    return browser
        .execute(ga.run, 'require', 'mediaQueryTracker', autotrackOpts)
        .setViewportSize({width:400, height:400}, false)
        .waitUntil(ga.trackerDataMatches([
          ['dimension1', 'sm'],
          ['dimension2', 'sm']
        ]))
        .waitUntil(ga.hitDataMatches([
          ['[0].eventCategory', 'Width'],
          ['[0].eventAction', 'change'],
          ['[0].eventLabel', 'lg => sm'],
          ['[1].eventCategory', 'Height'],
          ['[1].eventAction', 'change'],
          ['[1].eventLabel', 'md => sm']
        ]));
  });


  it('should wait for the timeout to set or send changes', function *() {

    if (notSupportedInBrowser()) return;

    yield browser
        .execute(ga.run, 'require', 'mediaQueryTracker', autotrackOpts)
        .setViewportSize({width:400, height:400}, false)

    var timeoutStart = Date.now();
    yield browser.waitUntil(ga.trackerDataMatches([
      ['dimension1', 'sm'],
      ['dimension2', 'sm']
    ]))
    .waitUntil(ga.hitDataMatches([
      ['length', 2]
    ]));
    var timeoutDuration = Date.now() - timeoutStart;

    assert(timeoutDuration >= TIMEOUT);
  });


  it('should support customizing the timeout period', function *() {

    if (notSupportedInBrowser()) return;

    yield browser
        .execute(ga.run, 'require', 'mediaQueryTracker',
            Object.assign({}, autotrackOpts, {mediaQueryChangeTimeout: 0}))
        .setViewportSize({width:400, height:400}, false)

    var shortTimeoutStart = Date.now();
    yield browser.waitUntil(ga.trackerDataMatches([
      ['dimension1', 'sm'],
      ['dimension2', 'sm']
    ]))
    .waitUntil(ga.hitDataMatches([
      ['length', 2]
    ]));
    var shortTimeoutDuration = Date.now() - shortTimeoutStart;

    yield browser
        .execute(ga.clearHitData)
        .execute(ga.run, 'mediaQueryTracker:remove')
        .execute(ga.run, 'remove')
        .execute(ga.run, 'create', 'UA-XXXXX-Y', 'auto')
        .execute(ga.trackHitData)
        .setViewportSize({width:800, height:600}, false)
        .execute(ga.run, 'require', 'mediaQueryTracker', autotrackOpts)
        .setViewportSize({width:400, height:400}, false);

    var longTimeoutStart = Date.now();
    yield browser.waitUntil(ga.trackerDataMatches([
      ['dimension1', 'sm'],
      ['dimension2', 'sm']
    ]))
    .waitUntil(ga.hitDataMatches([
      ['length', 2]
    ]));
    var longTimeoutDuration = Date.now() - longTimeoutStart;

    // The long timeout should, in theory, be 1000ms longer, but we compare
    // to 500 just to be safe and avoid flakiness.
    assert(longTimeoutDuration - shortTimeoutDuration > (TIMEOUT/2));
  });


  it('should support customizing the change template', function() {

    if (notSupportedInBrowser()) return;

    return browser
        .execute(requireMediaQueryTrackerWithChangeTemplate)
        .setViewportSize({width:400, height:400}, false)
        .waitUntil(ga.hitDataMatches([
          ['[0].eventLabel', 'lg:sm'],
          ['[1].eventLabel', 'md:sm']
        ]));
  });


  it('should include the &did param with all hits', function() {

    return browser
        .execute(ga.run, 'require', 'mediaQueryTracker')
        .execute(ga.run, 'send', 'pageview')
        .waitUntil(ga.hitDataMatches([['[0].devId', 'i5iSjo']]));
  });

});


/**
 * Since function objects can't be passed via parameters from server to
 * client, this one-off function must be used to set the value for
 * `mediaQueryChangeTemplate`.
 */
function requireMediaQueryTrackerWithChangeTemplate() {
  ga('require', 'mediaQueryTracker', {
    mediaQueryDefinitions: [
      {
        name: 'Width',
        dimensionIndex: 1,
        items: [
          {name: 'sm', media: 'all'},
          {name: 'md', media: '(min-width: 480px)'},
          {name: 'lg', media: '(min-width: 640px)'}
        ]
      },
      {
        name: 'Height',
        dimensionIndex: 2,
        items: [
          {name: 'sm', media: 'all'},
          {name: 'md', media: '(min-height: 480px)'},
          {name: 'lg', media: '(min-height: 640px)'}
        ]
      }
    ],
    mediaQueryChangeTemplate: function(oldValue, newValue) {
      return oldValue + ':' + newValue;
    }
  });
}


function isEdge() {
  return browserCaps.browserName == 'MicrosoftEdge';
}


function isIE9() {
  return browserCaps.browserName == 'internet explorer' &&
         browserCaps.version == '9';
}


function notSupportedInBrowser() {
  // TODO(philipwalton): Some capabilities aren't implemented, so we can't test
  // against Edge right now. Wait for build 10532 to support setViewportSize
  // https://dev.windows.com/en-us/microsoft-edge/platform/status/webdriver/details/

  // IE9 doesn't support matchMedia, so it's not tested.
  return isEdge() || isIE9();
}
