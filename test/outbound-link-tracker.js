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


var browserCaps;


describe('outboundLinkTracker', function() {

  before(setupPage);
  beforeEach(startTracking);
  afterEach(stopTracking);


  it('should send events on outbound link clicks', function() {

    var hitData = browser
        .execute(utilities.stopClickEvents)
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
        .execute(utilities.stopClickEvents)
        .execute(utilities.stubBeacon)
        .execute(ga.run, 'require', 'outboundLinkTracker')
        .click('#local-link')
        .execute(ga.getHitData)
        .value;

    assert.equal(hitData.length, 0);
  });


  it('should not send events on non-http(s) protocol links', function() {

    var hitData = browser
        .execute(utilities.stopClickEvents)
        .execute(utilities.stubBeacon)
        .execute(ga.run, 'require', 'outboundLinkTracker')
        .click('#javascript-protocol')
        .click('#file-protocol')
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
        .execute(utilities.stopClickEvents)
        .execute(ga.run, 'require', 'outboundLinkTracker')
        .click('#outbound-link')
        .getAttribute('#outbound-link', 'target');

    assert.equal('_blank', target);
  });


  it('should support customizing the selector used to detect link clicks',
      function() {

    var hitData = browser
        .execute(utilities.stopClickEvents)
        .execute(utilities.stubBeacon)
        .execute(ga.run, 'require', 'outboundLinkTracker', {
          linkSelector: '.link'
        })
        .click('#outbound-link')
        .click('#outbound-link-with-class')
        .execute(ga.getHitData)
        .value;

    assert.equal(hitData.length, 1);
    assert.equal(hitData[0].eventCategory, 'Outbound Link');
    assert.equal(hitData[0].eventAction, 'click');
    assert.equal(hitData[0].eventLabel, 'https://example.com/');
  });


  it('should support customizing what is considered an outbound link',
      function() {

    var hitData = browser
        .execute(utilities.stopClickEvents)
        .execute(utilities.stubBeacon)
        .execute(requireOutboundLinkTracker_shouldTrackOutboundLink)
        .click('#outbound-link')
        .execute(ga.getHitData)
        .value;

    assert.equal(hitData.length, 0);
  });


  it('should support customizing any field via the fieldsObj', function() {

    var hitData = browser
        .execute(utilities.stopClickEvents)
        .execute(utilities.stubBeacon)
        .execute(ga.run, 'require', 'outboundLinkTracker', {
          fieldsObj: {
            eventCategory: 'External Link',
            eventAction: 'tap',
            nonInteraction: true
          }
        })
        .click('#outbound-link')
        .execute(ga.getHitData)
        .value;

    assert.equal(hitData.length, 1);
    assert.equal(hitData[0].eventCategory, 'External Link');
    assert.equal(hitData[0].eventAction, 'tap');
    assert.equal(hitData[0].eventLabel, 'https://google-analytics.com/collect');
    assert.equal(hitData[0].nonInteraction, true);
  });


  it('should support specifying a hit filter', function() {

    var hitData = browser
        .execute(utilities.stopClickEvents)
        .execute(utilities.stubBeacon)
        .execute(requireOutboundLinkTracker_hitFilter)
        .click('#outbound-link')
        .click('#outbound-link-with-class')
        .execute(ga.getHitData)
        .value;

    assert.equal(hitData.length, 1);
    assert.equal(hitData[0].eventCategory, 'Outbound Link');
    assert.equal(hitData[0].eventAction, 'click');
    assert.equal(hitData[0].eventLabel, 'https://example.com/');
    assert.equal(hitData[0].nonInteraction, true);
  });


  it('should support links in shadow DOM and event retargetting', function() {

    if (notSupportedInBrowser()) return;

    var hitData = browser
        .execute(utilities.stopClickEvents)
        .execute(utilities.stubBeacon)
        .execute(ga.run, 'require', 'outboundLinkTracker')
        .execute(simulateClickFromInsideShadowDom)
        .execute(ga.getHitData)
        .value;

    assert.equal(hitData.length, 1);
    assert.equal(hitData[0].eventCategory, 'Outbound Link');
    assert.equal(hitData[0].eventAction, 'click');
    assert.equal(hitData[0].eventLabel, 'https://example.com/');
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
  browserCaps = browser.session().value;
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
      .execute(utilities.unstopClickEvents)
      .execute(ga.clearHitData)
      .execute(ga.run, 'outboundLinkTracker:remove')
      .execute(ga.run, 'remove');
}


/**
 * @return {boolean} True if the current browser doesn't support all features
 *    required for these tests.
 */
function notSupportedInBrowser() {
  return browser.execute(function() {
    return !Element.prototype.attachShadow;
  }).value;
}


/**
 * Since function objects can't be passed via parameters from server to
 * client, this one-off function must be used to set the value for
 * `shouldTrackOutboundLink`.
 */
function requireOutboundLinkTracker_shouldTrackOutboundLink() {
  ga('require', 'outboundLinkTracker', {
    shouldTrackOutboundLink: function(link) {
      return link.hostname != 'google-analytics.com';
    }
  });
}


/**
 * Since function objects can't be passed via parameters from server to
 * client, this one-off function must be used to set the value for
 * `hitFilter`.
 */
function requireOutboundLinkTracker_hitFilter() {
  ga('require', 'outboundLinkTracker', {
    hitFilter: function(model) {
      var href = model.get('eventLabel');
      if (href.indexOf('google-analytics.com') > -1) {
        throw 'Exclude hits to google-analytics.com';
      }
      else {
        model.set('nonInteraction', true);
      }
    }
  });
}


/**
 * Webdriver does not currently support selecting elements inside a shadow
 * tree, so we have to fake it.
 */
function simulateClickFromInsideShadowDom() {
  var shadowHost = document.getElementById('shadow-host');
  var link = shadowHost.shadowRoot.querySelector('a');

  var event = document.createEvent('Event');
  event.initEvent('click', true, true);
  link.dispatchEvent();
}
