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
const elementIdsByDomOrder = [
  'foo',
  'foo-1',
  'foo-1-1',
  'foo-1-2',
  'foo-2',
  'foo-2-1',
  'foo-2-2',
  'bar',
  'bar-1',
  'bar-1-1',
  'bar-1-2',
  'bar-2',
  'bar-2-1',
  'bar-2-2',
  'attrs',
  'attrs-1',
  'attrs-2',
  'fixture',
  'fixture-1',
  'fixture-2',
];


describe('impressionTracker', function() {
  this.retries(4);

  before(() => {
    browser.url('/test/e2e/fixtures/impression-tracker.html');
    browser.setViewportSize({width: 500, height: 500}, true);
  });

  beforeEach(() => {
    testId = uuid();
    log = bindLogAccessors(testId);

    browser.scroll(0, 0);
    browser.execute(ga.run, 'create', DEFAULT_TRACKER_FIELDS);
    browser.execute(ga.logHitData, testId);
  });

  afterEach(() => {
    log.removeHits();
    browser.execute(ga.run, 'impressionTracker:remove');
    browser.execute(ga.run, 'remove');
  });

  it('tracks when elements are visible in the viewport', () => {
    browser.execute(ga.run, 'require', 'impressionTracker', {
      elements: [
        'foo',
        'foo-1',
        'foo-1-1',
        'foo-1-2',
        'foo-2',
        'foo-2-1',
        'foo-2-2',
        'bar',
        'bar-1',
        'bar-1-1',
        'bar-1-2',
        'bar-2',
        'bar-2-1',
        'bar-2-2',
      ],
    });
    browser.scroll('#foo');
    browser.waitUntil(log.hitCountEquals(7));

    let hits = log.getHits().sort(sortHitDataByEventLabel);
    assert.strictEqual(hits[0].ec, 'Viewport');
    assert.strictEqual(hits[0].ea, 'impression');
    assert.strictEqual(hits[0].el, 'foo');
    assert.strictEqual(hits[1].ec, 'Viewport');
    assert.strictEqual(hits[1].ea, 'impression');
    assert.strictEqual(hits[1].el, 'foo-1');
    assert.strictEqual(hits[2].ec, 'Viewport');
    assert.strictEqual(hits[2].ea, 'impression');
    assert.strictEqual(hits[2].el, 'foo-1-1');
    assert.strictEqual(hits[3].ec, 'Viewport');
    assert.strictEqual(hits[3].ea, 'impression');
    assert.strictEqual(hits[3].el, 'foo-1-2');
    assert.strictEqual(hits[4].ec, 'Viewport');
    assert.strictEqual(hits[4].ea, 'impression');
    assert.strictEqual(hits[4].el, 'foo-2');
    assert.strictEqual(hits[5].ec, 'Viewport');
    assert.strictEqual(hits[5].ea, 'impression');
    assert.strictEqual(hits[5].el, 'foo-2-1');
    assert.strictEqual(hits[6].ec, 'Viewport');
    assert.strictEqual(hits[6].ea, 'impression');
    assert.strictEqual(hits[6].el, 'foo-2-2');
    log.removeHits();

    browser.scroll('#bar');
    browser.waitUntil(log.hitCountEquals(7));

    hits = log.getHits().sort(sortHitDataByEventLabel);
    assert.strictEqual(hits[0].ec, 'Viewport');
    assert.strictEqual(hits[0].ea, 'impression');
    assert.strictEqual(hits[0].el, 'bar');
    assert.strictEqual(hits[1].ec, 'Viewport');
    assert.strictEqual(hits[1].ea, 'impression');
    assert.strictEqual(hits[1].el, 'bar-1');
    assert.strictEqual(hits[2].ec, 'Viewport');
    assert.strictEqual(hits[2].ea, 'impression');
    assert.strictEqual(hits[2].el, 'bar-1-1');
    assert.strictEqual(hits[3].ec, 'Viewport');
    assert.strictEqual(hits[3].ea, 'impression');
    assert.strictEqual(hits[3].el, 'bar-1-2');
    assert.strictEqual(hits[4].ec, 'Viewport');
    assert.strictEqual(hits[4].ea, 'impression');
    assert.strictEqual(hits[4].el, 'bar-2');
    assert.strictEqual(hits[5].ec, 'Viewport');
    assert.strictEqual(hits[5].ea, 'impression');
    assert.strictEqual(hits[5].el, 'bar-2-1');
    assert.strictEqual(hits[6].ec, 'Viewport');
    assert.strictEqual(hits[6].ea, 'impression');
    assert.strictEqual(hits[6].el, 'bar-2-2');
  });

  it('handles elements being added and removed from the DOM', () => {
    browser.execute(ga.run, 'require', 'impressionTracker', {
      elements: [
        {id: 'fixture', trackFirstImpressionOnly: false},
        {id: 'fixture-1', trackFirstImpressionOnly: false},
        {id: 'fixture-2', trackFirstImpressionOnly: false},
      ],
    });
    browser.execute(addFixtures);
    browser.scroll('#fixture');
    browser.waitUntil(log.hitCountEquals(3));

    let hits = log.getHits().sort(sortHitDataByEventLabel);
    assert.strictEqual(hits[0].ec, 'Viewport');
    assert.strictEqual(hits[0].ea, 'impression');
    assert.strictEqual(hits[0].el, 'fixture');
    assert.strictEqual(hits[1].ec, 'Viewport');
    assert.strictEqual(hits[1].ea, 'impression');
    assert.strictEqual(hits[1].el, 'fixture-1');
    assert.strictEqual(hits[2].ec, 'Viewport');
    assert.strictEqual(hits[2].ea, 'impression');
    assert.strictEqual(hits[2].el, 'fixture-2');
    log.removeHits();

    browser.execute(removeFixtures);
    browser.scroll('#foo');
    browser.execute(addFixtures);
    browser.scroll('#fixture');
    browser.waitUntil(log.hitCountEquals(3));

    hits = log.getHits().sort(sortHitDataByEventLabel);
    assert.strictEqual(hits[0].ec, 'Viewport');
    assert.strictEqual(hits[0].ea, 'impression');
    assert.strictEqual(hits[0].el, 'fixture');
    assert.strictEqual(hits[1].ec, 'Viewport');
    assert.strictEqual(hits[1].ea, 'impression');
    assert.strictEqual(hits[1].el, 'fixture-1');
    assert.strictEqual(hits[2].ec, 'Viewport');
    assert.strictEqual(hits[2].ea, 'impression');
    assert.strictEqual(hits[2].el, 'fixture-2');

    browser.execute(removeFixtures);
  });

  it('uses a default threshold of 0', () => {
    browser.execute(ga.run, 'require', 'impressionTracker', {
      elements: ['foo'],
    });
    // Scrolls so #foo is only 0% visible but on the viewport border.
    browser.scroll('#foo', 0, -500);
    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'Viewport');
    assert.strictEqual(hits[0].ea, 'impression');
    assert.strictEqual(hits[0].el, 'foo');
  });

  it('sends events as nonInteraction by default', () => {
    browser.execute(ga.run, 'require', 'impressionTracker', {
      elements: ['foo'],
    });
    // Scrolls so #foo is only 0% visible but on the viewport border.
    browser.scroll('#foo', 0, -500);
    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].ni, '1');
  });

  it('supports tracking an element either once or every time', () => {
    browser.execute(ga.run, 'require', 'impressionTracker', {
      elements: [
        'foo-1',
        {id: 'foo-2', trackFirstImpressionOnly: false},
        'bar-1',
        {id: 'bar-2', trackFirstImpressionOnly: false},
      ],
    });
    browser.scroll('#foo');
    browser.waitUntil(log.hitCountEquals(2));

    let hits = log.getHits().sort(sortHitDataByEventLabel);
    assert.strictEqual(hits[0].ec, 'Viewport');
    assert.strictEqual(hits[0].ea, 'impression');
    assert.strictEqual(hits[0].el, 'foo-1');
    assert.strictEqual(hits[1].ec, 'Viewport');
    assert.strictEqual(hits[1].ea, 'impression');
    assert.strictEqual(hits[1].el, 'foo-2');
    log.removeHits();

    browser.scroll('#bar');
    browser.waitUntil(log.hitCountEquals(2));

    hits = log.getHits().sort(sortHitDataByEventLabel);
    assert.strictEqual(hits[0].ec, 'Viewport');
    assert.strictEqual(hits[0].ea, 'impression');
    assert.strictEqual(hits[0].el, 'bar-1');
    assert.strictEqual(hits[1].ec, 'Viewport');
    assert.strictEqual(hits[1].ea, 'impression');
    assert.strictEqual(hits[1].el, 'bar-2');
    log.removeHits();

    browser.scroll('#foo');
    browser.waitUntil(log.hitCountEquals(1));

    hits = log.getHits().sort(sortHitDataByEventLabel);
    assert.strictEqual(hits[0].ec, 'Viewport');
    assert.strictEqual(hits[0].ea, 'impression');
    assert.strictEqual(hits[0].el, 'foo-2');
    log.removeHits();

    browser.scroll('#bar');
    browser.waitUntil(log.hitCountEquals(1));

    hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'Viewport');
    assert.strictEqual(hits[0].ea, 'impression');
    assert.strictEqual(hits[0].el, 'bar-2');
  });

  it('supports changing the default threshold per element', () => {
    browser.execute(ga.run, 'require', 'impressionTracker', {
      elements: [
        {id: 'foo-1-1', threshold: 1},
        {id: 'foo-1-2', threshold: .66},
        {id: 'foo-2-1', threshold: .33},
        {id: 'foo-2-2', threshold: 0},
      ],
    });
    // Scrolls so #foo is only 25% visible
    browser.scroll('#foo', 0, -475);
    browser.waitUntil(log.hitCountEquals(1));

    let hits = log.getHits();
    assert.strictEqual(hits[0].el, 'foo-2-2');

    // Scrolls so #foo is 50% visible
    browser.scroll('#foo', 0, -450);
    browser.waitUntil(log.hitCountEquals(2));

    hits = log.getHits();
    assert.strictEqual(hits[1].el, 'foo-2-1');

    // Scrolls so #foo is 75% visible
    browser.scroll('#foo', 0, -425);
    browser.waitUntil(log.hitCountEquals(3));

    hits = log.getHits();
    assert.strictEqual(hits[2].el, 'foo-1-2');

    // Scrolls so #foo is 100% visible
    browser.scroll('#foo', 0, -400);
    browser.waitUntil(log.hitCountEquals(4));

    hits = log.getHits();
    assert.strictEqual(hits[3].el, 'foo-1-1');
  });

  it('supports setting a rootMargin', () => {
    browser.execute(ga.run, 'require', 'impressionTracker', {
      rootMargin: '-50px 0px',
      elements: [
        {id: 'foo-1-1', threshold: 1},
        {id: 'foo-1-2', threshold: .66},
        {id: 'foo-2-1', threshold: .33},
        {id: 'foo-2-2', threshold: 0},
      ],
    });
    // Scrolls so #foo is 100% visible but only 50% within rootMargin.
    browser.scroll('#foo', 0, -400);
    browser.waitUntil(log.hitCountEquals(2));

    const hits = log.getHits().sort(sortHitDataByEventLabel);
    assert.strictEqual(hits[0].ec, 'Viewport');
    assert.strictEqual(hits[0].ea, 'impression');
    assert.strictEqual(hits[0].el, 'foo-2-1');
    assert.strictEqual(hits[1].ec, 'Viewport');
    assert.strictEqual(hits[1].ea, 'impression');
    assert.strictEqual(hits[1].el, 'foo-2-2');
  });

  it('supports declarative event binding to DOM elements', () => {
    browser.execute(ga.run, 'require', 'impressionTracker', {
      elements: ['attrs-1'],
    });
    browser.scroll('#attrs');
    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'Element');
    assert.strictEqual(hits[0].ea, 'visible');
    assert.strictEqual(hits[0].el, 'attrs-1');
  });

  it('supports customizing the attribute prefix', () => {
    browser.execute(ga.run, 'require', 'impressionTracker', {
      attributePrefix: 'data-ga-',
      elements: ['attrs-1', 'attrs-2'],
    });
    browser.scroll('#attrs');
    browser.waitUntil(log.hitCountEquals(2));

    const hits = log.getHits().sort(sortHitDataByEventLabel);
    assert.strictEqual(hits[0].ec, 'Viewport');
    assert.strictEqual(hits[0].ea, 'impression');
    assert.strictEqual(hits[0].el, 'attrs-1');
    assert.strictEqual(hits[1].ec, 'Window');
    assert.strictEqual(hits[1].ea, 'impression');
    assert.strictEqual(hits[1].el, 'attrs-2');
    assert.strictEqual(hits[1].ni, '1');
  });

  it('supports specifying a fields object for all hits', () => {
    browser.execute(ga.run, 'require', 'impressionTracker', {
      elements: ['foo', 'bar'],
      fieldsObj: {
        eventCategory: 'Element',
        eventAction: 'visible',
        nonInteraction: null,
      },
    });
    browser.scroll('#foo');
    browser.waitUntil(log.hitCountEquals(1));

    let hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'Element');
    assert.strictEqual(hits[0].ea, 'visible');
    assert.strictEqual(hits[0].el, 'foo');
    assert.strictEqual(hits[0].ni, undefined);

    browser.scroll('#bar');
    browser.waitUntil(log.hitCountEquals(2));

    hits = log.getHits();
    assert.strictEqual(hits[1].ec, 'Element');
    assert.strictEqual(hits[1].ea, 'visible');
    assert.strictEqual(hits[1].el, 'bar');
    assert.strictEqual(hits[1].ni, undefined);
  });

  it('supports specifying a hit filter', () => {
    browser.execute(requireImpressionTracker_hitFilter);
    browser.scroll('#foo');
    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'Viewport');
    assert.strictEqual(hits[0].ea, 'impression');
    assert.strictEqual(hits[0].el, 'foo-2');
    assert.strictEqual(hits[0].ni, undefined);
    assert.strictEqual(hits[0].cd1, 'one');
    assert.strictEqual(hits[0].cd2, 'two');
  });

  it('includes usage params with all hits', () => {
    browser.execute(ga.run, 'require', 'impressionTracker');
    browser.execute(ga.run, 'send', 'pageview');
    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].did, constants.DEV_ID);
    assert.strictEqual(hits[0][constants.VERSION_PARAM], pkg.version);

    // '4' = '0000000100' in hex
    assert.strictEqual(hits[0][constants.USAGE_PARAM], '4');
  });

  describe('observeElements', () => {
    it('adds elements to be observed for intersections', () => {
      browser.execute(ga.run, 'require', 'impressionTracker', {
        elements: [
          'foo',
          'foo-1',
          'foo-2',
        ],
      });
      browser.execute(ga.run, 'impressionTracker:observeElements', [
        {id: 'bar', threshold: 0},
        {id: 'bar-1', threshold: 0.5},
        {id: 'bar-2', threshold: 1},
      ]);
      browser.scroll('#foo');
      browser.waitUntil(log.hitCountEquals(3));

      let hits = log.getHits().sort(sortHitDataByEventLabel);
      assert.strictEqual(hits[0].ec, 'Viewport');
      assert.strictEqual(hits[0].ea, 'impression');
      assert.strictEqual(hits[0].el, 'foo');
      assert.strictEqual(hits[1].ec, 'Viewport');
      assert.strictEqual(hits[1].ea, 'impression');
      assert.strictEqual(hits[1].el, 'foo-1');
      assert.strictEqual(hits[2].ec, 'Viewport');
      assert.strictEqual(hits[2].ea, 'impression');
      assert.strictEqual(hits[2].el, 'foo-2');

      browser.scroll('#bar');
      browser.waitUntil(log.hitCountEquals(6));

      hits = log.getHits().sort(sortHitDataByEventLabel);
      assert.strictEqual(hits[3].ec, 'Viewport');
      assert.strictEqual(hits[3].ea, 'impression');
      assert.strictEqual(hits[3].el, 'bar');
      assert.strictEqual(hits[4].ec, 'Viewport');
      assert.strictEqual(hits[4].ea, 'impression');
      assert.strictEqual(hits[4].el, 'bar-1');
      assert.strictEqual(hits[5].ec, 'Viewport');
      assert.strictEqual(hits[5].ea, 'impression');
      assert.strictEqual(hits[5].el, 'bar-2');
    });
  });

  describe('unobserveElements', () => {
    it('removes elements from being observed for intersections', () => {
      browser.execute(ga.run, 'require', 'impressionTracker', {
        elements: [
          'foo',
          'foo-1',
          'foo-2',
        ],
      });
      browser.execute(ga.run, 'impressionTracker:unobserveElements', ['foo']);
      browser.scroll('#foo');
      browser.waitUntil(log.hitCountEquals(2));

      const hits = log.getHits().sort(sortHitDataByEventLabel);
      assert.strictEqual(hits[0].ec, 'Viewport');
      assert.strictEqual(hits[0].ea, 'impression');
      assert.strictEqual(hits[0].el, 'foo-1');
      assert.strictEqual(hits[1].ec, 'Viewport');
      assert.strictEqual(hits[1].ea, 'impression');
      assert.strictEqual(hits[1].el, 'foo-2');
    });

    it('only removes elements if all properties match', () => {
      browser.execute(ga.run, 'require', 'impressionTracker', {
        elements: [
          {id: 'foo', threshold: 0},
          {id: 'foo-1', threshold: 0.5, trackFirstImpressionOnly: false},
          {id: 'foo-1-1', threshold: 0.5, trackFirstImpressionOnly: false},
          {id: 'foo-1-2', threshold: 0.5, trackFirstImpressionOnly: false},
          {id: 'foo-2', threshold: 1, trackFirstImpressionOnly: true},
          {id: 'foo-2-1', threshold: 1, trackFirstImpressionOnly: true},
          {id: 'foo-2-2', threshold: 1, trackFirstImpressionOnly: true},
        ],
      });
      browser.execute(ga.run, 'impressionTracker:unobserveElements', [
        'foo',
        'foo-1', // Mismatch.
        {id: 'foo-1-1', threshold: 0.5}, // Mismatch.
        {id: 'foo-2-2', threshold: 1},
      ]);
      browser.scroll('#foo');
      browser.waitUntil(log.hitCountEquals(5));

      const hits = log.getHits().sort(sortHitDataByEventLabel);
      assert.strictEqual(hits[0].ec, 'Viewport');
      assert.strictEqual(hits[0].ea, 'impression');
      assert.strictEqual(hits[0].el, 'foo-1');
      assert.strictEqual(hits[1].ec, 'Viewport');
      assert.strictEqual(hits[1].ea, 'impression');
      assert.strictEqual(hits[1].el, 'foo-1-1');
      assert.strictEqual(hits[2].ec, 'Viewport');
      assert.strictEqual(hits[2].ea, 'impression');
      assert.strictEqual(hits[2].el, 'foo-1-2');
      assert.strictEqual(hits[3].ec, 'Viewport');
      assert.strictEqual(hits[3].ea, 'impression');
      assert.strictEqual(hits[3].el, 'foo-2');
      assert.strictEqual(hits[4].ec, 'Viewport');
      assert.strictEqual(hits[4].ea, 'impression');
      assert.strictEqual(hits[4].el, 'foo-2-1');
    });
  });

  describe('unobserveAllElements', () => {
    it('removes all elements from being observed for intersections',
        () => {
      browser.execute(ga.run, 'require', 'impressionTracker', {
        elements: [
          'foo',
          'foo-1',
          'foo-2',
        ],
      });
      browser.execute(ga.run, 'impressionTracker:unobserveAllElements');
      browser.execute(ga.run, 'impressionTracker:observeElements', [
        'foo-1-1',
        'foo-2-2',
      ]);
      browser.scroll('#foo');
      browser.waitUntil(log.hitCountEquals(2));

      const hits = log.getHits().sort(sortHitDataByEventLabel);
      assert.strictEqual(hits[0].ec, 'Viewport');
      assert.strictEqual(hits[0].ea, 'impression');
      assert.strictEqual(hits[0].el, 'foo-1-1');
      assert.strictEqual(hits[1].ec, 'Viewport');
      assert.strictEqual(hits[1].ea, 'impression');
      assert.strictEqual(hits[1].el, 'foo-2-2');
    });
  });

  describe('remove', () => {
    it('destroys all bound events and functionality', () => {
      browser.execute(ga.run, 'require', 'impressionTracker', {
        elements: [{id: 'foo', trackFirstImpressionOnly: false}],
      });
      browser.scroll('#foo');
      browser.waitUntil(log.hitCountEquals(1));
      assert.strictEqual(log.getHits()[0].el, 'foo');
      log.removeHits();

      browser.scroll(0, 0);
      browser.execute(ga.run, 'impressionTracker:remove');
      browser.scroll('#foo');
      log.assertNoHitsReceived();
    });
  });
});


