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


describe('eventTracker', function() {
  this.retries(4);

  before(() => browser.url('/test/e2e/fixtures/event-tracker.html'));

  beforeEach(() => {
    testId = uuid();
    log = bindLogAccessors(testId);

    browser.execute(ga.run, 'create', DEFAULT_TRACKER_FIELDS);
    browser.execute(ga.logHitData, testId);
  });

  afterEach(() => {
    log.removeHits();
    browser.execute(ga.run, 'eventTracker:remove');
    browser.execute(ga.run, 'remove');
  });

  it('supports declarative event binding to DOM elements', () => {
    browser.execute(ga.run, 'require', 'eventTracker');
    browser.click('#click-test');
    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'foo');
    assert.strictEqual(hits[0].ea, 'bar');
    assert.strictEqual(hits[0].el, 'qux');
    assert.strictEqual(hits[0].ev, '42');
    assert.strictEqual(hits[0].cd1, 'baz');
    assert.strictEqual(hits[0].ni, '1');
  });

  it('supports customizing the attribute prefix', () => {
    browser.execute(ga.run, 'require', 'eventTracker', {
      attributePrefix: 'data-ga-',
    });
    browser.click('#custom-prefix');
    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'foo');
    assert.strictEqual(hits[0].ea, 'bar');
  });

  it('supports non-event hit types', () => {
    browser.execute(ga.run, 'require', 'eventTracker');
    browser.click('#social-hit-type');
    browser.click('#pageview-hit-type');
    browser.waitUntil(log.hitCountEquals(2));

    const hits = log.getHits();
    assert.strictEqual(hits[0].t, 'social');
    assert.strictEqual(hits[0].sn, 'Facebook');
    assert.strictEqual(hits[0].sa, 'like');
    assert.strictEqual(hits[0].st, 'me');
    assert.strictEqual(hits[1].t, 'pageview');
    assert.strictEqual(hits[1].dp, '/foobar.html');
  });

  it('supports customizing what events to listen for', () => {
    browser.execute(ga.run, 'require', 'eventTracker', {
      events: ['submit'],
    });
    browser.click('#click-test');
    browser.click('#submit-test');
    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'Form');
    assert.strictEqual(hits[0].ea, 'submit');

    browser.url('/test/e2e/fixtures/event-tracker.html');
  });

  it('supports listening for multiple events', () => {
    browser.execute(ga.run, 'require', 'eventTracker', {
      events: ['mousedown', 'click', 'submit'],
    });
    browser.click('#submit-test');
    browser.waitUntil(log.hitCountEquals(3));

    const hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'Form');
    assert.strictEqual(hits[0].ea, 'submit'); // Not mousedown.
    assert.strictEqual(hits[0].ec, 'Form');
    assert.strictEqual(hits[0].ea, 'submit'); // Not click.
    assert.strictEqual(hits[1].ec, 'Form');
    assert.strictEqual(hits[1].ea, 'submit');

    browser.url('/test/e2e/fixtures/event-tracker.html');
  });

  it('supports specifying a fields object for all hits', () => {
    browser.execute(ga.run, 'require', 'eventTracker', {
      fieldsObj: {
        nonInteraction: true,
        dimension1: 'foo',
        dimension2: 'bar',
      },
    });
    browser.click('#social-hit-type');
    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].ni, '1');
    assert.strictEqual(hits[0].cd1, 'foo');
    assert.strictEqual(hits[0].cd2, 'bar');
  });

  it('supports specifying a hit filter', () => {
    browser.execute(requireEventTrackerWithHitFilter);
    browser.click('#click-test');
    browser.click('#pageview-hit-type');
    browser.click('#social-hit-type');
    browser.click('#submit-test');

    browser.waitUntil(log.hitCountEquals(3));

    const hits = log.getHits();
    assert.strictEqual(hits[0].sn, 'Facebook');
    assert.strictEqual(hits[0].sa, 'like');
    assert.strictEqual(hits[0].ni, '1');
    assert.strictEqual(hits[0].cd1, 'click');
    assert.strictEqual(hits[0].cd2, 'foo');
    assert.strictEqual(hits[0].cd3, 'bar');

    assert.strictEqual(hits[1].ec, 'Form');
    assert.strictEqual(hits[1].ea, 'submit');
    assert.strictEqual(hits[1].ni, '1');
    assert.strictEqual(hits[1].cd1, 'click');
    assert.strictEqual(hits[1].cd2, 'foo');
    assert.strictEqual(hits[1].cd3, 'bar');

    assert.strictEqual(hits[2].ec, 'Form');
    assert.strictEqual(hits[2].ea, 'submit');
    assert.strictEqual(hits[2].ni, '1');
    assert.strictEqual(hits[2].cd1, 'submit');
    assert.strictEqual(hits[2].cd2, 'foo');
    assert.strictEqual(hits[2].cd3, 'bar');
  });

  it('includes usage params with all hits', () => {
    browser.execute(ga.run, 'require', 'eventTracker');
    browser.execute(ga.run, 'send', 'pageview');
    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].did, constants.DEV_ID);
    assert.strictEqual(hits[0][constants.VERSION_PARAM], pkg.version);

    // '2' = '0000000010' in hex
    assert.strictEqual(hits[0][constants.USAGE_PARAM], '2');
  });

  describe('remove', () => {
    it('destroys all bound events and functionality', () => {
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
    events: ['click', 'submit'],
    hitFilter: (model, element, event) => {
      if (!(element.id == 'social-hit-type' ||
          element.nodeName.toLowerCase() == 'form')) {
        throw new Error('Aborting non-social, non-form hits');
      }

      model.set('nonInteraction', true, true);
      model.set('dimension1', event.type, true);
      model.set('dimension2', 'foo', true);
      model.set('dimension3', 'bar', true);
    },
  });
}
