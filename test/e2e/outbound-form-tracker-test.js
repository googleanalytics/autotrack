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


import assert from 'assert';
import uuid from 'uuid';
import * as ga from './ga';
import {bindLogAccessors} from './server';
import * as constants from '../../lib/constants';
import pkg from '../../package.json';


const DEFAULT_TRACKER_FIELDS = {
  trackingId: 'UA-12345-1',
  cookieDomain: 'auto',
  siteSpeedSampleRate: 0,
};


const baseUrl = browser.options.baseUrl;


let testId;
let log;


describe('outboundFormTracker', function() {
  this.retries(4);

  beforeEach(() => {
    testId = uuid();
    log = bindLogAccessors(testId);

    browser.url('/test/e2e/fixtures/outbound-form-tracker.html');
    browser.execute(ga.run, 'create', DEFAULT_TRACKER_FIELDS);
    browser.execute(ga.logHitData, testId);
  });

  afterEach(() => {
    log.removeHits();
  });

  it('sends events on outbound form submits', () => {
    browser.execute(ga.run, 'require', 'outboundFormTracker');
    browser.click('#outbound-submit');
    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'Outbound Form');
    assert.strictEqual(hits[0].ea, 'submit');
    assert.strictEqual(hits[0].el, 'https://example.com/?q=outbound-submit');
  });

  it('does not send events on local form submits', () => {
    browser.execute(ga.run, 'require', 'outboundFormTracker');
    browser.click('#local-submit');

    log.assertNoHitsReceived();
  });

  it('navigates to the proper outbound location on submit', () => {
    browser.execute(ga.run, 'require', 'outboundFormTracker');
    browser.click('#outbound-submit');
    browser.waitUntil(urlMatches('https://example.com/?q=outbound-submit'));
  });

  it('navigates to the proper local location on submit', () => {
    browser.execute(ga.run, 'require', 'outboundFormTracker');
    browser.click('#local-submit');
    browser.waitUntil(urlMatches('/test/e2e/fixtures/blank.html'));
  });

  it('supports customizing the selector used to detect submits', () => {
    // Submit a form that doesn't match the `.form` selector.
    browser.execute(ga.run, 'require', 'outboundFormTracker', {
      formSelector: '.form',
    });
    browser.click('#outbound-submit');

    log.assertNoHitsReceived();

    // Go back and submit a form that does match the `.form` selector.
    browser.url('/test/e2e/fixtures/outbound-form-tracker.html');
    browser.execute(ga.run, 'create', DEFAULT_TRACKER_FIELDS);
    browser.execute(ga.logHitData, testId);
    browser.execute(ga.run, 'require', 'outboundFormTracker', {
      formSelector: '.form',
    });
    browser.click('#outbound-submit-with-class');

    // A single hit ensures the previous submit didn't generate a hit.
    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'Outbound Form');
    assert.strictEqual(hits[0].ea, 'submit');
    assert.strictEqual(
        hits[0].el, 'https://example.com/?q=outbound-submit-with-class');
  });

  it('supports customizing what is considered an outbound form', () => {
    browser.execute(requireOutboundFormTracker_shouldTrackOutboundForm);
    browser.click('#local-submit');
    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'Outbound Form');
    assert.strictEqual(hits[0].ea, 'submit');
    assert.strictEqual(hits[0].el, baseUrl + '/test/e2e/fixtures/blank.html');
  });

  it('supports customizing any field via the fieldsObj', () => {
    browser.execute(ga.run, 'require', 'outboundFormTracker', {
      fieldsObj: {
        eventCategory: 'External Form',
        eventAction: 'send',
        nonInteraction: true,
      },
    });
    browser.click('#outbound-submit');
    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'External Form');
    assert.strictEqual(hits[0].ea, 'send');
    assert.strictEqual(hits[0].el, 'https://example.com/?q=outbound-submit');
    assert.strictEqual(hits[0].ni, '1');
  });

  it('supports setting attributes declaratively', () => {
    browser.execute(ga.run, 'require', 'outboundFormTracker');
    browser.click('#declarative-attributes-submit');
    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'External Form');
    assert.strictEqual(hits[0].ea, 'submit');
    assert.strictEqual(hits[0].cd1, '1');
  });

  it('supports customizing the attribute prefix', () => {
    browser.execute(ga.run, 'require', 'outboundFormTracker', {
      attributePrefix: 'data-ga-',
    });
    browser.click('#declarative-attributes-prefix-submit');
    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].ea, 'submit');
    assert.strictEqual(hits[0].el, 'www.google-analytics.com');
    assert.strictEqual(hits[0].ni, '1');
  });

  it('supports specifying a hit filter', () => {
    browser.execute(requireOutboundFormTracker_hitFilter);
    browser.click('#outbound-submit');
    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'Outbound Form');
    assert.strictEqual(hits[0].ea, 'submit');
    assert.strictEqual(hits[0].el, '/outbound-submit');
    assert.strictEqual(hits[0].cd1, 'submit');
  });

  it('supports forms in shadow DOM and event retargetting', function() {
    if (!browserSupportsEventsInShadowDom()) return this.skip();

    browser.execute(ga.run, 'require', 'outboundFormTracker');
    browser.execute(simulateSubmitFromInsideShadowDom);
    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'Outbound Form');
    assert.strictEqual(hits[0].ea, 'submit');
    assert.strictEqual(hits[0].el, 'https://example.com/?q=shadow-host');
  });

  it('includes usage params with all hits', () => {
    browser.execute(ga.run, 'require', 'outboundFormTracker');
    browser.execute(ga.run, 'send', 'pageview');
    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].did, constants.DEV_ID);
    assert.strictEqual(hits[0][constants.VERSION_PARAM], pkg.version);

    // '10' = '0000010000' in hex
    assert.strictEqual(hits[0][constants.USAGE_PARAM], '10');
  });

  describe('remove', () => {
    it('destroys all bound events and functionality', () => {
      browser.execute(ga.run, 'require', 'outboundFormTracker');
      browser.execute(ga.run, 'outboundFormTracker:remove');
      browser.click('#outbound-submit');
      log.assertNoHitsReceived();
    });
  });
});


