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


var SESSION_TIMEOUT_IN_MILLISECONDS = 3000; // 3 seconds
var SESSION_TIMEOUT_IN_MINUTES = (1/60) * 3; // 3 seconds
var BUFFER = 500; // An extra wait time to avoid flakiness


var testId;
var log;


describe('pageVisibilityTracker', function() {
  this.retries(4);

  beforeEach(function() {
    testId = uuid();
    log = utilities.bindLogAccessors(testId);

    browser.url('/test/autotrack.html');
    browser.execute(ga.run, 'create', 'UA-XXXXX-Y', 'auto');
    browser.execute(ga.logHitData, testId);
  });

  afterEach(function() {
    browser.execute(ga.run, 'pageVisibilityTracker:remove');
    browser.execute(ga.run, 'remove');
    log.removeHits();
  });

  it('sends events when the visibility state changes', function() {
    if (!browserSupportsTabs()) return this.skip();

    browser.execute(ga.run, 'require', 'pageVisibilityTracker');

    openTab();
    closeTab();

    browser.waitUntil(log.hitCountEquals(2));

    var hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'Page Visibility');
    assert.strictEqual(hits[0].ea, 'change');
    assert.strictEqual(hits[0].el, 'visible => hidden');
    assert.strictEqual(hits[1].ec, 'Page Visibility');
    assert.strictEqual(hits[1].ea, 'change');
    assert.strictEqual(hits[1].el, 'hidden => visible');
  });

  it('tracks the elapsed time between events', function() {
    if (!browserSupportsTabs()) return this.skip();

    browser.execute(ga.run, 'require', 'pageVisibilityTracker');

    openTab();
    browser.pause(2500);
    closeTab();
    browser.waitUntil(log.hitCountEquals(2));

    var hits = log.getHits();
    assert(Number(hits[0].ev) <= 2); // <2500ms.
    assert(Number(hits[1].ev) >= 3); // >=2500ms.
  });

  it('sends hidden events as non-interaction events', function() {
    if (!browserSupportsTabs()) return this.skip();

    browser.execute(ga.run, 'require', 'pageVisibilityTracker');

    openTab();
    closeTab();

    browser.waitUntil(log.hitCountEquals(2));

    var hits = log.getHits();
    assert.strictEqual(hits[0].ni, '1');
    assert.strictEqual(hits[1].ni, undefined);
  });

  it('uses custom metric values if specified', function() {
    if (!browserSupportsTabs()) return this.skip();

    browser.execute(ga.run, 'require', 'pageVisibilityTracker', {
      visibleMetricIndex: 1,
      hiddenMetricIndex: 2
    });

    openTab();
    browser.pause(2500);
    closeTab();

    browser.waitUntil(log.hitCountEquals(2));

    var hits = log.getHits();
    assert(Number(hits[0].ev) <= 2); // <2500ms.
    assert(Number(hits[0].cm1) <= 2); // <2500ms.
    assert(Number(hits[1].ev) >= 3); // >=2500ms.
    assert(Number(hits[1].cm2) >= 3); // >=2500ms.
  });

  it('does not send any hidden events if the session has expired', function() {
    if (!browserSupportsTabs()) return this.skip();

    browser.execute(ga.run, 'require', 'pageVisibilityTracker', {
      sessionTimeout: SESSION_TIMEOUT_IN_MINUTES
    });
    browser.pause(SESSION_TIMEOUT_IN_MILLISECONDS + BUFFER);

    openTab();
    log.assertNoHitsReceived();

    closeTab();
  });

  it('preemptivelys start all new session hits with a pageview', function() {
    if (!browserSupportsTabs()) return this.skip();

    browser.execute(ga.run, 'require', 'pageVisibilityTracker', {
      sessionTimeout: SESSION_TIMEOUT_IN_MINUTES
    });
    browser.pause(SESSION_TIMEOUT_IN_MILLISECONDS + BUFFER);

    browser.execute(ga.run, 'send', 'event', 'Uncategorized', 'inactive');
    browser.waitUntil(log.hitCountEquals(2));

    // Expects non-pageview hits queued to be sent after the session has timed
    // out to include a pageview immediately before them.
    var hits = log.getHits();
    assert.strictEqual(hits[0].t, 'pageview');
    assert.strictEqual(hits[1].ec, 'Uncategorized');
    assert.strictEqual(hits[1].ea, 'inactive');
  });

  it('does not send visible events when starting a new session', function() {
    if (!browserSupportsTabs()) return this.skip();

    browser.execute(ga.run, 'require', 'pageVisibilityTracker', {
      sessionTimeout: SESSION_TIMEOUT_IN_MINUTES
    });
    browser.pause(SESSION_TIMEOUT_IN_MILLISECONDS + BUFFER);

    openTab();
    closeTab();

    browser.waitUntil(log.hitCountEquals(1));

    // Expects a pageview in lieu of a visible event because the session
    // has expired.
    var hits = log.getHits();
    assert.strictEqual(hits[0].t, 'pageview');
  });

  it('supports customizing the change template', function() {
    if (!browserSupportsTabs()) return this.skip();

    browser.execute(requirePageVisibilityTracker_changeTemplate);

    openTab();
    closeTab();

    browser.waitUntil(log.hitCountEquals(2));

    var hits = log.getHits();
    assert.strictEqual(hits[0].el, 'visible >> hidden');
    assert.strictEqual(hits[1].el, 'hidden >> visible');
  });

  it('supports customizing any field via the fieldsObj', function() {
    if (!browserSupportsTabs()) return this.skip();

      browser.execute(ga.run, 'require', 'pageVisibilityTracker', {
        fieldsObj: {
          dimension1: 'pageVisibilityTracker',
          nonInteraction: false
        }
      });

      openTab();
      closeTab();

      browser.waitUntil(log.hitCountEquals(2));

      var hits = log.getHits();
      assert.strictEqual(hits[0].cd1, 'pageVisibilityTracker');
      assert.strictEqual(hits[0].ni, '0');
      assert.strictEqual(hits[1].cd1, 'pageVisibilityTracker');
      assert.strictEqual(hits[1].ni, '0');
  });

  it('supports specifying a hit filter', function() {
    if (!browserSupportsTabs()) return this.skip();

    browser.execute(requirePageVisibilityTracker_hitFilter);

    openTab();
    closeTab();

    browser.waitUntil(log.hitCountEquals(1));

    var hits = log.getHits();
    assert.strictEqual(hits.length, 1);
    assert.strictEqual(hits[0].el, 'hidden => visible');
    assert.strictEqual(hits[0].cd1, 'pageVisibilityTracker');
  });

  it('resets the session timeout when other hits are sent', function() {
    if (!browserSupportsTabs()) return this.skip();

    browser.execute(ga.run, 'require', 'pageVisibilityTracker', {
      sessionTimeout: SESSION_TIMEOUT_IN_MINUTES
    });
    browser.pause(SESSION_TIMEOUT_IN_MILLISECONDS / 3);

    browser.execute(ga.run, 'send', 'event', 'Uncategorized', 'inactive');
    browser.pause(SESSION_TIMEOUT_IN_MILLISECONDS / 3);

    browser.execute(ga.run, 'send', 'event', 'Uncategorized', 'inactive');
    browser.pause(SESSION_TIMEOUT_IN_MILLISECONDS / 3);

    openTab();
    closeTab();

    browser.waitUntil(log.hitCountEquals(4));

    var hits = log.getHits();
    assert.strictEqual(hits[0].ec, 'Uncategorized');
    assert.strictEqual(hits[0].ea, 'inactive');
    assert.strictEqual(hits[1].ec, 'Uncategorized');
    assert.strictEqual(hits[1].ea, 'inactive');

    // Since each event above resets the session timeout, opening a new
    // tab will still be considered within the session timeout.
    assert.strictEqual(hits[2].ec, 'Page Visibility');
    assert.strictEqual(hits[2].ea, 'change');
    assert.strictEqual(hits[2].el, 'visible => hidden');
    assert.strictEqual(hits[3].ec, 'Page Visibility');
    assert.strictEqual(hits[3].ea, 'change');
    assert.strictEqual(hits[3].el, 'hidden => visible');
  });

  it('includes usage params with all hits', function() {
    browser.execute(ga.run, 'require', 'pageVisibilityTracker');
    browser.execute(ga.run, 'send', 'pageview');
    browser.waitUntil(log.hitCountEquals(1));

    var hits = log.getHits();
    assert.strictEqual(hits[0].did, constants.DEV_ID);
    assert.strictEqual(hits[0][constants.VERSION_PARAM], pkg.version);

    // '40' = '001000000' in hex
    assert.strictEqual(hits[0][constants.USAGE_PARAM], '40');
  });

  describe('remove', function() {
    it('destroys all bound events and functionality', function() {
      browser.execute(ga.run, 'require', 'pageVisibilityTracker');
      browser.execute(ga.run, 'pageVisibilityTracker:remove');

      openTab();
      closeTab();
      log.assertNoHitsReceived();
    });
  });
});