/**
 * Since function objects can't be passed via parameters from server to
 * client, this one-off function must be used to set the value for
 * `hitFilter`.
 */
function requireImpressionTracker_hitFilter() {
  ga('require', 'impressionTracker', {
    elements: ['foo-1', 'foo-2'],
    hitFilter: (model, element) => {
      if (element.id == 'foo-1') {
        throw new Error('Aborting hits with ID "foo-1"');
      } else {
        model.set('nonInteraction', null, true);
        model.set('dimension1', 'one', true);
        model.set('dimension2', 'two', true);
      }
    },
  });
}


/**
 * Adds a div#fixture.box element to the page.
 */
function addFixtures() {
  const fixture = document.createElement('div');
  fixture.id = 'fixture';
  fixture.className = 'container';
  fixture.innerHTML =
      '<div class="box" id="fixture-1"></div>' +
      '<div class="box" id="fixture-2"></div>';
  document.body.appendChild(fixture);
}


/**
 * Removes the div#fixture.box element from the page.
 */
function removeFixtures() {
  const fixture = document.getElementById('fixture');
  document.body.removeChild(fixture);
}


/**
 * A comparison function that sorts hits by the `el` param.
 * This is needed to work around Chrome's non-deterministic firing of
 * IntersectionObserver callbacks when multiple instances are used.
 * @param {Object} a The first hit to compare.
 * @param {Object} b The second hit to compare.
 * @return {number} A negative number if `a` should appear first in the sorted
 *     array, and a positive number if `b` should appear first.
 */
function sortHitDataByEventLabel(a, b) {
  const aDomIndex = elementIdsByDomOrder.indexOf(a.el);
  const bDomIndex = elementIdsByDomOrder.indexOf(b.el);
  return aDomIndex - bDomIndex;
}
