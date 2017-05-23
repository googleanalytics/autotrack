/**
 * Copyright 2017 Google Inc. All Rights Reserved.
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


const PAGE_HEIGHT = 5000;
const WINDOW_HEIGHT = 500;
const DEBOUNCE_TIMEOUT = 500;


let testId;
let log;


describe('maxScrollTracker', function() {
  this.retries(4);

  before(() => {
    browser.url('/test/e2e/fixtures/max-scroll-tracker.html');
    browser.setViewportSize({width: 500, height: WINDOW_HEIGHT});
  });

  beforeEach(() => {
    testId = uuid();
    log = bindLogAccessors(testId);

    browser.scroll(0, 0);
    clearStorage();

    browser.execute(ga.run, 'create', DEFAULT_TRACKER_FIELDS);
    browser.execute(ga.logHitData, testId);
  });

  afterEach(() => {
    log.removeHits();
    browser.execute(ga.run, 'maxScrollTracker:remove');
    browser.execute(ga.run, 'remove');
  });

  it('sends events as the scroll percentage increases', () => {
    browser.execute(ga.run, 'require', 'maxScrollTracker');

    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .30);
    browser.waitUntil(log.hitCountEquals(1));

    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .55);
    browser.waitUntil(log.hitCountEquals(2));

    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .90);
    browser.waitUntil(log.hitCountEquals(3));

    const hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'Max Scroll');
    assert.strictEqual(hits[0].ea, 'increase');
    assert.strictEqual(hits[0].ev, '30');
    assert.strictEqual(hits[0].el, '30');
    assert.strictEqual(hits[1].ec, 'Max Scroll');
    assert.strictEqual(hits[1].ea, 'increase');
    assert.strictEqual(hits[1].ev, '25');
    assert.strictEqual(hits[1].el, '55');
    assert.strictEqual(hits[2].ec, 'Max Scroll');
    assert.strictEqual(hits[2].ea, 'increase');
    assert.strictEqual(hits[2].ev, '35');
    assert.strictEqual(hits[2].el, '90');
  });

  it('records max scroll percentage on a per-page basis', () => {
    browser.execute(ga.run, 'require', 'maxScrollTracker');

    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .25);
    browser.waitUntil(log.hitCountEquals(1));

    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .5);
    browser.waitUntil(log.hitCountEquals(2));

    browser.execute(ga.run, 'set', 'page', '/foo.html');
    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .75);
    browser.waitUntil(log.hitCountEquals(3));

    browser.execute(ga.run, 'set', 'page',
          '/test/e2e/fixtures/max-scroll-tracker.html');
    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .95);
    browser.waitUntil(log.hitCountEquals(4));

    const hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'Max Scroll');
    assert.strictEqual(hits[0].ea, 'increase');
    assert.strictEqual(hits[0].ev, '25');
    assert.strictEqual(hits[0].el, '25');
    assert.strictEqual(hits[1].ec, 'Max Scroll');
    assert.strictEqual(hits[1].ea, 'increase');
    assert.strictEqual(hits[1].ev, '25');
    assert.strictEqual(hits[1].el, '50');
    assert.strictEqual(hits[2].dp, '/foo.html');
    assert.strictEqual(hits[2].ec, 'Max Scroll');
    assert.strictEqual(hits[2].ea, 'increase');
    assert.strictEqual(hits[2].ev, '75');
    assert.strictEqual(hits[2].el, '75');
    assert.strictEqual(hits[3].dp,
        '/test/e2e/fixtures/max-scroll-tracker.html');
    assert.strictEqual(hits[3].ec, 'Max Scroll');
    assert.strictEqual(hits[3].ea, 'increase');
    assert.strictEqual(hits[3].ev, '45');
    assert.strictEqual(hits[3].el, '95');
  });

  it('sends events as nonInteraction by default', () => {
    browser.execute(ga.run, 'require', 'maxScrollTracker');

    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .50);
    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].ni, '1');
  });

  it('does not send events if the session has timed out', () => {
    browser.execute(ga.run, 'require', 'maxScrollTracker');

    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .25);
    browser.waitUntil(log.hitCountEquals(1));

    expireSession();
    log.removeHits();

    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .5);
    browser.pause(DEBOUNCE_TIMEOUT);

    log.assertNoHitsReceived();
  });

  it('does not report cross-session even with corrupt store data', () => {
    browser.execute(ga.run, 'require', 'maxScrollTracker');

    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .25);
    browser.waitUntil(log.hitCountEquals(1));

    corruptSession();

    // Scrolling here should clear the corrupt data but not send a hit.
    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .5);
    browser.pause(DEBOUNCE_TIMEOUT);

    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .75);
    browser.pause(DEBOUNCE_TIMEOUT);

    browser.waitUntil(log.hitCountEquals(3));

    const hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'Max Scroll');
    assert.strictEqual(hits[0].ea, 'increase');
    assert.strictEqual(hits[0].ev, '25');
    assert.strictEqual(hits[0].el, '25');
    assert.strictEqual(hits[1].ec, 'Max Scroll');
    assert.strictEqual(hits[1].ea, 'increase');
    assert.strictEqual(hits[1].ev, '50');
    assert.strictEqual(hits[1].el, '50');
    assert.strictEqual(hits[2].ec, 'Max Scroll');
    assert.strictEqual(hits[2].ea, 'increase');
    assert.strictEqual(hits[2].ev, '25');
    assert.strictEqual(hits[2].el, '75');
  });

  it('only sends new events after max scroll passes the thereshold', () => {
    browser.execute(ga.run, 'require', 'maxScrollTracker');

    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .10);
    browser.pause(DEBOUNCE_TIMEOUT);
    log.assertNoHitsReceived();

    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .25);
    browser.waitUntil(log.hitCountEquals(1));
    log.removeHits();

    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .40);
    browser.pause(DEBOUNCE_TIMEOUT);
    log.assertNoHitsReceived();
  });

  it('sends an event if max scroll reaches 100 regardless of threshold', () => {
    browser.execute(ga.run, 'require', 'maxScrollTracker');

    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .95);
    browser.waitUntil(log.hitCountEquals(1));

    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT));
    browser.waitUntil(log.hitCountEquals(2));

    const hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'Max Scroll');
    assert.strictEqual(hits[0].ea, 'increase');
    assert.strictEqual(hits[0].ev, '95');
    assert.strictEqual(hits[0].el, '95');
    assert.strictEqual(hits[1].ec, 'Max Scroll');
    assert.strictEqual(hits[1].ea, 'increase');
    assert.strictEqual(hits[1].ev, '5');
    assert.strictEqual(hits[1].el, '100');
  });

  it('supports customizing the increase threshold', () => {
    browser.execute(ga.run, 'require', 'maxScrollTracker', {
      increaseThreshold: 10,
    });

    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .05);
    browser.pause(DEBOUNCE_TIMEOUT);
    log.assertNoHitsReceived();

    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .1);
    browser.waitUntil(log.hitCountEquals(1));
    log.removeHits();
  });

  it('sends the increase amount as a custom metric if set', () => {
    browser.execute(ga.run, 'require', 'maxScrollTracker', {
      maxScrollMetricIndex: 1,
    });

    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .5);
    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].ev, '50');
    assert.strictEqual(hits[0].cm1, '50');
  });

  it('supports customizing any field via the fieldsObj', () => {
    browser.execute(ga.run, 'require', 'maxScrollTracker', {
      fieldsObj: {
        nonInteraction: null,
      },
    });
    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .25);
    browser.waitUntil(log.hitCountEquals(1));

    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .75);
    browser.waitUntil(log.hitCountEquals(2));

    const hits = log.getHits();
    assert.strictEqual(hits[0].ev, '25');
    assert.strictEqual(hits[0].el, '25');
    assert.strictEqual(hits[0].ni, undefined);
    assert.strictEqual(hits[1].ev, '50');
    assert.strictEqual(hits[1].el, '75');
    assert.strictEqual(hits[1].ni, undefined);
  });

  it('supports specifying a hit filter', () => {
    browser.execute(requireMaxScrollTracker_hitFilter);
    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .25);
    browser.waitUntil(log.hitCountEquals(1));

    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .75);
    browser.waitUntil(log.hitCountEquals(2));

    const hits = log.getHits();
    assert.strictEqual(hits[0].ev, '25');
    assert.strictEqual(hits[0].el, '25');
    assert.strictEqual(hits[0].cd1, '25');
    assert.strictEqual(hits[1].ev, '50');
    assert.strictEqual(hits[1].el, '75');
    assert.strictEqual(hits[1].cd1, '50');
  });

  it('includes usage params with all hits', () => {
    browser.execute(ga.run, 'require', 'maxScrollTracker');
    browser.execute(ga.run, 'send', 'pageview');
    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].did, constants.DEV_ID);
    assert.strictEqual(hits[0][constants.VERSION_PARAM], pkg.version);

    // '200' = '1000000000' in hex
    assert.strictEqual(hits[0][constants.USAGE_PARAM], '200');
  });

  describe('remove', () => {
    it('destroys all bound events and functionality', () => {
      browser.execute(ga.run, 'require', 'maxScrollTracker');
      browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .25);
      browser.waitUntil(log.hitCountEquals(1));
      log.removeHits();

      browser.execute(ga.run, 'maxScrollTracker:remove');

      // This resize would trigger a change event
      // if the plugin hadn't been removed.
      browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .75);

      log.assertNoHitsReceived();
    });
  });
});


// TODO(philipwalton): most likely in a unit test.
// it('stops listening once the max scroll has reached 100%');
// it('restarts listening when a new page is loaded');


/**
 * Since function objects can't be passed via parameters from server to
 * client, this one-off function must be used to set the value for
 * `hitFilter`.
 */
