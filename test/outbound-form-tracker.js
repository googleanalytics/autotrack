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
var uuid = require('uuid');
var ga = require('./analytics');
var utilities = require('./utilities');
var constants = require('../lib/constants');
var pkg = require('../package.json');


var testId;
var log;
var baseUrl = browser.options.baseUrl;


describe('outboundFormTracker', function() {
  this.retries(4);

  beforeEach(function() {
    testId = uuid();
    log = utilities.bindLogAccessors(testId);

    browser.url('/test/outbound-form-tracker.html');
    browser.execute(ga.run, 'create', 'UA-XXXXX-Y', 'auto');
    browser.execute(ga.logHitData, testId);
  });

  afterEach(function() {
    log.removeHits();
  });

  it('sends events on outbound form submits', function() {
    browser.execute(ga.run, 'require', 'outboundFormTracker');
    browser.click('#outbound-submit');
    browser.waitUntil(log.hitCountEquals(1));

    var hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'Outbound Form');
    assert.strictEqual(hits[0].ea, 'submit');
    assert.strictEqual(hits[0].el, 'https://example.com/outbound-submit');
  });

  it('does not send events on local form submits', function() {
    browser.execute(ga.run, 'require', 'outboundFormTracker');
    browser.click('#local-submit');

    log.assertNoHitsReceived();
  });

  it('navigates to the proper outbound location on submit', function() {
    browser.execute(ga.run, 'require', 'outboundFormTracker');
    browser.click('#outbound-submit');
    browser.waitUntil(
        utilities.urlMatches('https://example.com/outbound-submit'));
  });

  it('navigates to the proper local location on submit', function() {
    browser.execute(ga.run, 'require', 'outboundFormTracker');
    browser.click('#local-submit');
    browser.waitUntil(utilities.urlMatches('/test/blank.html'));
  });

  it('supports customizing the selector used to detect submits', function() {
    // Submit a form that doesn't match the `.form` selector.
    browser.execute(ga.run, 'require', 'outboundFormTracker', {
      formSelector: '.form'
    });
    browser.click('#outbound-submit');

    log.assertNoHitsReceived();

    // Go back and submit a form that does match the `.form` selector.
    browser.url('/test/outbound-form-tracker.html');
    browser.execute(ga.run, 'create', 'UA-XXXXX-Y', 'auto');
    browser.execute(ga.logHitData, testId);
    browser.execute(ga.run, 'require', 'outboundFormTracker', {
      formSelector: '.form'
    });
    browser.click('#outbound-submit-with-class');

    // A single hit ensures the previous submit didn't generate a hit.
    browser.waitUntil(log.hitCountEquals(1));

    var hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'Outbound Form');
    assert.strictEqual(hits[0].ea, 'submit');
    assert.strictEqual(
        hits[0].el, 'https://example.com/outbound-submit-with-class');
  });

  it('supports customizing what is considered an outbound form', function() {
    browser.execute(requireOutboundFormTracker_shouldTrackOutboundForm);
    browser.click('#local-submit');
    browser.waitUntil(log.hitCountEquals(1));

    var hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'Outbound Form');
    assert.strictEqual(hits[0].ea, 'submit');
    assert.strictEqual(hits[0].el, baseUrl + '/test/blank.html');
  });

  it('supports customizing any field via the fieldsObj', function() {
    browser.execute(ga.run, 'require', 'outboundFormTracker', {
      fieldsObj: {
        eventCategory: 'External Form',
        eventAction: 'send',
        nonInteraction: true
      }
    });
    browser.click('#outbound-submit');
    browser.waitUntil(log.hitCountEquals(1));

    var hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'External Form');
    assert.strictEqual(hits[0].ea, 'send');
    assert.strictEqual(hits[0].el, 'https://example.com/outbound-submit');
    assert.strictEqual(hits[0].ni, '1');
  });

  it('supports setting attributes declaratively', function() {
    browser.execute(ga.run, 'require', 'outboundFormTracker');
    browser.click('#declarative-attributes-submit');
    browser.waitUntil(log.hitCountEquals(1));

    var hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'External Form');
    assert.strictEqual(hits[0].ea, 'submit');
    assert.strictEqual(hits[0].cd1, '1');
  });

  it('supports customizing the attribute prefix', function() {
    browser.execute(ga.run, 'require', 'outboundFormTracker', {
      attributePrefix: 'data-ga-'
    });
    browser.click('#declarative-attributes-prefix-submit');
    browser.waitUntil(log.hitCountEquals(1));

    var hits = log.getHits();
    assert.strictEqual(hits[0].ea, 'submit');
    assert.strictEqual(hits[0].el, 'www.google-analytics.com');
    assert.strictEqual(hits[0].ni, '1');
  });

  it('supports specifying a hit filter', function() {
    browser.execute(requireOutboundFormTracker_hitFilter);
    browser.click('#outbound-submit');
    browser.waitUntil(log.hitCountEquals(1));

    var hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'Outbound Form');
    assert.strictEqual(hits[0].ea, 'submit');
    assert.strictEqual(hits[0].el, '/outbound-submit');
  });

  it('supports forms in shadow DOM and event retargetting', function() {
    if (!browserSupportsEventsInShadowDom()) return this.skip();

    browser.execute(ga.run, 'require', 'outboundFormTracker');
    browser.execute(simulateSubmitFromInsideShadowDom);
    browser.waitUntil(log.hitCountEquals(1));

    var hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'Outbound Form');
    assert.strictEqual(hits[0].ea, 'submit');
    assert.strictEqual(hits[0].el, 'https://example.com/shadow-host');
  });

  it('includes usage params with all hits', function() {
    browser.execute(ga.run, 'require', 'outboundFormTracker');
    browser.execute(ga.run, 'send', 'pageview');
    browser.waitUntil(log.hitCountEquals(1));

    var hits = log.getHits();
    assert.strictEqual(hits[0].did, constants.DEV_ID);
    assert.strictEqual(hits[0][constants.VERSION_PARAM], pkg.version);

    // '10' = '0000010000' in hex
    assert.strictEqual(hits[0][constants.USAGE_PARAM], '10');
  });

  describe('remove', function() {
    it('destroys all bound events and functionality', function() {
      browser.execute(ga.run, 'require', 'outboundFormTracker');
      browser.execute(ga.run, 'outboundFormTracker:remove');
      browser.click('#outbound-submit');
      log.assertNoHitsReceived();
    });
  });
});


