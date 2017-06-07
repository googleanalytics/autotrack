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


describe('outboundLinkTracker', function() {
  this.retries(4);

  beforeEach(() => {
    testId = uuid();
    log = bindLogAccessors(testId);

    browser.url('/test/e2e/fixtures/outbound-link-tracker.html');
    browser.execute(ga.run, 'create', DEFAULT_TRACKER_FIELDS);
    browser.execute(ga.logHitData, testId);
  });

  afterEach(() => {
    log.removeHits();
  });

  it('sends events on outbound link clicks', () => {
    browser.execute(ga.run, 'require', 'outboundLinkTracker');
    browser.click('#outbound-link');
    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'Outbound Link');
    assert.strictEqual(hits[0].ea, 'click');
    assert.strictEqual(hits[0].el, 'https://example.com/?q=outbound-link');
  });

  it('does not send events on local link clicks', () => {
    browser.execute(ga.run, 'require', 'outboundLinkTracker');
    browser.click('#local-link');

    log.assertNoHitsReceived();
  });

  it('does not send events on non-http(s) protocol links', () => {
    browser.execute(ga.run, 'require', 'outboundLinkTracker');
    browser.click('#javascript-protocol');
    browser.click('#file-protocol');

    log.assertNoHitsReceived();
  });

  it('navigates to the proper location on outbound clicks', () => {
    browser.execute(ga.run, 'require', 'outboundLinkTracker');
    browser.click('#outbound-link');
    browser.waitUntil(urlMatches('https://example.com/?q=outbound-link'));
  });

  it('navigates to the proper location on local clicks', () => {
    browser.execute(ga.run, 'require', 'outboundLinkTracker');
    browser.click('#local-link');
    browser.waitUntil(urlMatches('/test/e2e/fixtures/blank.html'));
  });

  it('works with SVG links', () => {
    browser.execute(ga.run, 'require', 'outboundLinkTracker');
    browser.click('#svg-link');
    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'Outbound Link');
    assert.strictEqual(hits[0].ea, 'click');
    assert.strictEqual(hits[0].el, 'https://example.com/?q=svg-link');
  });

  it('works with <area> links', function() {
    if (!browserSupportsAreaClicks()) return this.skip();

    browser.execute(ga.run, 'require', 'outboundLinkTracker');
    browser.click('#area-link');
    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'Outbound Link');
    assert.strictEqual(hits[0].ea, 'click');
    assert.strictEqual(hits[0].el, 'https://example.com/?q=area-link');
  });

  it('supports events other than click', () => {
    const events = ['mousedown'];
    let action = 'click';
    let expectedHits = 1;
    if (browserSupportsRightClick()) {
      events.push('contextmenu');
      action = 'rightClick';
      expectedHits = 2;
    }

    browser.execute(ga.run, 'require', 'outboundLinkTracker', {events});

    browser[action]('#outbound-link');
    browser.waitUntil(log.hitCountEquals(expectedHits));

    const hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'Outbound Link');
    assert.strictEqual(hits[0].ea, 'mousedown');
    assert.strictEqual(hits[0].el, 'https://example.com/?q=outbound-link');
    if (browserSupportsRightClick()) {
      assert.strictEqual(hits[1].ec, 'Outbound Link');
      assert.strictEqual(hits[1].ea, 'contextmenu');
      assert.strictEqual(hits[1].el, 'https://example.com/?q=outbound-link');
    }
  });

  it('supports customizing the selector used to detect clicks', () => {
    // Click a link that doesn't match the `.link` selector.
    browser.execute(ga.run, 'require', 'outboundLinkTracker', {
      linkSelector: '.link',
    });
    browser.click('#outbound-link');

    log.assertNoHitsReceived();

    // Go back and click a link that does match the `.link` selector.
    browser.url('/test/e2e/fixtures/outbound-link-tracker.html');
    browser.execute(ga.run, 'create', DEFAULT_TRACKER_FIELDS);
    browser.execute(ga.logHitData, testId);
    browser.execute(ga.run, 'require', 'outboundLinkTracker', {
      linkSelector: '.link',
    });
    browser.click('#outbound-link-with-class');
    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'Outbound Link');
    assert.strictEqual(hits[0].ea, 'click');
    assert.strictEqual(hits[0].el,
        'https://example.com/?q=outbound-link-with-class');
  });

  it('supports customizing what is considered an outbound link', () => {
    browser.execute(requireOutboundLinkTracker_shouldTrackOutboundLink);
    browser.click('#local-link');
    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'Outbound Link');
    assert.strictEqual(hits[0].ea, 'click');
    assert.strictEqual(hits[0].el, baseUrl + '/test/e2e/fixtures/blank.html');
  });

  it('supports customizing any field via the fieldsObj', () => {
    browser.execute(ga.run, 'require', 'outboundLinkTracker', {
      fieldsObj: {
        eventCategory: 'External Link',
        eventAction: 'tap',
        nonInteraction: true,
      },
    });
    browser.click('#outbound-link');
    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'External Link');
    assert.strictEqual(hits[0].ea, 'tap');
    assert.strictEqual(hits[0].el, 'https://example.com/?q=outbound-link');
    assert.strictEqual(hits[0].ni, '1');
  });

  it('supports setting attributes declaratively', () => {
    browser.execute(ga.run, 'require', 'outboundLinkTracker');
    browser.click('#declarative-attributes');
    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'External Link');
    assert.strictEqual(hits[0].ea, 'click');
    assert.strictEqual(hits[0].cd1, '1');
  });

  it('supports customizing the attribute prefix', () => {
    browser.execute(ga.run, 'require', 'outboundLinkTracker', {
      attributePrefix: 'data-ga-',
    });
    browser.click('#declarative-attributes-prefix');
    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].ea, 'click');
    assert.strictEqual(hits[0].el, 'example.com');
    assert.strictEqual(hits[0].ni, '1');
  });

  it('supports specifying a hit filter', () => {
    browser.execute(requireOutboundLinkTracker_hitFilter);
    browser.click('#outbound-link');
    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'Outbound Link');
    assert.strictEqual(hits[0].ea, 'click');
    assert.strictEqual(hits[0].el, '/outbound-link');
    assert.strictEqual(hits[0].cd1, 'click');
  });

  it('supports links in shadow DOM and event retargetting', () => {
    if (!browserSupportsEventsInShadowDom()) return;

    browser.execute(ga.run, 'require', 'outboundLinkTracker');
    browser.execute(simulateClickFromInsideShadowDom);
    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'Outbound Link');
    assert.strictEqual(hits[0].ea, 'click');
    assert.strictEqual(hits[0].el, 'https://example.com/?q=shadow-host');
  });

  it('includes usage params with all hits', () => {
    browser.execute(ga.run, 'require', 'outboundLinkTracker');
    browser.execute(ga.run, 'send', 'pageview');
    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].did, constants.DEV_ID);
    assert.strictEqual(hits[0][constants.VERSION_PARAM], pkg.version);

    // '20' = '0000100000' in hex
    assert.strictEqual(hits[0][constants.USAGE_PARAM], '20');
  });

  describe('remove', () => {
    it('destroys all bound events and functionality', () => {
      browser.execute(ga.run, 'require', 'outboundLinkTracker');
      browser.execute(ga.run, 'outboundLinkTracker:remove');
      browser.click('#outbound-link');
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
 * @return {boolean} True if the current browser supports Shadow DOM.
 */
function browserSupportsEventsInShadowDom() {
  return browser.execute(() => {
    return Event.prototype.composedPath;
  }).value;
}


/**
 * @return {boolean} True if the browser driver supports the rightClick method.
 */
function browserSupportsRightClick() {
  const browserCaps = browser.session().value;
  return !(
      // https://github.com/webdriverio/webdriverio/issues/1419
      browserCaps.browserName == 'safari' ||
      // https://github.com/SeleniumHQ/selenium/issues/2285
      browserCaps.browserName == 'firefox' ||
      // TODO(philipwalton): not sure why this is failing, might just be
      // a temporary Sauce Labs issue.
      browserCaps.browserName == 'internet explorer');
}


/**
 * @return {boolean} True if the browser driver supports proper clicking on
 *     <area> elements.
 */
function browserSupportsAreaClicks() {
  const browserCaps = browser.session().value;
  return !(browserCaps.browserName == 'internet explorer' ||
      browserCaps.browserName == 'safari');
}


/**
 * Since function objects can't be passed via parameters from server to
 * client, this one-off function must be used to set the value for
 * `shouldTrackOutboundLink`.
 */
function requireOutboundLinkTracker_shouldTrackOutboundLink() {
  ga('require', 'outboundLinkTracker', {
    shouldTrackOutboundLink: (link, parseUrl) => {
      return parseUrl(link.href).pathname == '/test/e2e/fixtures/blank.html';
    },
  });
}


/**
 * Since function objects can't be passed via parameters from server to
 * client, this one-off function must be used to set the value for
 * `hitFilter`.
 */
function requireOutboundLinkTracker_hitFilter() {
  ga('require', 'outboundLinkTracker', {
    hitFilter: (model, link, event) => {
      if (link.href == 'https://example.com/?q=outbound-link') {
        model.set('eventLabel', '/outbound-link', true);
      }
      model.set('dimension1', event.type, true);
    },
  });
}


/**
 * Webdriver does not currently support selecting elements inside a shadow
 * tree, so we have to fake it.
 */
function simulateClickFromInsideShadowDom() {
  const shadowHost = document.getElementById('shadow-host');
  const link = shadowHost.shadowRoot.querySelector('a');

  const event = new Event('click', {
    bubbles: true,
    cancelable: true,
    composed: true,
  });
  link.dispatchEvent(event);
}