function requireMaxScrollTracker_hitFilter() {
  ga('require', 'maxScrollTracker', {
    hitFilter: (model) => {
      const increaseAmount = model.get('eventValue');
      model.set('dimension1', String(increaseAmount), true);
    },
  });
}


/**
 * Manually clear all stores.
 */
function clearStorage() {
  setStoreData('autotrack:UA-12345-1:session', {});
  setStoreData('autotrack:UA-12345-1:plugins/max-scroll-tracker', {});
}


/**
 * Manually expires the session.
 */
function expireSession() {
  setStoreData('autotrack:UA-12345-1:session', {isExpired: true});
}


/**
 * Update the session ID and time to simulate a situation where the plugin's
 * store data gets out of sync with the session store.
 */
function corruptSession() {
  setStoreData('autotrack:UA-12345-1:session', {
    id: 'new-id',
    hitTime: +new Date,
    isExpired: false,
  });
}


/**
 * Manually set a value for store in all open windows/tabs.
 * @param {string} key
 * @param {!Object} value
 */
function setStoreData(key, value) {
  browser.execute((key, value) => {
    const oldValue = localStorage.getItem(key);
    const newValue = JSON.stringify(value);

    // IE11 doesn't support event constructors.
    try {
      // Set the value on localStorage so it triggers the storage event in
      // other tabs. Also, manually dispatch the event in this tab since just
      // writing to localStorage won't update the locally cached values.
      window.localStorage.setItem(key, newValue);
      window.dispatchEvent(
          new StorageEvent('storage', {key, oldValue, newValue}));
    } catch(err) {
      // Do nothing
    }
  }, key, value);
}
