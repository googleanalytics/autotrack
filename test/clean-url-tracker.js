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


describe('cleanUrlTracker', function() {
  this.retries(4);

  before(function() {
    browser.url('/test/autotrack.html');
  });

  beforeEach(function() {
    testId = uuid();
    log = utilities.bindLogAccessors(testId);

    browser.execute(ga.run, 'create', 'UA-XXXXX-Y', 'auto');
    browser.execute(ga.logHitData, testId);
  });

  afterEach(function() {
    browser.execute(ga.run, 'cleanUrlTracker:remove');
    browser.execute(ga.run, 'remove');
    log.removeHits();
  });

  it('sets the page field but does not modify the path by default', function() {
    var url = 'https://example.com/foo/bar?q=qux&b=baz#hash';
    browser.execute(ga.run, 'set', 'location', url);
    browser.execute(ga.run, 'require', 'cleanUrlTracker');

    browser.execute(ga.run, 'send', 'pageview');
    browser.waitUntil(log.hitCountEquals(1));

    var hits = log.getHits();
    assert.strictEqual(hits[0].dl, url);
    assert.strictEqual(hits[0].dp, '/foo/bar?q=qux&b=baz');
  });

  it('supports removing the query string from the URL path', function() {
    var url = 'https://example.com/foo/bar?q=qux&b=baz#hash';
    browser.execute(ga.run, 'set', 'location', url);
    browser.execute(ga.run, 'require', 'cleanUrlTracker', {
      stripQuery: true
    });
    browser.execute(ga.run, 'send', 'pageview');
    browser.waitUntil(log.hitCountEquals(1));

    var hits = log.getHits();
    assert.strictEqual(hits[0].dl, url);
    assert.strictEqual(hits[0].dp, '/foo/bar');
  });

  it('optionally adds the query string as a custom dimension', function() {
    var url = 'https://example.com/foo/bar?q=qux&b=baz#hash';
    browser.execute(ga.run, 'set', 'location', url);
    browser.execute(ga.run, 'require', 'cleanUrlTracker', {
      stripQuery: true,
      queryDimensionIndex: 1,
    });
    browser.execute(ga.run, 'send', 'pageview');
    browser.waitUntil(log.hitCountEquals(1));

    var hits = log.getHits();
    assert.strictEqual(hits[0].dl, url);
    assert.strictEqual(hits[0].dp, '/foo/bar');
    assert.strictEqual(hits[0].cd1, 'q=qux&b=baz');
  });

  it('adds the null dimensions when no query string is found', function() {
    var url = 'https://example.com/foo/bar';
    browser.execute(ga.run, 'set', 'location', url);
    browser.execute(ga.run, 'require', 'cleanUrlTracker', {
      stripQuery: true,
      queryDimensionIndex: 1
    });
    browser.execute(ga.run, 'send', 'pageview');
    browser.waitUntil(log.hitCountEquals(1));

    var hits = log.getHits();
    assert.strictEqual(hits[0].dl, url);
    assert.strictEqual(hits[0].dp, '/foo/bar');
    assert.strictEqual(hits[0].cd1, constants.NULL_DIMENSION);
  });

  it('does not set a dimension if strip query is false', function() {
    var url = 'https://example.com/foo/bar?q=qux&b=baz#hash';
    browser.execute(ga.run, 'set', 'location', url);
    browser.execute(ga.run, 'require', 'cleanUrlTracker', {
      stripQuery: false,
      queryDimensionIndex: 1
    });
    browser.execute(ga.run, 'send', 'pageview');
    browser.waitUntil(log.hitCountEquals(1));

    var hits = log.getHits();
    assert.strictEqual(hits[0].dl, url);
    assert.strictEqual(hits[0].dp, '/foo/bar?q=qux&b=baz');
    assert.strictEqual(hits[0].cd1, undefined);
  });

  it('cleans URLs in all hits, not just the initial pageview', function() {
    var url = 'https://example.com/foo/bar?q=qux&b=baz#hash';
    browser.execute(ga.run, 'set', 'location', url);
    browser.execute(ga.run, 'require', 'cleanUrlTracker', {
      stripQuery: true,
      queryDimensionIndex: 1
    });
    browser.execute(ga.run, 'send', 'pageview');
    browser.execute(ga.run, 'set', 'page', '/updated?query=new' );
    browser.execute(ga.run, 'send', 'pageview');
    browser.execute(ga.run, 'set', 'page', '/more/updated?query=newest' );
    browser.execute(ga.run, 'send', 'event');
    browser.execute(ga.run, 'set', 'page', '/final#ly' );
    browser.execute(ga.run, 'send', 'event');
    browser.waitUntil(log.hitCountEquals(4));

    var hits = log.getHits();
    assert.strictEqual(hits[0].dp, '/foo/bar');
    assert.strictEqual(hits[0].cd1, 'q=qux&b=baz');
    assert.strictEqual(hits[1].dp, '/updated');
    assert.strictEqual(hits[1].cd1, 'query=new');
    assert.strictEqual(hits[2].dp, '/more/updated');
    assert.strictEqual(hits[2].cd1, 'query=newest');
    assert.strictEqual(hits[3].dp, '/final');
    assert.strictEqual(hits[3].cd1, constants.NULL_DIMENSION);
  });

  it('cleans both set and sent URL fields', function() {
    var url = 'https://example.com/foo/bar?q=qux&b=baz#hash';
    browser.execute(ga.run, 'set', 'location', url);
    browser.execute(ga.run, 'require', 'cleanUrlTracker', {
      stripQuery: true,
      queryDimensionIndex: 1
    });
    browser.execute(ga.run, 'send', 'pageview');
    browser.execute(ga.run, 'send', 'pageview', '/updated?query=new');

    browser.waitUntil(log.hitCountEquals(2));

    var hits = log.getHits();
    assert.strictEqual(hits[0].dl, url);
    assert.strictEqual(hits[0].dp, '/foo/bar');
    assert.strictEqual(hits[0].cd1, 'q=qux&b=baz');
    assert.strictEqual(hits[1].dl, url);
    assert.strictEqual(hits[1].dp, '/updated');
    assert.strictEqual(hits[1].cd1, 'query=new');
  });

  it('supports removing index filenames', function() {
    var url = 'https://example.com/foo/bar/index.html?q=qux&b=baz#hash';
    browser.execute(ga.run, 'set', 'location', url);
    browser.execute(ga.run, 'require', 'cleanUrlTracker', {
      indexFilename: 'index.html'
    });
    browser.execute(ga.run, 'send', 'pageview');
    browser.waitUntil(log.hitCountEquals(1));

    var hits = log.getHits();
    assert.strictEqual(hits[0].dp, '/foo/bar/?q=qux&b=baz');
  });

  it('only removes index filenames at the end of the URL after a slash',
      function() {
    var url = 'https://example.com/noindex.html';
    browser.execute(ga.run, 'set', 'location', url);
    browser.execute(ga.run, 'require', 'cleanUrlTracker', {
      indexFilename: 'index.html'
    });
    browser.execute(ga.run, 'send', 'pageview');
    browser.waitUntil(log.hitCountEquals(1));

    var hits = log.getHits();
    assert.strictEqual(hits[0].dp, '/noindex.html');
  });

  it('supports stripping trailing slashes', function() {
    var url = 'https://example.com/foo/bar/';
    browser.execute(ga.run, 'set', 'location', url);
    browser.execute(ga.run, 'require', 'cleanUrlTracker', {
      trailingSlash: 'remove'
    });
    browser.execute(ga.run, 'send', 'pageview');
    browser.waitUntil(log.hitCountEquals(1));

    var hits = log.getHits();
    assert.strictEqual(hits[0].dp, '/foo/bar');
  });

  it('supports adding trailing slashes to non-filename URLs', function() {
    var url = 'https://example.com/foo/bar?q=qux&b=baz#hash';
    browser.execute(ga.run, 'set', 'location', url);
    browser.execute(ga.run, 'require', 'cleanUrlTracker', {
      stripQuery: true,
      queryDimensionIndex: 1,
      trailingSlash: 'add'
    });
    browser.execute(ga.run, 'send', 'pageview');
    browser.execute(ga.run, 'set', 'page', '/foo/bar.html');
    browser.execute(ga.run, 'send', 'pageview');
    browser.waitUntil(log.hitCountEquals(2));

    var hits = log.getHits();
    assert.strictEqual(hits[0].dp, '/foo/bar/');
    assert.strictEqual(hits[1].dp, '/foo/bar.html');
  });

  it('works with many options in conjunction with each other', function() {
    var url = 'https://example.com/path/to/index.html?q=qux&b=baz#hash';
    browser.execute(ga.run, 'set', 'location', url);
    browser.execute(ga.run, 'require', 'cleanUrlTracker', {
      stripQuery: true,
      queryDimensionIndex: 1,
      indexFilename: 'index.html',
      trailingSlash: 'remove'
    });
    browser.execute(ga.run, 'send', 'pageview');
    browser.waitUntil(log.hitCountEquals(1));

    var hits = log.getHits();
    assert.strictEqual(hits[0].dp, '/path/to');
    assert.strictEqual(hits[0].cd1, 'q=qux&b=baz');
  });

  it('includes usage params with all hits', function() {
    browser.execute(ga.run, 'require', 'cleanUrlTracker');
    browser.execute(ga.run, 'send', 'pageview');
    browser.waitUntil(log.hitCountEquals(1));

    var hits = log.getHits();
    assert.strictEqual(hits[0].did, constants.DEV_ID);
    assert.strictEqual(hits[0][constants.VERSION_PARAM], pkg.version);

    // '1' = '0000000001' in hex
    assert.strictEqual(hits[0][constants.USAGE_PARAM], '1');
  });

  describe('remove', function() {
    it('destroys all bound events and functionality', function() {
      var url = 'https://example.com/foo/bar?q=qux&b=baz#hash';
      browser.execute(ga.run, 'set', 'location', url);
      browser.execute(ga.run, 'require', 'cleanUrlTracker', {
        stripQuery: true
      });
      browser.execute(ga.run, 'send', 'pageview');
      browser.waitUntil(log.hitCountEquals(1));

      var hits = log.getHits();
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
