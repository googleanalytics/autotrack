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


var CTRL = '\uE009';
var META = '\uE03D';
var SESSION_TIMEOUT = 1000;


var browserCaps;
var command;


describe('pageVisibilityTracker', function() {

  before(function *() {
    browserCaps = (yield browser.session()).value;
    command = browserCaps.platform.indexOf('OS X') < 0 ? META : CTRL;

    // Loads the autotrack file since no custom HTML is needed.
    yield browser.url('/test/autotrack.html');
  });


  beforeEach(function() {
    return browser
        .execute(ga.run, 'create', 'UA-XXXXX-Y', 'auto')
        .execute(ga.trackHitData);
  });


  afterEach(function () {
    return browser
        .execute(ga.clearHitData)
        .execute(ga.run, 'pageVisibilityTracker:remove')
        .execute(ga.run, 'remove');
  });

  it('should send events when the visibility state changes', function *() {

    if (notSupportedInBrowser()) return;

    var hitData = (yield browser
        .execute(ga.run, 'require', 'pageVisibilityTracker')
        .element('body').keys(command + 't' + command) // Opens a new tab.
        .element('body').keys(command + 'w' + command) // Closes the new tab.
        .execute(ga.getHitData)).value;

    assert.equal(hitData.length, 2);
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
        .execute(ga.run, 'require', 'pageVisibilityTracker', {
          sessionTimeout: 1/60
        })
        .pause(SESSION_TIMEOUT)
        .element('body').keys(command + 't' + command) // Opens a new tab.
        .execute(ga.getHitData)).value;

    assert.equal(hitData.length, 0);

    // Closes the new tab.
    yield browser.element('body').keys(command + 'w' + command);
  });


  it('should preemptively start all new session hits with a pageview',
      function *() {

    if (notSupportedInBrowser()) return;

    var hitData = (yield browser
        .execute(ga.run, 'require', 'pageVisibilityTracker', {
          sessionTimeout: 1/60
        })
        .pause(SESSION_TIMEOUT)
        .execute(ga.run, 'send', 'event', 'Uncategorized', 'inactive')
        .execute(ga.getHitData)).value;

    // Expects non-pageview hits queued to be sent after the session has timed
    // out to include a pageview immediately before them.
    assert.equal(hitData.length, 2);
    assert.equal(hitData[0].hitType, 'pageview');
    assert.equal(hitData[1].eventCategory, 'Uncategorized');
    assert.equal(hitData[1].eventAction, 'inactive');
  });


  it('should not send visible events when starting a new session',
      function *() {

    if (notSupportedInBrowser()) return;

    var hitData = (yield browser
        .execute(ga.run, 'require', 'pageVisibilityTracker', {
          sessionTimeout: 1/60
        })
        .pause(SESSION_TIMEOUT)
        .element('body').keys(command + 't' + command) // Opens a new tab.
        .element('body').keys(command + 'w' + command) // Closes the new tab.
        .execute(ga.getHitData)).value;

    // Expects a pageview in lieu of a visible event because the session
    // has timed out.
    assert.equal(hitData.length, 1);
    assert.equal(hitData[0].hitType, 'pageview');
  });


  it('should allow setting additional fields for virtual pageviews',
      function *() {

    if (notSupportedInBrowser()) return;

    var hitData = (yield browser
        .execute(ga.run, 'require', 'pageVisibilityTracker', {
          sessionTimeout: 1/60,
          virtualPageviewFields: {
            dimension1: 'pageVisibilityTracker'
          }
        })
        .pause(SESSION_TIMEOUT)
        .execute(ga.run, 'send', 'event', 'Uncategorized', 'inactive')
        .execute(ga.getHitData)).value;

    // Expects non-pageview hits queued to be sent after the session has timed
    // out to include a pageview immediately before them.
    assert.equal(hitData.length, 2);
    assert.equal(hitData[0].hitType, 'pageview');
    assert.equal(hitData[0].dimension1, 'pageVisibilityTracker')
    assert.equal(hitData[1].eventCategory, 'Uncategorized');
    assert.equal(hitData[1].eventAction, 'inactive');

    hitData = (yield browser.pause(SESSION_TIMEOUT)
        .element('body').keys(command + 't' + command) // Opens a new tab.
        .element('body').keys(command + 'w' + command) // Closes the new tab.
        .execute(ga.getHitData)).value;

    // Expects non-pageview hits queued to be sent after the session has timed
    // out to include a pageview immediately before them.
    assert.equal(hitData.length, 3);
    assert.equal(hitData[2].hitType, 'pageview');
    assert.equal(hitData[2].dimension1, 'pageVisibilityTracker')
  });


  it('should reset the session timeout when other hits are sent', function *() {

    if (notSupportedInBrowser()) return;

    var hitData = (yield browser
        .execute(ga.run, 'require', 'pageVisibilityTracker', {
          sessionTimeout: 1/60
        })
        .pause(SESSION_TIMEOUT / 2)
        .execute(ga.run, 'send', 'event', 'Uncategorized', 'inactive')
        .pause(SESSION_TIMEOUT / 2)
        .element('body').keys(command + 't' + command) // Opens a new tab.
        .element('body').keys(command + 'w' + command) // Closes the new tab.
        .execute(ga.getHitData)).value;

    assert.equal(hitData.length, 3);
    assert.equal(hitData[0].eventCategory, 'Uncategorized');
    assert.equal(hitData[0].eventAction, 'inactive');

    // Since the event above resets the session timeout, opening a new
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
        .execute(ga.run, 'require', 'pageVisibilityTracker')
        .execute(ga.run, 'send', 'pageview')
        .waitUntil(ga.hitDataMatches([['[0].devId', constants.DEV_ID]]));
  });

});


function isFirefox() {
  return browserCaps.browserName == 'firefox';
}


function notSupportedInBrowser() {
  // TODO(philipwalton): Opening and switching between tabs is not very well
  // supported in webdriver, so we currently only test in Firefox.
  return !isFirefox();
}