/**
 * @param {string} expectedUrl The URL to match.
 * @return {Function} A function that, when invoked, returns a promise
 *     that is fulfilled when the URL in the browsers address bar matches
 *     the passed URL.
 */
function urlMatches(expectedUrl) {
  return () => {
    const result = browser.url();
    const actualUrl = result.value;
    return actualUrl.indexOf(expectedUrl) > -1;
  };
}


/**
 * @return {boolean} True if the current browser doesn't support all features
 *    required for these tests.
 */
function browserSupportsEventsInShadowDom() {
  return browser.execute(() => {
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
    shouldTrackOutboundForm: (form, parseUrl) => {
      return parseUrl(form.action).pathname == '/test/e2e/fixtures/blank.html';
    },
  });
}


/**
 * Since function objects can't be passed via parameters from server to
 * client, this one-off function must be used to set the value for
 * `hitFilter`.
 */
function requireOutboundFormTracker_hitFilter() {
  ga('require', 'outboundFormTracker', {
    hitFilter: (model, form, event) => {
      if (form.action == 'https://example.com/?q=outbound-submit') {
        model.set('eventLabel', '/outbound-submit', true);
      }
      model.set('dimension1', event.type);
    },
  });
}


/**
 * Webdriver does not currently support selecting elements inside a shadow
 * tree, so we have to fake it.
 */
function simulateSubmitFromInsideShadowDom() {
  const shadowHost = document.getElementById('shadow-host');
  const form = shadowHost.shadowRoot.querySelector('form');

  const event = new Event('submit', {
    bubbles: true,
    cancelable: true,
    composed: true,
  });
  form.dispatchEvent(event);
}
