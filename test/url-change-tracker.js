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


describe('urlTracker', function() {
  this.retries(4);

  before(function() {
    browser.url('/test/url-change-tracker.html');
  });

  beforeEach(function() {
    testId = uuid();
    log = utilities.bindLogAccessors(testId);

    browser.execute(ga.run, 'create', 'UA-XXXXX-Y', 'auto');
    browser.execute(ga.logHitData, testId);
  });

  afterEach(function () {
    browser.execute(ga.run, 'urlChangeTracker:remove');
    browser.execute(ga.run, 'remove');
    log.removeHits();
  });

  it('captures URL changes via pushState and popstate', function() {
    browser.execute(ga.run, 'require', 'urlChangeTracker');

    browser.click('#foo');
    assert.strictEqual(browser.url().value, baseUrl + '/test/foo.html');

    browser.click('#bar');
    assert.strictEqual(browser.url().value, baseUrl + '/test/bar.html');

    browser.click('#qux');
    assert.strictEqual(browser.url().value, baseUrl + '/test/qux.html');

    browser.back();
    assert.strictEqual(browser.url().value, baseUrl + '/test/bar.html');

    browser.back();
    assert.strictEqual(browser.url().value, baseUrl + '/test/foo.html');

    browser.back();
    assert.strictEqual(browser.url().value,
        baseUrl + '/test/url-change-tracker.html');

    browser.waitUntil(log.hitCountEquals(6));

    var hits = log.getHits();
    assert.strictEqual(hits[0].dp, '/test/foo.html');
    assert.strictEqual(hits[0].dt, 'Foo');
    assert.strictEqual(hits[1].dp, '/test/bar.html');
    assert.strictEqual(hits[1].dt, 'Bar');
    assert.strictEqual(hits[2].dp, '/test/qux.html');
    assert.strictEqual(hits[2].dt, 'Qux');
    assert.strictEqual(hits[3].dp, '/test/bar.html');
    assert.strictEqual(hits[3].dt, 'Bar');
    assert.strictEqual(hits[4].dp, '/test/foo.html');
    assert.strictEqual(hits[4].dt, 'Foo');
    assert.strictEqual(hits[5].dp, '/test/url-change-tracker.html');
    assert.strictEqual(hits[5].dt, 'Home');
  });

  it('updates the tracker but does not send hits when using replaceState',
      function() {
    browser.execute(ga.run, 'require', 'urlChangeTracker');

    browser.click('#replace');
    assert.strictEqual(browser.url().value, baseUrl + '/test/replaced.html');
    browser.execute(ga.run, 'send', 'data');
    browser.waitUntil(log.hitCountEquals(1));

    var hits = log.getHits();
    assert.strictEqual(hits[0].dp, '/test/replaced.html');
    assert.notStrictEqual(hits[0].t, 'pageview');

    browser.click('#restore');
  });

  it('does not capture hash changes', function() {
    browser.execute(ga.run, 'require', 'urlChangeTracker');

    browser.click('#hash');
    assert.strictEqual(browser.url().value,
        baseUrl + '/test/url-change-tracker.html#hash');

    browser.back();
    assert.strictEqual(browser.url().value,
        baseUrl + '/test/url-change-tracker.html');

    log.assertNoHitsReceived();
  });

  it('supports customizing what is considered a change', function() {
    browser.execute(requireUrlChangeTrackerTracker_shouldTrackUrlChange);

    browser.click('#foo');
    assert.strictEqual(browser.url().value, baseUrl + '/test/foo.html');

    browser.click('#bar');
    assert.strictEqual(browser.url().value, baseUrl + '/test/bar.html');

    browser.back();
    assert.strictEqual(browser.url().value, baseUrl + '/test/foo.html');

    browser.back();
    assert.strictEqual(browser.url().value,
        baseUrl + '/test/url-change-tracker.html');

    browser.waitUntil(log.hitCountEquals(2));

    var hits = log.getHits();
    assert.strictEqual(hits[0].dp, '/test/foo.html');
    assert.strictEqual(hits[0].dt, 'Foo');
    assert.strictEqual(hits[1].dp, '/test/url-change-tracker.html');
    assert.strictEqual(hits[1].dt, 'Home');
  });

  it('supports customizing any field via the fieldsObj', function() {
    browser.execute(ga.run, 'require', 'urlChangeTracker', {
      fieldsObj: {
        dimension1: 'urlChangeTracker'
      }
    });

    browser.click('#foo');
    assert.strictEqual(browser.url().value, baseUrl + '/test/foo.html');

    browser.back();
    assert.strictEqual(browser.url().value,
        baseUrl + '/test/url-change-tracker.html');

    browser.waitUntil(log.hitCountEquals(2));

    var hits = log.getHits();
    assert.strictEqual(hits[0].dp, '/test/foo.html');
    assert.strictEqual(hits[0].dt, 'Foo');
    assert.strictEqual(hits[0].cd1, 'urlChangeTracker');
    assert.strictEqual(hits[1].dp, '/test/url-change-tracker.html');
    assert.strictEqual(hits[1].dt, 'Home');
    assert.strictEqual(hits[1].cd1, 'urlChangeTracker');
  });

  it('supports specifying a hit filter', function() {


    browser.execute(requireUrlChangeTrackerTracker_hitFilter);

    browser.click('#foo');
    assert.strictEqual(browser.url().value, baseUrl + '/test/foo.html');

    browser.back();
    assert.strictEqual(browser.url().value,
        baseUrl + '/test/url-change-tracker.html');

    browser.waitUntil(log.hitCountEquals(1));

    var hits = log.getHits();
    assert.strictEqual(hits[0].dp, '/test/url-change-tracker.html');
    assert.strictEqual(hits[0].dt, 'Home');
    assert.strictEqual(hits[0].cd1, 'urlChangeTracker');
  });

  it('includes usage params with all hits', function() {
    browser.execute(ga.run, 'require', 'urlChangeTracker');
    browser.execute(ga.run, 'send', 'pageview');
    browser.waitUntil(log.hitCountEquals(1));

    var hits = log.getHits();
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
    shouldTrackUrlChange: function(newPath) {
      return newPath.indexOf('bar') < 0;
    }
  });
}


/**
 * Since function objects can't be passed via parameters from server to
 * client, this one-off function must be used to set the value for
 * `hitFilter`.
 */
function requireUrlChangeTrackerTracker_hitFilter() {
  ga('require', 'urlChangeTracker', {
    hitFilter: function(model) {
      var title = model.get('title');
      if (title == 'Foo') {
        throw 'Exclude Foo pages';
      }
      else {
        model.set('dimension1', 'urlChangeTracker', true);
      }
    }
  });
}
