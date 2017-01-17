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


var TIMEOUT = 1000;


var testId;
var log;
var opts = {
  definitions: [
    {
      name: 'Width',
      dimensionIndex: 1,
      items: [
        {name: 'sm', media: 'all'},
        {name: 'md', media: '(min-width: 480px)'},
        {name: 'lg', media: '(min-width: 640px)'}
      ]
    },
    {
      name: 'Height',
      dimensionIndex: 2,
      items: [
        {name: 'sm', media: 'all'},
        {name: 'md', media: '(min-height: 480px)'},
        {name: 'lg', media: '(min-height: 640px)'}
      ]
    }
  ]
};


describe('mediaQueryTracker', function() {
  this.retries(4);

  before(function() {
    browser.url('/test/autotrack.html');
  });

  beforeEach(function() {
    testId = uuid();
    log = utilities.bindLogAccessors(testId);

    browser.setViewportSize({width: 800, height: 600}, false);
    browser.execute(ga.run, 'create', 'UA-XXXXX-Y', 'auto');
    browser.execute(ga.logHitData, testId);
  });

  afterEach(function() {
    log.removeHits();
    browser.execute(ga.run, 'mediaQueryTracker:remove');
    browser.execute(ga.run, 'remove');
  });

  it('sets initial data via custom dimensions', function() {
    browser.execute(ga.run, 'require', 'mediaQueryTracker', opts);
    browser.execute(ga.run, 'send', 'pageview');
    browser.waitUntil(log.hitCountEquals(1));

    var hits = log.getHits();
    assert.strictEqual(hits[0].cd1, 'lg');
    assert.strictEqual(hits[0].cd2, 'md');
  });

  it('sends events when the matched media changes', function() {
    browser.execute(ga.run, 'require', 'mediaQueryTracker', opts);
    browser.setViewportSize({width: 400, height: 400}, false);
    browser.waitUntil(log.hitCountEquals(2));

    var hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'Width');
    assert.strictEqual(hits[0].ea, 'change');
    assert.strictEqual(hits[0].el, 'lg => sm');
    assert.strictEqual(hits[1].ec, 'Height');
    assert.strictEqual(hits[1].ea, 'change');
    assert.strictEqual(hits[1].el, 'md => sm');
  });

  it('sends non-interactive events', function() {
    browser.execute(ga.run, 'require', 'mediaQueryTracker', opts);
    browser.setViewportSize({width: 400, height: 400}, false);
    browser.waitUntil(log.hitCountEquals(2));

    var hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'Width');
    assert.strictEqual(hits[0].ea, 'change');
    assert.strictEqual(hits[0].el, 'lg => sm');
    assert.strictEqual(hits[0].ni, '1');
    assert.strictEqual(hits[1].ec, 'Height');
    assert.strictEqual(hits[1].ea, 'change');
    assert.strictEqual(hits[1].el, 'md => sm');
    assert.strictEqual(hits[1].ni, '1');
  });

  it('waits for the timeout send changes', function() {
    browser.execute(ga.run, 'require', 'mediaQueryTracker', opts);
    browser.setViewportSize({width: 400, height: 400}, false);

    var timeoutStart = Date.now();
    browser.waitUntil(log.hitCountEquals(2));
    var timeoutDuration = Date.now() - timeoutStart;

    assert(timeoutDuration >= TIMEOUT);
  });

  it('supports customizing the timeout period', function() {
    browser.execute(ga.run, 'require', 'mediaQueryTracker',
        Object.assign({}, opts, {changeTimeout: 0}));
    browser.setViewportSize({width: 400, height: 400}, false);

    var shortTimeoutStart = Date.now();
    browser.waitUntil(log.hitCountEquals(2));
    var shortTimeoutDuration = Date.now() - shortTimeoutStart;

    browser.execute(ga.run, 'mediaQueryTracker:remove');
    browser.execute(ga.run, 'remove');
    browser.execute(ga.run, 'create', 'UA-XXXXX-Y', 'auto');
    browser.execute(ga.logHitData, testId);
    browser.setViewportSize({width: 800, height: 600}, false);
    browser.execute(ga.run, 'require', 'mediaQueryTracker', opts);
    browser.setViewportSize({width: 400, height: 400}, false);

    var longTimeoutStart = Date.now();
    browser.waitUntil(log.hitCountEquals(4));
    var longTimeoutDuration = Date.now() - longTimeoutStart;

    // The long timeout should, in theory, be 1000ms longer, but we compare
    // to 500 just to be safe and avoid flakiness.
    assert(longTimeoutDuration - shortTimeoutDuration > (TIMEOUT/2));
  });

  it('supports customizing the change template', function() {
    browser.execute(requireMediaQueryTracker_changeTemplate);
    browser.setViewportSize({width: 400, height: 400}, false);
    browser.waitUntil(log.hitCountEquals(2));

    var hits = log.getHits();
    assert.strictEqual(hits[0].el, 'lg:sm');
    assert.strictEqual(hits[1].el, 'md:sm');
  });

  it('supports customizing any field via the fieldsObj', function() {
    browser.execute(ga.run, 'require', 'mediaQueryTracker',
        Object.assign({}, opts, {
          changeTimeout: 0,
          fieldsObj: {
            nonInteraction: false
          }
        }));
    browser.setViewportSize({width: 400, height: 400}, false);
    browser.waitUntil(log.hitCountEquals(2));

    var hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'Width');
    assert.strictEqual(hits[0].ea, 'change');
    assert.strictEqual(hits[0].el, 'lg => sm');
    assert.strictEqual(hits[0].ni, '0');
    assert.strictEqual(hits[1].ec, 'Height');
    assert.strictEqual(hits[1].ea, 'change');
    assert.strictEqual(hits[1].el, 'md => sm');
    assert.strictEqual(hits[1].ni, '0');
  });

  it('supports specifying a hit filter', function() {
    browser.execute(requireMediaQueryTracker_hitFilter);
    browser.setViewportSize({width: 400, height: 400}, false);
    browser.waitUntil(log.hitCountEquals(1));

    var hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'Height');
    assert.strictEqual(hits[0].ea, 'change');
    assert.strictEqual(hits[0].el, 'md => sm');
    assert.strictEqual(hits[0].ni, '0');
  });


  it('includes usage params with all hits', function() {
    browser.execute(ga.run, 'require', 'mediaQueryTracker');
    browser.execute(ga.run, 'send', 'pageview');
    browser.waitUntil(log.hitCountEquals(1));

    var hits = log.getHits();
    assert.strictEqual(hits[0].did, constants.DEV_ID);
    assert.strictEqual(hits[0][constants.VERSION_PARAM], pkg.version);

    // '8' = '0000001000' in hex
    assert.strictEqual(hits[0][constants.USAGE_PARAM], '8');
  });

  describe('remove', function() {
    it('destroys all bound events and functionality', function() {
      browser.execute(ga.run, 'require', 'mediaQueryTracker',
          Object.assign({}, opts, {changeTimeout: 0}));

      browser.setViewportSize({width: 400, height: 400}, false);
      browser.waitUntil(log.hitCountEquals(2));

      var hits = log.getHits();
      assert.strictEqual(hits[0].ec, 'Width');
      assert.strictEqual(hits[1].ec, 'Height');
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
          {name: 'lg', media: '(min-width: 640px)'}
        ]
      },
      {
        name: 'Height',
        dimensionIndex: 2,
        items: [
          {name: 'sm', media: 'all'},
          {name: 'md', media: '(min-height: 480px)'},
          {name: 'lg', media: '(min-height: 640px)'}
        ]
      }
    ],
    changeTemplate: function(oldValue, newValue) {
      return oldValue + ':' + newValue;
    }
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
          {name: 'lg', media: '(min-width: 640px)'}
        ]
      },
      {
        name: 'Height',
        dimensionIndex: 2,
        items: [
          {name: 'sm', media: 'all'},
          {name: 'md', media: '(min-height: 480px)'},
          {name: 'lg', media: '(min-height: 640px)'}
        ]
      }
    ],
    hitFilter: function(model) {
      var category = model.get('eventCategory');
      if (category == 'Width') {
        throw 'Exclude width changes';
      }
      else {
        model.set('nonInteraction', false, true);
      }
    }
  });
}