/**
 * @return {boolean} True if the current browser doesn't support all features
 *    required for these tests.
 */
function browserSupportsEventsInShadowDom() {
  return browser.execute(function() {
    return Event.prototype.composedPath;
  }).value;
}


/**
 * Since function objects can't be passed via parameters from server to
 * client, this one-off function must be used to set the value for
 * `shouldTrackOutboundForm`.
 */
function requireOutboundFormTracker_shouldTrackOutboundForm() {
  ga('require', 'outboundFormTracker', {
    shouldTrackOutboundForm: function(form, parseUrl) {
      return parseUrl(form.action).pathname == '/test/blank.html';
    }
  });
}


/**
 * Since function objects can't be passed via parameters from server to
 * client, this one-off function must be used to set the value for
 * `hitFilter`.
 */
function requireOutboundFormTracker_hitFilter() {
  ga('require', 'outboundFormTracker', {
    hitFilter: function(model, form) {
      if (form.action == 'https://example.com/outbound-submit') {
        model.set('eventLabel', '/outbound-submit', true);
      }
    }
  });
}


/**
 * Webdriver does not currently support selecting elements inside a shadow
 * tree, so we have to fake it.
 */
function simulateSubmitFromInsideShadowDom() {
  var shadowHost = document.getElementById('shadow-host');
  var form = shadowHost.shadowRoot.querySelector('form');

  var event = new Event('submit', {
    bubbles: true,
    cancelable: true,
    composed: true
  });
  form.dispatchEvent(event);
}
