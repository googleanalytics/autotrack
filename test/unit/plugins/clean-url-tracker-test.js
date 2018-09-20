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


import * as constants from '../../../lib/constants';
import '../../../lib/plugins/clean-url-tracker';


const DEFAULT_TRACKER_FIELDS = {
  trackingId: 'UA-12345-1',
  cookieDomain: 'auto',
  siteSpeedSampleRate: 0,
};


describe('CleanUrlTracker', () => {
  let tracker;
  let CleanUrlTracker;

  beforeEach((done) => {
    localStorage.clear();
    window.ga('create', DEFAULT_TRACKER_FIELDS);
    window.ga((t) => {
      tracker = t;
      CleanUrlTracker = window.gaplugins.CleanUrlTracker;
      done();
    });
  });

  afterEach(() => {
    localStorage.clear();
    window.ga('remove');
  });

  describe('constructor', () => {
    it('stores the tracker on the instance', () => {
      const cut = new CleanUrlTracker(tracker);
      assert.strictEqual(tracker, cut.tracker);

      cut.remove();
    });

    it('merges the passed options with the defaults', () => {
      let cut = new CleanUrlTracker(tracker);

      assert.deepEqual(cut.opts, {});
      cut.remove();

      const fn = () => {};
      const opts = {
        stripQuery: true,
        queryParamsWhitelist: ['q', 's'],
        queryDimensionIndex: 1,
        indexFilename: 'index.html',
        trailingSlash: 'remove',
        urlFilter: fn,
      };
      cut = new CleanUrlTracker(tracker, opts);
      assert.deepEqual(cut.opts, opts);
      cut.remove();
    });

    it('overrides the tracker\'s get method', () => {
      tracker.set('location', 'https://example.com/test?foo=bar');
      assert(!tracker.get('page'));

      const originalTrackerGet = tracker.get;
      const cut = new CleanUrlTracker(tracker, {
        stripQuery: true,
      });

      assert.notStrictEqual(tracker.get, originalTrackerGet);
      assert.strictEqual(tracker.get('page'), '/test');

      cut.remove();
    });

    it('overrides the tracker\'s buildHitTask function', () => {
      const originalTrackerGet = tracker.get('buildHitTask');
      const cut = new CleanUrlTracker(tracker);
      assert.notStrictEqual(tracker.get('buildHitTask'), originalTrackerGet);

      const spy = sinon.spy(cut, 'cleanUrlFields');
      tracker.send('pageview');

      assert(spy.calledOnce);

      cut.remove();
    });
  });

  describe('stripNonWhitelistedQueryParams', () => {
    it('returns a URL search string with only whitelisted params', () => {
      const cut = new CleanUrlTracker(tracker, {
        queryParamsWhitelist: ['q', 's'],
      });

      assert.strictEqual(
          cut.stripNonWhitelistedQueryParams('?gclid=foo'), '');
      assert.strictEqual(
          cut.stripNonWhitelistedQueryParams('?gclid=foo&q=1'), '?q=1');
      assert.strictEqual(
          cut.stripNonWhitelistedQueryParams('?q=1&gclid=foo'), '?q=1');
      assert.strictEqual(
          cut.stripNonWhitelistedQueryParams('?gclid=foo&q=1&s=2'),
          '?q=1&s=2');
      assert.strictEqual(
          cut.stripNonWhitelistedQueryParams('?q=1&gclid=foo&s=2'), '?q=1&s=2');
      assert.strictEqual(
          cut.stripNonWhitelistedQueryParams('?q=1&s=2&gclid=foo'), '?q=1&s=2');

      cut.remove();
    });

    it('does not modify URL encoded keys or values', () => {
      const cut = new CleanUrlTracker(tracker, {
        queryParamsWhitelist: ['q', 's'],
      });

      assert.strictEqual(
          cut.stripNonWhitelistedQueryParams('?gclid=foo&q=1%202'), '?q=1%202');

      cut.remove();
    });

    it('works with empty or missing param values', () => {
      const cut = new CleanUrlTracker(tracker, {
        queryParamsWhitelist: ['q', 's'],
      });

      assert.strictEqual(
          cut.stripNonWhitelistedQueryParams('?q=1&s=2&gclid=foo'), '?q=1&s=2');
      assert.strictEqual(
          cut.stripNonWhitelistedQueryParams('?q&s=&gclid=foo'), '');

      cut.remove();
    });

    it('works when the queryParamsWhitelist option is not set', () => {
      const cut = new CleanUrlTracker(tracker);

      assert.strictEqual(
          cut.stripNonWhitelistedQueryParams('?utm_source=foo'), '');
      assert.strictEqual(
          cut.stripNonWhitelistedQueryParams('?utm_source=foo&q=1'), '');
      assert.strictEqual(
          cut.stripNonWhitelistedQueryParams('?utm_source=foo&q=1&s=2'), '');

      cut.remove();
    });
  });

  describe('cleanUrlFields', () => {
    it('returns a fieldsObj with the URL fields set', () => {
      const cut = new CleanUrlTracker(tracker);
      const ret = cut.cleanUrlFields({
        location: 'https://example.com/test?foo=bar',
      });

      assert(typeof ret == 'object');
      assert(ret.hasOwnProperty('location'));
      assert(ret.hasOwnProperty('page'));

      cut.remove();
    });

    it('sets the page field but does not modify the path by default', () => {
      const cut = new CleanUrlTracker(tracker);
      const location = 'https://example.com/foo/bar?q=qux&b=baz#hash';

      assert.deepEqual(cut.cleanUrlFields({location}), {
        location,
        page: '/foo/bar?q=qux&b=baz',
      });

      cut.remove();
    });

    it('supports removing the query string from the URL path', () => {
      const cut = new CleanUrlTracker(tracker, {
        stripQuery: true,
      });
      const location = 'https://example.com/foo/bar?q=qux&b=baz#hash';

      assert.deepEqual(cut.cleanUrlFields({location}), {
        location,
        page: '/foo/bar',
      });

      cut.remove();
    });

    it('optionally returns the query string as a custom dimension', () => {
      const cut = new CleanUrlTracker(tracker, {
        stripQuery: true,
        queryDimensionIndex: 1,
      });
      const location = 'https://example.com/foo/bar?q=qux&b=baz#hash';

      assert.deepEqual(cut.cleanUrlFields({location}), {
        location,
        page: '/foo/bar',
        dimension1: 'q=qux&b=baz',
      });

      cut.remove();
    });

    it('returns the null dimensions when no query string is found', () => {
      const cut = new CleanUrlTracker(tracker, {
        stripQuery: true,
        queryDimensionIndex: 1,
      });
      const location = 'https://example.com/foo/bar';

      assert.deepEqual(cut.cleanUrlFields({location}), {
        location,
        page: '/foo/bar',
        dimension1: constants.NULL_DIMENSION,
      });

      cut.remove();
    });

    it('does not set a dimension if strip query is false', () => {
      const cut = new CleanUrlTracker(tracker, {
        stripQuery: false,
        queryDimensionIndex: 1,
      });
      const location = 'https://example.com/foo/bar?q=qux&b=baz#hash';

      assert.deepEqual(cut.cleanUrlFields({location}), {
        location,
        page: '/foo/bar?q=qux&b=baz',
      });

      cut.remove();
    });

    it('supports removing index filenames', () => {
      const cut = new CleanUrlTracker(tracker, {
        indexFilename: 'index.html',
      });
      const location =
          'https://example.com/foo/bar/index.html?q=qux&b=baz#hash';

      assert.deepEqual(cut.cleanUrlFields({location}), {
        location,
        page: '/foo/bar/?q=qux&b=baz',
      });

      cut.remove();
    });

    it('only removes index filenames at the end of the URL after a slash',
        () => {
      const cut = new CleanUrlTracker(tracker, {
        indexFilename: 'index.html',
      });
      const location = 'https://example.com/noindex.html';

      assert.deepEqual(cut.cleanUrlFields({location}), {
        location,
        page: '/noindex.html',
      });

      cut.remove();
    });

    it('supports stripping trailing slashes', () => {
      const cut = new CleanUrlTracker(tracker, {
        trailingSlash: 'remove',
      });
      const location = 'https://example.com/foo/bar/';

      assert.deepEqual(cut.cleanUrlFields({location}), {
        location,
        page: '/foo/bar',
      });

      cut.remove();
    });

    it('supports adding trailing slashes to non-filename URLs', () => {
      const cut = new CleanUrlTracker(tracker, {
        stripQuery: true,
        trailingSlash: 'add',
      });
      const location = 'https://example.com/foo/bar?q=qux&b=baz#hash';

      assert.deepEqual(cut.cleanUrlFields({location}), {
        location,
        page: '/foo/bar/',
      });

      assert.deepEqual(cut.cleanUrlFields({
        location,
        page: '/foo/bar.html',
      }), {
        location,
        page: '/foo/bar.html',
      });

      cut.remove();
    });

    it('supports programmatically filtering URL fields', () => {
      const cut = new CleanUrlTracker(tracker, {
        urlFieldsFilter: (fieldsObj, parseUrl) => {
          fieldsObj.page = parseUrl(fieldsObj.location).pathname;

          const url = parseUrl(fieldsObj.location);
          if (url.hostname == 'example.com') {
            fieldsObj.location =
                `${url.protocol}//example.io` +
                `${url.pathname}${url.search}${url.hash}`;
          }
          return fieldsObj;
        },
      });
      const location = 'https://example.com/foo/bar?q=qux&b=baz#hash';

      assert.deepEqual(cut.cleanUrlFields({location}), {
        location: 'https://example.io/foo/bar?q=qux&b=baz#hash',
        page: '/foo/bar',
      });

      cut.remove();
    });

    it('works with many options in conjunction with each other', () => {
      const cut = new CleanUrlTracker(tracker, {
        stripQuery: true,
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
      const location =
          'https://example.com/path/to/index.html?q=qux&b=baz#hash';

      assert.deepEqual(cut.cleanUrlFields({location}), {
        location: 'https://example.io/path/to/index.html?q=qux&b=baz#hash',
        page: '/path/to',
        dimension1: 'q=qux&b=baz',
      });

      cut.remove();
    });
  });

  describe('remove', () => {
    it('restores the tracker\'s get method', () => {
      const originalTrackerGet = tracker.get;
      const cut = new CleanUrlTracker(tracker);

      assert.notStrictEqual(tracker.get, originalTrackerGet);

      cut.remove();

      assert.strictEqual(tracker.get, originalTrackerGet);
    });

    it('restores the tracker\'s buildHitTask function', () => {
      const originalTrackerGet = tracker.get('buildHitTask');
      const cut = new CleanUrlTracker(tracker);
      assert.notStrictEqual(tracker.get('buildHitTask'), originalTrackerGet);

      cut.remove();

      assert.strictEqual(tracker.get('buildHitTask'), originalTrackerGet);
    });
  });
});
