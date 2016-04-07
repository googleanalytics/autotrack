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
var utilities = require('./utilities');
var constants = require('../lib/constants');


describe('outboundLinkTracker', function() {

  before(setupPage);
  beforeEach(startTracking);
  afterEach(stopTracking);


  it('should send events on outbound link clicks', function() {

    var hitData = browser
        .execute(utilities.stopLinkClickEvents)
        .execute(utilities.stubBeacon)
        .execute(ga.run, 'require', 'outboundLinkTracker')
        .click('#outbound-link')
        .execute(ga.getHitData)
        .value;

    assert.equal(hitData.length, 1);
    assert.equal(hitData[0].eventCategory, 'Outbound Link');
    assert.equal(hitData[0].eventAction, 'click');
    assert.equal(hitData[0].eventLabel, 'https://google-analytics.com/collect');
  });


  it('should not send events on local link clicks', function() {

    var hitData = browser
        .execute(utilities.stopLinkClickEvents)
        .execute(utilities.stubBeacon)
        .execute(ga.run, 'require', 'outboundLinkTracker')
        .click('#local-link')
        .execute(ga.getHitData)
        .value;

    assert.equal(hitData.length, 0);
  });


  it('should not send events on non-http(s) protocol links', function() {

    var hitData = browser
        .execute(utilities.stopLinkClickEvents)
        .execute(utilities.stubBeacon)
        .execute(ga.run, 'require', 'outboundLinkTracker')
        .click('#javascript-protocol')
        .click('#file-protocol')
        .execute(ga.getHitData)
        .value;

    assert.equal(hitData.length, 0);
  });


  it('should allow customizing what is considered an outbound link',
      function() {

    var hitData = browser
        .execute(utilities.stopLinkClickEvents)
        .execute(utilities.stubBeacon)
        .execute(requireOutboundLinkTrackerWithConditional)
        .click('#outbound-link')
        .execute(ga.getHitData)
        .value;

    assert.equal(hitData.length, 0);
  });


  it('should navigate to the proper location on outbound clicks', function() {

    browser
        .execute(utilities.stubBeacon)
        .execute(ga.run, 'require', 'outboundLinkTracker')
        .click('#outbound-link')
        .waitUntil(utilities.urlMatches('https://google-analytics.com/collect'));

    // Restores the page state.
    setupPage();
  });


  it('should navigate to the proper location on local clicks', function() {

    browser
        .execute(utilities.stubBeacon)
        .execute(ga.run, 'require', 'outboundLinkTracker')
        .click('#local-link')
        .waitUntil(utilities.urlMatches('/test/blank.html'));

    // Restores the page state.
    setupPage();
  });


  it('should set the target to "_blank" when beacon is not supported',
      function() {

    var target = browser
        .execute(utilities.stubNoBeacon)
        .execute(utilities.stopLinkClickEvents)
        .execute(ga.run, 'require', 'outboundLinkTracker')
        .click('#outbound-link')
        .getAttribute('#outbound-link', 'target');

    assert.equal('_blank', target);
  });


  it('should include the &did param with all hits', function() {

    browser
        .execute(ga.run, 'require', 'outboundLinkTracker')
        .execute(ga.run, 'send', 'pageview')
        .waitUntil(ga.hitDataMatches([['[0].devId', constants.DEV_ID]]));
  });

});


/**
 * Navigates to the outbound link tracker test page.
 */
function setupPage() {
  browser.url('/test/outbound-link-tracker.html');
}


/**
 * Initiates the tracker and capturing hit data.
 */
function startTracking() {
  browser
      .execute(ga.run, 'create', 'UA-XXXXX-Y', 'auto')
      .execute(ga.trackHitData);
}


/**
 * Stops capturing hit data and remove the plugin and tracker.
 */
function stopTracking() {
  browser
      .execute(utilities.unstopLinkClickEvents)
      .execute(ga.clearHitData)
      .execute(ga.run, 'outboundLinkTracker:remove')
      .execute(ga.run, 'remove');
}


/**
 * Since function objects can't be passed via parameters from server to
 * client, this one-off function must be used to set the value for
 * `shouldTrackOutboundLink`.
 */
function requireOutboundLinkTrackerWithConditional() {
  ga('require', 'outboundLinkTracker', {
    shouldTrackOutboundLink: function(link) {
      return link.hostname != 'google-analytics.com';
    }
  });
}
