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


describe('outboundFormTracker', function() {

  function setupPage() {
    return browser.url('/test/outbound-form-tracker.html');
  }


  function startTracking() {
    return browser
        .execute(ga.run, 'create', 'UA-XXXXX-Y', 'auto')
        .execute(ga.trackHitData)
  }


  function stopTracking() {
    return browser
        .execute(unstopFormSubmitEvents)
        .execute(ga.clearHitData)
        .execute(ga.run, 'outboundFormTracker:remove')
        .execute(ga.run, 'remove');
  }


  before(setupPage);
  beforeEach(startTracking);
  afterEach(stopTracking);


  it('should send events on outbound form submits', function *() {

    var hitData = (yield browser
        .execute(stopFormSubmitEvents)
        .execute(stubBeacon)
        .execute(ga.run, 'require', 'outboundFormTracker')
        .click('#submit-1')
        .execute(ga.getHitData))
        .value;

    assert.equal(hitData[0].eventCategory, 'Outbound Form');
    assert.equal(hitData[0].eventAction, 'submit');
    assert.equal(hitData[0].eventLabel, 'http://google-analytics.com/collect');
  });


  it('should not send events on local form submits', function *() {

    var hitData = (yield browser
        .execute(stopFormSubmitEvents)
        .execute(stubBeacon)
        .execute(ga.run, 'require', 'outboundFormTracker')
        .click('#submit-2')
        .execute(ga.getHitData))
        .value;

    assert(!hitData.length);
  });


  it('should work with forms missing the action attribute', function *() {

    var hitData = (yield browser
        .execute(stopFormSubmitEvents)
        .execute(stubBeacon)
        .execute(ga.run, 'require', 'outboundFormTracker')
        .click('#submit-3')
        .execute(ga.getHitData))
        .value;

    assert(!hitData.length);
  });


  it('should allow customizing what is considered an outbound form',
      function *() {

    var testData = (yield browser
        .execute(stopFormSubmitEvents)
        .execute(stubBeacon)
        .execute(requireOutboundFormTrackerWithConditional)
        .click('#submit-1')
        .click('#submit-2')
        .click('#submit-3')
        .execute(ga.getHitData))
        .value;

    assert(!testData.length);
  });


  it('should navigate to the proper outbound location on submit', function *() {

    yield browser
        .execute(stubBeacon)
        .execute(ga.run, 'require', 'outboundFormTracker')
        .click('#submit-1')
        .waitUntil(urlMatches('http://google-analytics.com/collect'));

    // Restores the page state.
    yield setupPage();
  });


  it('should navigate to the proper local location on submit', function *() {

    yield browser
        .execute(stubBeacon)
        .execute(ga.run, 'require', 'outboundFormTracker')
        .click('#submit-2')
        .waitUntil(urlMatches('/test/blank.html'));

    // Restores the page state.
    yield setupPage();
  });


  it('should stop the event when beacon is not supported and re-emit ' +
      'after the hit succeeds or times out', function* () {

    var hitData = (yield browser
        .execute(disableProgramaticFormSubmits)
        .execute(stubNoBeacon)
        .execute(ga.run, 'require', 'outboundFormTracker')
        .click('#submit-1')
        .execute(ga.getHitData))
        .value;

    // Tests that the hit is sent.
    assert.equal(hitData[0].eventCategory, 'Outbound Form');
    assert.equal(hitData[0].eventAction, 'submit');
    assert.equal(hitData[0].eventLabel, 'http://google-analytics.com/collect');

    // Tests that navigation actually happens
    yield setupPage();
    yield startTracking();
    yield browser
        .execute(stubNoBeacon)
        .execute(ga.run, 'require', 'outboundFormTracker')
        .click('#submit-1')
        .waitUntil(urlMatches('http://google-analytics.com/collect'));

    // Restores the page state.
    yield setupPage();

    // TODO(philipwalton): figure out a way to test the hitCallback timing out.
  });


  it('should include the &did param with all hits', function() {

    return browser
        .execute(ga.run, 'require', 'outboundFormTracker')
        .execute(ga.run, 'send', 'pageview')
        .waitUntil(ga.hitDataMatches([['[0].devId', constants.DEV_ID]]));
  });

});


/**
 * Since function objects can't be passed via parameters from server to
 * client, this one-off function must be used to set the value for
 * `shouldTrackOutboundForm`.
 */
function requireOutboundFormTrackerWithConditional() {
  ga('require', 'outboundFormTracker', {
    shouldTrackOutboundForm: function(form) {
      var action = form.getAttribute('action');
      return action &&
          action.indexOf('http') === 0 &&
          action.indexOf('google-analytics.com') < 0;
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


function stopFormSubmitEvents() {
  window.__stopFormSubmits__ = function(event) {
    event.preventDefault();
  };

  document.addEventListener('submit', window.__stopFormSubmits__);
}


function unstopFormSubmitEvents() {
  document.removeEventListener('submit', window.__stopFormSubmits__);
}


function stubBeacon() {
  navigator.sendBeacon = function() {
    return true;
  };
}


function stubNoBeacon() {
  navigator.sendBeacon = undefined;
}


function disableProgramaticFormSubmits() {
  for (var i = 0, form; form = document.forms[i]; i++) {
    form.submit = function() {};
  }
}
