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


describe('outboundLinkTracker', function() {

  function setupPage() {
    return browser.url('/test/outbound-link-tracker.html');
  }


  function startTracking() {
    return browser
        .execute(ga.run, 'create', 'UA-XXXXX-Y', 'auto')
        .execute(ga.trackHitData)
  }


  function stopTracking() {
    return browser
        .execute(unstopLinkClickEvents)
        .execute(ga.clearHitData)
        .execute(ga.run, 'outboundLinkTracker:remove')
        .execute(ga.run, 'remove');
  }


  before(setupPage);
  beforeEach(startTracking);
  afterEach(stopTracking);


  it('should send events on outbound link clicks', function *() {

    var hitData = (yield browser
        .execute(stopLinkClickEvents)
        .execute(stubBeacon)
        .execute(ga.run, 'require', 'outboundLinkTracker')
        .click('#outbound-link')
        .execute(ga.getHitData))
        .value;

    assert.equal(hitData.length, 1);
    assert.equal(hitData[0].eventCategory, 'Outbound Link');
    assert.equal(hitData[0].eventAction, 'click');
    assert.equal(hitData[0].eventLabel, 'http://google-analytics.com/collect');
  });


  it('should not send events on local link clicks', function *() {

    var hitData = (yield browser
        .execute(stopLinkClickEvents)
        .execute(stubBeacon)
        .execute(ga.run, 'require', 'outboundLinkTracker')
        .click('#local-link')
        .execute(ga.getHitData))
        .value;

    assert.equal(hitData.length, 0);
  });


  it('should not send events on non-http(s) protocol links', function*() {

    var hitData = (yield browser
        .execute(stopLinkClickEvents)
        .execute(stubBeacon)
        .execute(ga.run, 'require', 'outboundLinkTracker')
        .click('#javascript-protocol')
        .click('#file-protocol')
        .execute(ga.getHitData))
        .value;

    assert.equal(hitData.length, 0);
  });


  it('should allow customizing what is considered an outbound link',
      function*() {

    var hitData = (yield browser
        .execute(stopLinkClickEvents)
        .execute(stubBeacon)
        .execute(requireOutboundLinkTrackerWithConditional)
        .click('#outbound-link')
        .execute(ga.getHitData))
        .value;

    assert.equal(hitData.length, 0);
  });


  it('should navigate to the proper location on outbound clicks', function *() {

    yield browser
        .execute(stubBeacon)
        .execute(ga.run, 'require', 'outboundLinkTracker')
        .click('#outbound-link')
        .waitUntil(urlMatches('http://google-analytics.com/collect'));

    // Restores the page state.
    yield setupPage();
  });


  it('should navigate to the proper location on local clicks', function *() {

    yield browser
        .execute(stubBeacon)
        .execute(ga.run, 'require', 'outboundLinkTracker')
        .click('#local-link')
        .waitUntil(urlMatches('/test/blank.html'));

    // Restores the page state.
    yield setupPage();
  });


  it('should set the target to "_blank" when beacon is not supported',
      function* () {

    var target = (yield browser
        .execute(stubNoBeacon)
        .execute(stopLinkClickEvents)
        .execute(ga.run, 'require', 'outboundLinkTracker')
        .click('#outbound-link')
        .getAttribute('#outbound-link', 'target'));

    assert.equal('_blank', target);
  });


  it('should include the &did param with all hits', function() {

    return browser
        .execute(ga.run, 'require', 'outboundLinkTracker')
        .execute(ga.run, 'send', 'pageview')
        .waitUntil(ga.hitDataMatches([['[0].devId', constants.DEV_ID]]));
  });

});


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


function urlMatches(expectedUrl) {
  return function() {
    return browser.url().then(function(result) {
      var actualUrl = result.value;
      return actualUrl.indexOf(expectedUrl) > -1;
    });
  }
}


function stopLinkClickEvents() {
  window.__stopClinkClicks__ = function(event) {
    event.preventDefault();
  };

  document.addEventListener('click', window.__stopClinkClicks__);
}


function unstopLinkClickEvents() {
  document.removeEventListener('click', window.__stopClinkClicks__);
}


function stubBeacon() {
  navigator.sendBeacon = function() {
    return true;
  };
}


function stubNoBeacon() {
  navigator.sendBeacon = undefined;
}
