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


let testId;
let log;


describe('cleanUrlTracker', function() {
  this.retries(4);

  before(() => browser.url('/test/e2e/fixtures/autotrack.html'));

  beforeEach(() => {
    testId = uuid();
    log = bindLogAccessors(testId);

    browser.execute(ga.run, 'create', DEFAULT_TRACKER_FIELDS);
    browser.execute(ga.logHitData, testId);
  });

  afterEach(() => {
    log.removeHits();
    browser.execute(ga.run, 'cleanUrlTracker:remove');
    browser.execute(ga.run, 'remove');
  });

  it('sets the page field but does not modify the path by default', () => {
    const url = 'https://example.com/foo/bar?q=qux&b=baz#hash';
    browser.execute(ga.run, 'set', 'location', url);
    browser.execute(ga.run, 'require', 'cleanUrlTracker');

    browser.execute(ga.run, 'send', 'pageview');
    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].dl, url);
    assert.strictEqual(hits[0].dp, '/foo/bar?q=qux&b=baz');
  });

  it('cleans URLs in all hits, not just the initial pageview', () => {
    const url = 'https://example.com/foo/bar?q=qux&b=baz#hash';
    browser.execute(ga.run, 'set', 'location', url);
    browser.execute(ga.run, 'require', 'cleanUrlTracker', {
      stripQuery: true,
      queryDimensionIndex: 1,
    });
    browser.execute(ga.run, 'send', 'pageview');
    browser.execute(ga.run, 'set', 'page', '/updated?query=new' );
    browser.execute(ga.run, 'send', 'pageview');
    browser.execute(ga.run, 'set', 'page', '/more/updated?query=newest' );
    browser.execute(ga.run, 'send', 'event');
    browser.execute(ga.run, 'set', 'page', '/final#ly' );
    browser.execute(ga.run, 'send', 'event');
    browser.waitUntil(log.hitCountEquals(4));

    const hits = log.getHits();
    assert.strictEqual(hits[0].dp, '/foo/bar');
    assert.strictEqual(hits[0].cd1, 'q=qux&b=baz');
    assert.strictEqual(hits[1].dp, '/updated');
    assert.strictEqual(hits[1].cd1, 'query=new');
    assert.strictEqual(hits[2].dp, '/more/updated');
    assert.strictEqual(hits[2].cd1, 'query=newest');
    assert.strictEqual(hits[3].dp, '/final');
    assert.strictEqual(hits[3].cd1, constants.NULL_DIMENSION);
  });

  it('cleans both set and sent URL fields', () => {
    const url = 'https://example.com/foo/bar?q=qux&b=baz#hash';
    browser.execute(ga.run, 'set', 'location', url);
    browser.execute(ga.run, 'require', 'cleanUrlTracker', {
      stripQuery: true,
      queryDimensionIndex: 1,
    });
    browser.execute(ga.run, 'send', 'pageview');
    browser.execute(ga.run, 'send', 'pageview', '/updated?query=new');

    browser.waitUntil(log.hitCountEquals(2));

    const hits = log.getHits();
    assert.strictEqual(hits[0].dl, url);
    assert.strictEqual(hits[0].dp, '/foo/bar');
    assert.strictEqual(hits[0].cd1, 'q=qux&b=baz');
    assert.strictEqual(hits[1].dl, url);
    assert.strictEqual(hits[1].dp, '/updated');
    assert.strictEqual(hits[1].cd1, 'query=new');
  });

  it('works with many options in conjunction with each other', () => {
    const url = 'https://example.com/path/to/index.html?q=qux&b=baz#hash';
    browser.execute(ga.run, 'set', 'location', url);
    browser.execute(requireCleanUrlTracker_multipleOpts);
    browser.execute(ga.run, 'send', 'pageview');
    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].dl,
        'https://example.io/path/to/index.html?q=qux&b=baz#hash');
    assert.strictEqual(hits[0].dp, '/path/to?q=qux');
    assert.strictEqual(hits[0].cd1, 'q=qux&b=baz');
  });

  it('includes usage params with all hits', () => {
    browser.execute(ga.run, 'require', 'cleanUrlTracker');
    browser.execute(ga.run, 'send', 'pageview');
    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].did, constants.DEV_ID);
    assert.strictEqual(hits[0][constants.VERSION_PARAM], pkg.version);

    // '1' = '0000000001' in hex
    assert.strictEqual(hits[0][constants.USAGE_PARAM], '1');
  });

  describe('remove', () => {
    it('destroys all bound events and functionality', () => {
      const url = 'https://example.com/foo/bar?q=qux&b=baz#hash';
      browser.execute(ga.run, 'set', 'location', url);
      browser.execute(ga.run, 'require', 'cleanUrlTracker', {
        stripQuery: true,
      });
      browser.execute(ga.run, 'send', 'pageview');
      browser.waitUntil(log.hitCountEquals(1));

      let hits = log.getHits();
      assert.strictEqual(hits[0].dl, url);
      assert.strictEqual(hits[0].dp, '/foo/bar');

      browser.execute(ga.run, 'cleanUrlTracker:remove');
      browser.execute(ga.run, 'set', 'page', '/updated?query=new' );
      browser.execute(ga.run, 'send', 'pageview');
      browser.waitUntil(log.hitCountEquals(2));

      hits = log.getHits();
      assert.strictEqual(hits[1].dl, url);
      assert.strictEqual(hits[1].dp, '/updated?query=new');
    });
  });
});


/**
 * Since function objects can't be passed via parameters from server to
 * client, this one-off function must be used to set the value for
 * `urlFieldsFilter`.
 */
function requireCleanUrlTracker_multipleOpts() {
  ga('require', 'cleanUrlTracker', {
    stripQuery: true,
    queryParamsWhitelist: ['q', 's'],
    queryDimensionIndex: 1,
    indexFilename: 'index.html',
    trailingSlash: 'remove',
    urlFieldsFilter: (fieldsObj, parseUrl) => {
      const url = parseUrl(fieldsObj.location);
      if (url.hostname == 'example.com') {
        fieldsObj.location =
            `${url.protocol}//example.io` +
            `${url.pathname}${url.search}${url.hash}`;
      }
      return fieldsObj;
    },
  });
}
