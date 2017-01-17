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


describe('eventTracker', function() {
  this.retries(4);

  before(function() {
    browser.url('/test/event-tracker.html');
  });

  beforeEach(function() {
    testId = uuid();
    log = utilities.bindLogAccessors(testId);

    browser.execute(ga.run, 'create', 'UA-XXXXX-Y', 'auto');
    browser.execute(ga.logHitData, testId);
  });

  afterEach(function() {
    log.removeHits();
    browser.execute(ga.run, 'eventTracker:remove');
    browser.execute(ga.run, 'remove');
  });

  it('supports declarative event binding to DOM elements', function() {
    browser.execute(ga.run, 'require', 'eventTracker');
    browser.click('#click-test');
    browser.waitUntil(log.hitCountEquals(1));

    var hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'foo');
    assert.strictEqual(hits[0].ea, 'bar');
    assert.strictEqual(hits[0].el, 'qux');
    assert.strictEqual(hits[0].ev, '42');
    assert.strictEqual(hits[0].cd1, 'baz');
    assert.strictEqual(hits[0].ni, '1');
  });

  it('supports customizing the attribute prefix', function() {
    browser.execute(ga.run, 'require', 'eventTracker', {
      attributePrefix: 'data-ga-'
    });
    browser.click('#custom-prefix');
    browser.waitUntil(log.hitCountEquals(1));

    var hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'foo');
    assert.strictEqual(hits[0].ea, 'bar');
  });

  it('supports non-event hit types', function() {
    browser.execute(ga.run, 'require', 'eventTracker');
    browser.click('#social-hit-type');
    browser.click('#pageview-hit-type');
    browser.waitUntil(log.hitCountEquals(2));

    var hits = log.getHits();
    assert.strictEqual(hits[0].t, 'social');
    assert.strictEqual(hits[0].sn, 'Facebook');
    assert.strictEqual(hits[0].sa, 'like');
    assert.strictEqual(hits[0].st, 'me');
    assert.strictEqual(hits[1].t, 'pageview');
    assert.strictEqual(hits[1].dp, '/foobar.html');
  });

  it('supports customizing what events to listen for', function() {
    browser.execute(ga.run, 'require', 'eventTracker', {
      events: ['submit']
    });
    browser.click('#click-test');
    browser.click('#submit-test');
    browser.waitUntil(log.hitCountEquals(1));

    var hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'Forms');
    assert.strictEqual(hits[0].ea, 'submit');

    browser.url('/test/event-tracker.html');
  });

  it('supports specifying a fields object for all hits', function() {
    browser.execute(ga.run, 'require', 'eventTracker', {
      fieldsObj: {
        nonInteraction: true,
        dimension1: 'foo',
        dimension2: 'bar'
      }
    });
    browser.click('#social-hit-type');
    browser.waitUntil(log.hitCountEquals(1));

    var hits = log.getHits();
    assert.strictEqual(hits[0].ni, '1');
    assert.strictEqual(hits[0].cd1, 'foo');
    assert.strictEqual(hits[0].cd2, 'bar');
  });

  it('supports specifying a hit filter', function() {
    browser.execute(requireEventTrackerWithHitFilter);
    browser.click('#click-test');
    browser.click('#pageview-hit-type');
    browser.click('#social-hit-type');
    browser.waitUntil(log.hitCountEquals(1));

    var hits = log.getHits();
    assert.strictEqual(hits[0].ni, '1');
    assert.strictEqual(hits[0].cd1, 'foo');
    assert.strictEqual(hits[0].cd2, 'bar');
  });

  it('includes usage params with all hits', function() {
    browser.execute(ga.run, 'require', 'eventTracker');
    browser.execute(ga.run, 'send', 'pageview');
    browser.waitUntil(log.hitCountEquals(1));

    var hits = log.getHits();
    assert.strictEqual(hits[0].did, constants.DEV_ID);
    assert.strictEqual(hits[0][constants.VERSION_PARAM], pkg.version);

    // '2' = '0000000010' in hex
    assert.strictEqual(hits[0][constants.USAGE_PARAM], '2');
  });

  describe('remove', function() {
    it('destroys all bound events and functionality', function() {
      browser.execute(ga.run, 'require', 'eventTracker');
      browser.click('#click-test');
      browser.waitUntil(log.hitCountEquals(1));
      assert.strictEqual(log.getHits()[0].t, 'event');

      log.removeHits();
      browser.execute(ga.run, 'eventTracker:remove');
      browser.click('#pageview-hit-type');
      log.assertNoHitsReceived();
    });
  });
});


/**
 * Since function objects can't be passed via parameters from server to
 * client, this one-off function must be used to set the value for
 * `hitFilter`.
 */
function requireEventTrackerWithHitFilter() {
  ga('require', 'eventTracker', {
    hitFilter: function(model, element) {
      if (element.id != 'social-hit-type') {
        throw 'Aborting non-social hits';
      }
      else {
        model.set('nonInteraction', true, true);
        model.set('dimension1', 'foo', true);
        model.set('dimension2', 'bar', true);
      }
    }
  });
}
