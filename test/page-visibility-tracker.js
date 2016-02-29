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
var get = require('lodash/object/get');
var constants = require('../lib/constants');


var CTRL = '\uE009';
var META = '\uE03D';
var SESSION_TIMEOUT = 1000;


var browserCaps;
var command;


describe('pageVisibilityTracker', function() {

  before(function *() {
    browserCaps = (yield browser.session()).value;
    command = browserCaps.platform.indexOf('OS X') < 0 ? META : CTRL;
  });


  it('should send events when the visibility state changes', function *() {

    if (notSupportedInBrowser()) return;

    var hitData = (yield browser
        .url('/test/page-visibility-tracker.html')
        .element('body')
        .keys(command + 't' + command)
        .element('body')
        .keys(command + 'w' + command)
        .execute(getHitData)).value;

    assert.equal(hitData.count, 2);
    assert.equal(hitData[0].eventCategory, 'Page Visibility');
    assert.equal(hitData[0].eventAction, 'change');
    assert.equal(hitData[0].eventLabel, 'hidden');
    assert.equal(hitData[1].eventCategory, 'Page Visibility');
    assert.equal(hitData[1].eventAction, 'change');
    assert.equal(hitData[1].eventLabel, 'visible');
  });


  it('should not send any hidden events if the session has timed out',
      function *() {

    if (notSupportedInBrowser()) return;

    var hitData = (yield browser
        .url('/test/page-visibility-tracker-session-timeout.html')
        .pause(SESSION_TIMEOUT)
        .element('body')
        .keys(command + 't' + command)
        .execute(getHitData)).value;

    assert.equal(hitData.count, 0);
  });


  it('should preemptively start all new session hits with a pageview',
      function *() {

    if (notSupportedInBrowser()) return;

    var hitData = (yield browser
        .url('/test/page-visibility-tracker-session-timeout.html')
        .pause(SESSION_TIMEOUT)
        .execute(sendEvent)
        .execute(getHitData)).value;

    // Expects non-pageview hits queued to be sent after the session has timed
    // out to include a pageview immediately before them.
    assert.equal(hitData.count, 2);
    assert.equal(hitData[0].hitType, 'pageview');
    assert.equal(hitData[1].eventCategory, 'Uncategorized');
    assert.equal(hitData[1].eventAction, 'inactive');

    hitData = (yield browser
        .url('/test/page-visibility-tracker-session-timeout.html')
        .pause(SESSION_TIMEOUT)
        .execute(sendPageview)
        .execute(getHitData)).value;

    // Expects non-pageview hits to send as normal.
    assert.equal(hitData.count, 1);
    assert.equal(hitData[0].hitType, 'pageview');
  });


  it('should not send visible events when starting a new session',
      function *() {

    if (notSupportedInBrowser()) return;

    var hitData = (yield browser
        .url('/test/page-visibility-tracker-session-timeout.html')
        .pause(SESSION_TIMEOUT)
        .element('body')
        .keys(command + 't' + command)
        .element('body')
        .keys(command + 'w' + command)
        .execute(getHitData)).value;

    // Expects a pageview in lieu of a visible event because the session
    // has timed out.
    assert.equal(hitData.count, 1);
    assert.equal(hitData[0].hitType, 'pageview');
  });


  it('should reset the session timeout when other hits are sent', function *() {

    if (notSupportedInBrowser()) return;

    var hitData = (yield browser
        .url('/test/page-visibility-tracker-session-timeout.html')
        .pause(SESSION_TIMEOUT / 2)
        .execute(sendEvent)
        .pause(SESSION_TIMEOUT / 2)
        .element('body')
        .keys(command + 't' + command)
        .element('body')
        .keys(command + 'w' + command)
        .execute(getHitData)).value;

    assert.equal(hitData.count, 3);
    assert.equal(hitData[0].eventCategory, 'Uncategorized');
    assert.equal(hitData[0].eventAction, 'inactive');

    // Since the event above reset the session timeout, opening a new
    // tab will still be considered within the session timeout.
    assert.equal(hitData[1].eventCategory, 'Page Visibility');
    assert.equal(hitData[1].eventAction, 'change');
    assert.equal(hitData[1].eventLabel, 'hidden');
    assert.equal(hitData[2].eventCategory, 'Page Visibility');
    assert.equal(hitData[2].eventAction, 'change');
    assert.equal(hitData[2].eventLabel, 'visible');
  });


  it('should include the &did param with all hits', function() {

    return browser
        .url('/test/page-visibility-tracker.html')
        .execute(sendPageview)
        .waitUntil(hitDataMatches([['[0].devId', constants.DEV_ID]]));
  });

});


function sendPageview() {
  ga('send', 'pageview');
}


function sendEvent() {
  ga('send', 'event', 'Uncategorized', 'inactive');
}


function getHitData() {
  return hitData;
}


function hitDataMatches(expected) {
  return function() {
    return browser.execute(getHitData).then(function(hitData) {
      return expected.every(function(item) {
        return get(hitData.value, item[0]) === item[1];
      });
    });
  };
}


function isFirefox() {
  return browserCaps.browserName == 'firefox';
}


function notSupportedInBrowser() {
  // TODO(philipwalton): Opening and switching between tabs is not very well
  // supported in webdriver, so we currently only test in Firefox.
  return !isFirefox();
}