/**
 * @return {boolean} True if the current browser works with the open/close
 * tab methods defined in this file.
 */
function browserSupportsTabs() {
  var browserCaps = browser.session().value;
  // TODO(philipwalton): on Sauce Labs, Internet explorer and Safari open
  // target="_blank" links in a new window, not tab.
  return !(browserCaps.browserName == 'internet explorer' ||
      browserCaps.browserName == 'safari');
}


/**
 * Opens a new tab by inserting a link with target="_blank" into the DOM
 * and then clicking on it.
 */
function openTab() {
  var prevTabIds = browser.getTabIds();
  browser.execute(function() {
    var a = document.createElement('a');
    a.href = '/test/blank.html';
    a.target = '_blank';
    a.id = 'new-tab-link';
    a.setAttribute('style', 'position:fixed;top:0;left:0;right:0;bottom:0');
    a.onclick = function() {document.body.removeChild(a);};
    document.body.appendChild(a);
  });
  browser.element('#new-tab-link').click();

  browser.pause(500);
  browser.waitUntil(function() {
    var newTabIds = browser.getTabIds();
    return newTabIds.length > prevTabIds.length;
  }, 2000, 'New tab was never opened.', 500);
}


/**
 * Closes all tabs other than the oldest one.
 */
function closeTab() {
  var windowHandles = browser.windowHandles().value;
  windowHandles.forEach(function(handle, index) {
    if (index > 0) browser.switchTab(handle).close();
  });
}


/**
 * Since function objects can't be passed via parameters from server to
 * client, this one-off function must be used to set the value for
 * `changeTemplate`.
 */
function requirePageVisibilityTracker_changeTemplate() {
  ga('require', 'pageVisibilityTracker', {
    changeTemplate: function(oldValue, newValue) {
      return oldValue + ' >> ' + newValue;
    }
  });
}


/**
 * Since function objects can't be passed via parameters from server to
 * client, this one-off function must be used to set the value for
 * `hitFilter`.
 */
function requirePageVisibilityTracker_hitFilter() {
  ga('require', 'pageVisibilityTracker', {
    hitFilter: function(model) {
      var visibilityState = model.get('eventLabel');
      if (visibilityState == 'visible => hidden') {
        throw 'Exclude changes to hidden';
      }
      else {
        model.set('dimension1', 'pageVisibilityTracker', true);
      }
    }
  });
}
