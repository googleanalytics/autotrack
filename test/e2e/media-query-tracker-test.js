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


const TIMEOUT = 1000;


const opts = {
  definitions: [
    {
      name: 'Width',
      dimensionIndex: 1,
      items: [
        {name: 'sm', media: 'all'},
        {name: 'md', media: '(min-width: 480px)'},
        {name: 'lg', media: '(min-width: 640px)'},
      ],
    },
    {
      name: 'Height',
      dimensionIndex: 2,
      items: [
        {name: 'sm', media: 'all'},
        {name: 'md', media: '(min-height: 480px)'},
        {name: 'lg', media: '(min-height: 640px)'},
      ],
    },
  ],
};


let testId;
let log;


describe('mediaQueryTracker', function() {
  this.retries(4);

  before(() => browser.url('/test/e2e/fixtures/autotrack.html'));

  beforeEach(() => {
    testId = uuid();
    log = bindLogAccessors(testId);

    browser.setViewportSize({width: 800, height: 600}, false);
    browser.execute(ga.run, 'create', DEFAULT_TRACKER_FIELDS);
    browser.execute(ga.logHitData, testId);
  });

  afterEach(() => {
    log.removeHits();
    browser.execute(ga.run, 'mediaQueryTracker:remove');
    browser.execute(ga.run, 'remove');
  });

  it('sets initial data via custom dimensions', () => {
    browser.execute(ga.run, 'require', 'mediaQueryTracker', opts);
    browser.execute(ga.run, 'send', 'pageview');
    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].cd1, 'lg');
    assert.strictEqual(hits[0].cd2, 'md');
  });

  it('sends events when the matched media changes', () => {
    browser.execute(ga.run, 'require', 'mediaQueryTracker', opts);
    browser.setViewportSize({width: 400, height: 400}, false);
    browser.waitUntil(log.hitCountEquals(2));

    const hits = log.getHits().sort(sortHitDataByEventCategory);

    assert.strictEqual(hits[0].ec, 'Height');
    assert.strictEqual(hits[0].ea, 'change');
    assert.strictEqual(hits[0].el, 'md => sm');
    assert.strictEqual(hits[1].ec, 'Width');
    assert.strictEqual(hits[1].ea, 'change');
    assert.strictEqual(hits[1].el, 'lg => sm');
  });


  it('sends events as nonInteraction by default', () => {
    browser.execute(ga.run, 'require', 'mediaQueryTracker', opts);
    browser.setViewportSize({width: 400, height: 400}, false);
    browser.waitUntil(log.hitCountEquals(2));

    const hits = log.getHits().sort(sortHitDataByEventCategory);
    assert.strictEqual(hits[0].ec, 'Height');
    assert.strictEqual(hits[0].ea, 'change');
    assert.strictEqual(hits[0].el, 'md => sm');
    assert.strictEqual(hits[0].ni, '1');
    assert.strictEqual(hits[1].ec, 'Width');
    assert.strictEqual(hits[1].ea, 'change');
    assert.strictEqual(hits[1].el, 'lg => sm');
    assert.strictEqual(hits[1].ni, '1');
  });

  it('waits for the timeout send changes', () => {
    browser.execute(ga.run, 'require', 'mediaQueryTracker', opts);
    browser.setViewportSize({width: 400, height: 400}, false);

    const timeoutStart = Date.now();
    browser.waitUntil(log.hitCountEquals(2));
    const timeoutDuration = Date.now() - timeoutStart;

    assert(timeoutDuration >= TIMEOUT);
  });

  it('supports customizing the timeout period', () => {
    browser.execute(ga.run, 'require', 'mediaQueryTracker',
        Object.assign({}, opts, {changeTimeout: 0}));
    browser.setViewportSize({width: 400, height: 400}, false);

    const shortTimeoutStart = Date.now();
    browser.waitUntil(log.hitCountEquals(2));
    const shortTimeoutDuration = Date.now() - shortTimeoutStart;

    browser.execute(ga.run, 'mediaQueryTracker:remove');
    browser.execute(ga.run, 'remove');
    browser.execute(ga.run, 'create', DEFAULT_TRACKER_FIELDS);
    browser.execute(ga.logHitData, testId);
    browser.setViewportSize({width: 800, height: 600}, false);
    browser.execute(ga.run, 'require', 'mediaQueryTracker', opts);
    browser.setViewportSize({width: 400, height: 400}, false);

    const longTimeoutStart = Date.now();
    browser.waitUntil(log.hitCountEquals(4));
    const longTimeoutDuration = Date.now() - longTimeoutStart;

    // The long timeout should, in theory, be 1000ms longer, but we compare
    // to 500 just to be safe and avoid flakiness.
    assert(longTimeoutDuration - shortTimeoutDuration > (TIMEOUT/2));
  });

  it('supports customizing the change template', () => {
    browser.execute(requireMediaQueryTracker_changeTemplate);
    browser.setViewportSize({width: 400, height: 400}, false);
    browser.waitUntil(log.hitCountEquals(2));

    const hits = log.getHits().sort(sortHitDataByEventCategory);
    assert.strictEqual(hits[0].el, 'md:sm');
    assert.strictEqual(hits[1].el, 'lg:sm');
  });

  it('supports customizing any field via the fieldsObj', () => {
    browser.execute(ga.run, 'require', 'mediaQueryTracker',
        Object.assign({}, opts, {
          changeTimeout: 0,
          fieldsObj: {
            nonInteraction: false,
          },
        }));
    browser.setViewportSize({width: 400, height: 400}, false);
    browser.waitUntil(log.hitCountEquals(2));

    const hits = log.getHits().sort(sortHitDataByEventCategory);
    assert.strictEqual(hits[0].ec, 'Height');
    assert.strictEqual(hits[0].ea, 'change');
    assert.strictEqual(hits[0].el, 'md => sm');
    assert.strictEqual(hits[0].ni, '0');
    assert.strictEqual(hits[1].ec, 'Width');
    assert.strictEqual(hits[1].ea, 'change');
    assert.strictEqual(hits[1].el, 'lg => sm');
    assert.strictEqual(hits[1].ni, '0');
  });

  it('supports specifying a hit filter', () => {
    browser.execute(requireMediaQueryTracker_hitFilter);
    browser.setViewportSize({width: 400, height: 400}, false);
    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'Height');
    assert.strictEqual(hits[0].ea, 'change');
    assert.strictEqual(hits[0].el, 'md => sm');
    assert.strictEqual(hits[0].ni, '0');
  });


  it('includes usage params with all hits', () => {
    browser.execute(ga.run, 'require', 'mediaQueryTracker');
    browser.execute(ga.run, 'send', 'pageview');
    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].did, constants.DEV_ID);
    assert.strictEqual(hits[0][constants.VERSION_PARAM], pkg.version);

    // '8' = '0000001000' in hex
    assert.strictEqual(hits[0][constants.USAGE_PARAM], '8');
  });

  describe('remove', () => {
    it('destroys all bound events and functionality', () => {
      browser.execute(ga.run, 'require', 'mediaQueryTracker',
          Object.assign({}, opts, {changeTimeout: 0}));

      browser.setViewportSize({width: 400, height: 400}, false);
      browser.waitUntil(log.hitCountEquals(2));

      const hits = log.getHits().sort(sortHitDataByEventCategory);
      assert.strictEqual(hits[0].ec, 'Height');
      assert.strictEqual(hits[1].ec, 'Width');
      log.removeHits();

      browser.execute(ga.run, 'mediaQueryTracker:remove');

      // This resize would trigger a change event
      // if the plugin hadn't been removed.
      browser.setViewportSize({width: 800, height: 600}, false);

      log.assertNoHitsReceived();
    });
  });
});


