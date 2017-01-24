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


const BASE_URL = browser.options.baseUrl;


let testId;
let log;


describe('urlTracker', function() {
  this.retries(4);

  before(() => browser.url('/test/e2e/fixtures/url-change-tracker.html'));

  beforeEach(() => {
    testId = uuid();
    log = bindLogAccessors(testId);

    browser.execute(ga.run, 'create', DEFAULT_TRACKER_FIELDS);
    browser.execute(ga.logHitData, testId);
  });

  afterEach(function() {
    browser.execute(ga.run, 'urlChangeTracker:remove');
    browser.execute(ga.run, 'remove');
    log.removeHits();
  });

  it('captures URL changes via pushState and popstate', () => {
    browser.execute(ga.run, 'require', 'urlChangeTracker');

    browser.click('#foo');
    assert.strictEqual(
        browser.url().value, `${BASE_URL}/test/e2e/fixtures/foo.html`);

    browser.click('#bar');
    assert.strictEqual(
        browser.url().value, `${BASE_URL}/test/e2e/fixtures/bar.html`);

    browser.click('#qux');
    assert.strictEqual(
        browser.url().value, `${BASE_URL}/test/e2e/fixtures/qux.html`);

    browser.back();
    assert.strictEqual(
        browser.url().value, `${BASE_URL}/test/e2e/fixtures/bar.html`);

    browser.back();
    assert.strictEqual(
        browser.url().value, `${BASE_URL}/test/e2e/fixtures/foo.html`);

    browser.back();
    assert.strictEqual(
        browser.url().value,
        `${BASE_URL}/test/e2e/fixtures/url-change-tracker.html`);

    browser.waitUntil(log.hitCountEquals(6));

    const hits = log.getHits();
    assert.strictEqual(hits[0].dp, '/test/e2e/fixtures/foo.html');
    assert.strictEqual(hits[0].dt, 'Foo');
    assert.strictEqual(hits[1].dp, '/test/e2e/fixtures/bar.html');
    assert.strictEqual(hits[1].dt, 'Bar');
    assert.strictEqual(hits[2].dp, '/test/e2e/fixtures/qux.html');
    assert.strictEqual(hits[2].dt, 'Qux');
    assert.strictEqual(hits[3].dp, '/test/e2e/fixtures/bar.html');
    assert.strictEqual(hits[3].dt, 'Bar');
    assert.strictEqual(hits[4].dp, '/test/e2e/fixtures/foo.html');
    assert.strictEqual(hits[4].dt, 'Foo');
    assert.strictEqual(hits[5].dp,
        '/test/e2e/fixtures/url-change-tracker.html');
    assert.strictEqual(hits[5].dt, 'Home');
  });

  it('updates the tracker but does not send hits when using replaceState',
      () => {
    browser.execute(ga.run, 'require', 'urlChangeTracker');

    browser.click('#replace');
    assert.strictEqual(
        browser.url().value, `${BASE_URL}/test/e2e/fixtures/replaced.html`);
    browser.execute(ga.run, 'send', 'data');
    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].dp, '/test/e2e/fixtures/replaced.html');
    assert.notStrictEqual(hits[0].t, 'pageview');

    browser.click('#restore');
  });

  it('does not capture hash changes', () => {
    browser.execute(ga.run, 'require', 'urlChangeTracker');

    browser.click('#hash');
    assert.strictEqual(browser.url().value,
        `${BASE_URL}/test/e2e/fixtures/url-change-tracker.html#hash`);

    browser.back();
    assert.strictEqual(browser.url().value,
        `${BASE_URL}/test/e2e/fixtures/url-change-tracker.html`);

    log.assertNoHitsReceived();
  });

  it('supports customizing what is considered a change', () => {
    browser.execute(requireUrlChangeTrackerTracker_shouldTrackUrlChange);

    browser.click('#foo');
    assert.strictEqual(browser.url().value,
        `${BASE_URL}/test/e2e/fixtures/foo.html`);

    browser.click('#bar');
    assert.strictEqual(browser.url().value,
        `${BASE_URL}/test/e2e/fixtures/bar.html`);

    browser.back();
    assert.strictEqual(browser.url().value,
        `${BASE_URL}/test/e2e/fixtures/foo.html`);

    browser.back();
    assert.strictEqual(
        browser.url().value,
        `${BASE_URL}/test/e2e/fixtures/url-change-tracker.html`);

    browser.waitUntil(log.hitCountEquals(2));

    const hits = log.getHits();
    assert.strictEqual(hits[0].dp, '/test/e2e/fixtures/foo.html');
    assert.strictEqual(hits[0].dt, 'Foo');
    assert.strictEqual(hits[1].dp,
        '/test/e2e/fixtures/url-change-tracker.html');
    assert.strictEqual(hits[1].dt, 'Home');
  });

  it('supports customizing any field via the fieldsObj', () => {
    browser.execute(ga.run, 'require', 'urlChangeTracker', {
      fieldsObj: {
        dimension1: 'urlChangeTracker',
      },
    });

    browser.click('#foo');
    assert.strictEqual(
        browser.url().value, `${BASE_URL}/test/e2e/fixtures/foo.html`);

    browser.back();
    assert.strictEqual(
        browser.url().value,
        `${BASE_URL}/test/e2e/fixtures/url-change-tracker.html`);

    browser.waitUntil(log.hitCountEquals(2));

    const hits = log.getHits();
    assert.strictEqual(hits[0].dp, '/test/e2e/fixtures/foo.html');
    assert.strictEqual(hits[0].dt, 'Foo');
    assert.strictEqual(hits[0].cd1, 'urlChangeTracker');
    assert.strictEqual(hits[1].dp,
        '/test/e2e/fixtures/url-change-tracker.html');
    assert.strictEqual(hits[1].dt, 'Home');
    assert.strictEqual(hits[1].cd1, 'urlChangeTracker');
  });

  it('supports specifying a hit filter', () => {
    browser.execute(requireUrlChangeTrackerTracker_hitFilter);

    browser.click('#foo');
    assert.strictEqual(
        browser.url().value, `${BASE_URL}/test/e2e/fixtures/foo.html`);

    browser.back();
    assert.strictEqual(
        browser.url().value,
        `${BASE_URL}/test/e2e/fixtures/url-change-tracker.html`);

    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].dp,
        '/test/e2e/fixtures/url-change-tracker.html');
    assert.strictEqual(hits[0].dt, 'Home');
    assert.strictEqual(hits[0].cd1, 'urlChangeTracker');
  });

  it('includes usage params with all hits', () => {
    browser.execute(ga.run, 'require', 'urlChangeTracker');
    browser.execute(ga.run, 'send', 'pageview');
    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].did, constants.DEV_ID);
    assert.strictEqual(hits[0][constants.VERSION_PARAM], pkg.version);

    // '100' = '0100000000' in hex
    assert.strictEqual(hits[0][constants.USAGE_PARAM], '100');
  });
});


/**
 * Since function objects can't be passed via parameters from server to
 * client, this one-off function must be used to set the value for
 * `shouldTrackOutboundForm`.
 */
function requireUrlChangeTrackerTracker_shouldTrackUrlChange() {
  ga('require', 'urlChangeTracker', {
    shouldTrackUrlChange: (newPath) => {
      return newPath.indexOf('bar') < 0;
    },
  });
}


/**
 * Since function objects can't be passed via parameters from server to
 * client, this one-off function must be used to set the value for
 * `hitFilter`.
 */
function requireUrlChangeTrackerTracker_hitFilter() {
  ga('require', 'urlChangeTracker', {
    hitFilter: (model) => {
      const title = model.get('title');
      if (title == 'Foo') {
        throw new Error('Exclude Foo pages');
      } else {
        model.set('dimension1', 'urlChangeTracker', true);
      }
    },
  });
}
