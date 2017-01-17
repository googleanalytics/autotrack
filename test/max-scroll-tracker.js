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


var assert = require('assert');
var uuid = require('uuid');
var ga = require('./analytics');
var utilities = require('./utilities');
var constants = require('../lib/constants');
var pkg = require('../package.json');


var DEFAULT_TRACKER_FIELDS = {
  trackingId: 'UA-12345-1',
  cookieDomain: 'auto',
  siteSpeedSampleRate: 0,
};


var testId;
var log;


var PAGE_HEIGHT = 5000;
var WINDOW_HEIGHT = 500;
var DEBOUNCE_TIMEOUT = 500;



describe('maxScrollTracker', function() {
  if (process.env.CI) this.retries(4);

  before(function() {
    browser.url('/test/max-scroll-tracker.html');
    browser.setViewportSize({width: 500, height: WINDOW_HEIGHT});
  });

  beforeEach(function() {
    testId = uuid();
    log = utilities.bindLogAccessors(testId);

    browser.scroll(0, 0);
    browser.execute(function() {
      localStorage.clear();
    });

    browser.execute(ga.run, 'create', DEFAULT_TRACKER_FIELDS);
    browser.execute(ga.logHitData, testId);
  });

  afterEach(function() {
    log.removeHits();
    browser.execute(ga.run, 'maxScrollTracker:remove');
    browser.execute(ga.run, 'remove');
  });

  it('sends events as the scroll percentage increases', function() {
    browser.execute(ga.run, 'require', 'maxScrollTracker');

    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .30);
    browser.waitUntil(log.hitCountEquals(1));

    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .55);
    browser.waitUntil(log.hitCountEquals(2));

    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .90);
    browser.waitUntil(log.hitCountEquals(3));

    var hits = log.getHits();
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

  it('records max scroll percentage on a per-page basis', function() {
    browser.execute(ga.run, 'require', 'maxScrollTracker');

    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .25);
    browser.waitUntil(log.hitCountEquals(1));

    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .5);
    browser.waitUntil(log.hitCountEquals(2));

    browser.execute(ga.run, 'set', 'page', '/foo.html');
    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .75);
    browser.waitUntil(log.hitCountEquals(3));

    browser.execute(ga.run, 'set', 'page', '/test/max-scroll-tracker.html');
    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .95);
    browser.waitUntil(log.hitCountEquals(4));

    var hits = log.getHits();
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
    assert.strictEqual(hits[3].dp, '/test/max-scroll-tracker.html');
    assert.strictEqual(hits[3].ec, 'Max Scroll');
    assert.strictEqual(hits[3].ea, 'increase');
    assert.strictEqual(hits[3].ev, '45');
    assert.strictEqual(hits[3].el, '95');
  });

  it('does not send events if the session has timed out', function() {
    browser.execute(ga.run, 'require', 'maxScrollTracker');

    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .25);
    browser.waitUntil(log.hitCountEquals(1));

    expireSession();
    log.removeHits();

    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .5);
    browser.pause(DEBOUNCE_TIMEOUT);

    log.assertNoHitsReceived();
  });

  it('only sends new events after max scroll passes the thereshold',
      function() {
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

  it('sends an event if max scroll reaches 100 regardless of threshold',
      function() {
    browser.execute(ga.run, 'require', 'maxScrollTracker');

    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .95);
    browser.waitUntil(log.hitCountEquals(1));

    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT));
    browser.waitUntil(log.hitCountEquals(2));

    var hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'Max Scroll');
    assert.strictEqual(hits[0].ea, 'increase');
    assert.strictEqual(hits[0].ev, '95');
    assert.strictEqual(hits[0].el, '95');
    assert.strictEqual(hits[1].ec, 'Max Scroll');
    assert.strictEqual(hits[1].ea, 'increase');
    assert.strictEqual(hits[1].ev, '5');
    assert.strictEqual(hits[1].el, '100');
  });

  it('supports customizing the increase threshold', function() {
    browser.execute(ga.run, 'require', 'maxScrollTracker', {
      increaseThreshold: 10
    });

    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .05);
    browser.pause(DEBOUNCE_TIMEOUT);
    log.assertNoHitsReceived();

    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .1);
    browser.waitUntil(log.hitCountEquals(1));
    log.removeHits();
  });

  it('ignores the query portion of the URL unless told not to', function() {
    browser.execute(ga.run, 'require', 'maxScrollTracker');

    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .25);
    browser.waitUntil(log.hitCountEquals(1));
    var hits = log.getHits();

    assert.strictEqual(hits[0].ev, '25');
    assert.strictEqual(hits[0].el, '25');

    browser.execute(ga.run,
        'set', 'page', '/test/max-scroll-tracker.html?foo=bar');

    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .50);
    browser.waitUntil(log.hitCountEquals(2));

    hits = log.getHits();
    assert.strictEqual(hits[1].ev, '25');
    assert.strictEqual(hits[1].el, '50');

    browser.execute(ga.run, 'maxScrollTracker:remove');
    browser.execute(ga.run, 'remove');
    browser.execute(ga.run, 'create', DEFAULT_TRACKER_FIELDS);
    browser.execute(ga.logHitData, testId);
    browser.execute(ga.run, 'require', 'maxScrollTracker', {
      ignoreUrlQuery: false,
    });
    browser.execute(ga.run,
        'set', 'page', '/test/max-scroll-tracker.html?foo=bar');

    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .40);
    browser.waitUntil(log.hitCountEquals(3));

    hits = log.getHits();
    // Since this is considered a new URL, the increase is measured from 0.
    assert.strictEqual(hits[2].dp, '/test/max-scroll-tracker.html?foo=bar');
    assert.strictEqual(hits[2].ev, '40');
    assert.strictEqual(hits[2].el, '40');

    browser.execute(ga.run, 'maxScrollTracker:remove');
    browser.execute(ga.run, 'remove');
    browser.execute(ga.run, 'create', DEFAULT_TRACKER_FIELDS);
    browser.execute(ga.logHitData, testId);
    browser.execute(ga.run, 'require', 'maxScrollTracker');
    browser.execute(ga.run,
        'set', 'page', '/test/max-scroll-tracker.html?foo=bar');

    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .80);
    browser.waitUntil(log.hitCountEquals(4));

    hits = log.getHits();
    assert.strictEqual(hits[3].dp, '/test/max-scroll-tracker.html?foo=bar');
    // The increase is measured from when the max scroll was at 50% since
    // now the two URLs are seen as the same.
    assert.strictEqual(hits[3].ev, '30');
    assert.strictEqual(hits[3].el, '80');
  });

  it('sends the increase amount as a custom metric if set', function() {
    browser.execute(ga.run, 'require', 'maxScrollTracker', {
      maxScrollMetricIndex: 1
    });

    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .5);
    browser.waitUntil(log.hitCountEquals(1));

    var hits = log.getHits();
    assert.strictEqual(hits[0].ev, '50');
    assert.strictEqual(hits[0].cm1, '50');
  });

  it('supports customizing any field via the fieldsObj', function() {
    browser.execute(ga.run, 'require', 'maxScrollTracker', {
      fieldsObj: {
        nonInteraction: true,
      }
    });
    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .25);
    browser.waitUntil(log.hitCountEquals(1));

    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .75);
    browser.waitUntil(log.hitCountEquals(2));

    var hits = log.getHits();
    assert.strictEqual(hits[0].ev, '25');
    assert.strictEqual(hits[0].el, '25');
    assert.strictEqual(hits[0].ni, '1');
    assert.strictEqual(hits[1].ev, '50');
    assert.strictEqual(hits[1].el, '75');
    assert.strictEqual(hits[1].ni, '1');
  });

  it('supports specifying a hit filter', function() {
    browser.execute(requireMaxScrollTracker_hitFilter);
    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .25);
    browser.waitUntil(log.hitCountEquals(1));

    browser.scroll(0, (PAGE_HEIGHT - WINDOW_HEIGHT) * .75);
    browser.waitUntil(log.hitCountEquals(2));

    var hits = log.getHits();
    assert.strictEqual(hits[0].ev, '25');
    assert.strictEqual(hits[0].el, '25');
    assert.strictEqual(hits[0].cd1, '25');
    assert.strictEqual(hits[1].ev, '50');
    assert.strictEqual(hits[1].el, '75');
    assert.strictEqual(hits[1].cd1, '50');
  });

  it('includes usage params with all hits', function() {
    browser.execute(ga.run, 'require', 'maxScrollTracker');
    browser.execute(ga.run, 'send', 'pageview');
    browser.waitUntil(log.hitCountEquals(1));

    var hits = log.getHits();
    assert.strictEqual(hits[0].did, constants.DEV_ID);
    assert.strictEqual(hits[0][constants.VERSION_PARAM], pkg.version);

    // '200' = '1000000000' in hex
    assert.strictEqual(hits[0][constants.USAGE_PARAM], '200');
  });

  describe('remove', function() {
    it('destroys all bound events and functionality', function() {
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
    hitFilter: function(model) {
      var increaseAmount = model.get('eventValue');
      model.set('dimension1', String(increaseAmount), true);
    }
  });
}


/**
 * Forces the session to expire by changing the stored last hit time.
 */
function expireSession() {
  browser.execute(function() {
    var storedSessionData = JSON.parse(
        localStorage.getItem('autotrack:UA-12345-1:session')) || {};

    storedSessionData.isExpired = true;
    localStorage.setItem('autotrack:UA-12345-1:session',
        JSON.stringify(storedSessionData));
  });
}