/**
 * Since function objects can't be passed via parameters from server to
 * client, this one-off function must be used to set the value for
 * `changeTemplate`.
 */
function requireMediaQueryTracker_changeTemplate() {
  ga('require', 'mediaQueryTracker', {
    definitions: [
      {
        name: 'Width',
        dimensionIndex: 1,
        items: [
          {name: 'sm', media: 'all'},
          {name: 'md', media: '(min-width: 480px)'},
          {name: 'lg', media: '(min-width: 640px)'},
        ],
      },
      {
        name: 'Height',
        dimensionIndex: 2,
        items: [
          {name: 'sm', media: 'all'},
          {name: 'md', media: '(min-height: 480px)'},
          {name: 'lg', media: '(min-height: 640px)'},
        ],
      },
    ],
    changeTemplate: (oldValue, newValue) => {
      return oldValue + ':' + newValue;
    },
  });
}


/**
 * Since function objects can't be passed via parameters from server to
 * client, this one-off function must be used to set the value for
 * `hitFilter`.
 */
function requireMediaQueryTracker_hitFilter() {
  ga('require', 'mediaQueryTracker', {
    definitions: [
      {
        name: 'Width',
        dimensionIndex: 1,
        items: [
          {name: 'sm', media: 'all'},
          {name: 'md', media: '(min-width: 480px)'},
          {name: 'lg', media: '(min-width: 640px)'},
        ],
      },
      {
        name: 'Height',
        dimensionIndex: 2,
        items: [
          {name: 'sm', media: 'all'},
          {name: 'md', media: '(min-height: 480px)'},
          {name: 'lg', media: '(min-height: 640px)'},
        ],
      },
    ],
    hitFilter: (model) => {
      const category = model.get('eventCategory');
      if (category == 'Width') {
        throw new Error('Exclude width changes');
      } else {
        model.set('nonInteraction', false, true);
      }
    },
  });
}


/**
 * A comparison function that sorts hits by the `ec` param.
 * This is needed because the code wdio is injecting into the page to
 * calculate the time seems to often be off for a few milliseconds.
 * (This doesn't seem to happen when using the browser normally.)
 * @param {Object} a The first hit to compare.
 * @param {Object} b The second hit to compare.
 * @return {number} A negative number if `a` should appear first in the sorted
 *     array, and a positive number if `b` should appear first.
 */
function sortHitDataByEventCategory(a, b) {
  return a.ec < b.ec ? -1 : 1;
}
