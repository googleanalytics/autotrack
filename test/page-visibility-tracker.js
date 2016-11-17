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


var DEFAULT_TRACKER_FIELDS = {
  trackingId: 'UA-12345-1',
  cookieDomain: 'auto',
  siteSpeedSampleRate: 0,
};


var testId;
var log;


describe('pageVisibilityTracker', function() {
  if (process.env.CI) this.retries(4);

  beforeEach(function() {
    testId = uuid();
    log = utilities.bindLogAccessors(testId);
    browser.url('/test/autotrack.html?tab=1');
    browser.execute(ga.run, 'create', DEFAULT_TRACKER_FIELDS);
    browser.execute(ga.logHitData, testId);
  });

  afterEach(function() {
    closeAllButFirstTab();
    browser.execute(ga.run, 'pageVisibilityTracker:remove');
    browser.execute(ga.run, 'remove');
    log.removeHits();
  });

  it('sends an initial event after the first pageview', function() {
    if (!browserSupportsTabs()) return this.skip();

    browser.execute(ga.run, 'require', 'pageVisibilityTracker');
    browser.execute(ga.run, 'send', 'pageview');
    browser.waitUntil(log.hitCountEquals(2));

    var hits = log.getHits();
    assert.strictEqual(hits[0].t, 'pageview');
    assert.strictEqual(hits[1].ec, 'Page Visibility');
    assert.strictEqual(hits[1].ea, 'change');
    assert.strictEqual(hits[1].el, 'visible');
  });

  it('sends events when the visibility state changes', function() {
    if (!browserSupportsTabs()) return this.skip();

    browser.execute(ga.run, 'require', 'pageVisibilityTracker');
    browser.execute(ga.run, 'send', 'pageview');

    openNewTab();
    closeAllButFirstTab();

    browser.waitUntil(log.hitCountEquals(4));

    var hits = log.getHits();
    assert.strictEqual(hits[0].t, 'pageview');
    assert.strictEqual(hits[1].ec, 'Page Visibility');
    assert.strictEqual(hits[1].ea, 'change');
    assert.strictEqual(hits[1].el, 'visible');
    assert.strictEqual(hits[2].ec, 'Page Visibility');
    assert.strictEqual(hits[2].ea, 'change');
    assert.strictEqual(hits[2].el, 'hidden');
    assert.strictEqual(hits[3].ec, 'Page Visibility');
    assert.strictEqual(hits[3].ea, 'change');
    assert.strictEqual(hits[3].el, 'visible');
  });

  it('tracks the elapsed time between events', function() {
    if (!browserSupportsTabs()) return this.skip();

    browser.execute(ga.run, 'require', 'pageVisibilityTracker');
    browser.execute(ga.run, 'send', 'pageview');

    openNewTab();
    browser.pause(2000);
    closeAllButFirstTab();
    browser.waitUntil(log.hitCountEquals(4));

    var hits = log.getHits();
    assert(Number(hits[3].ev) >= 2);
  });

  it('sends all events as non-interaction', function() {
    if (!browserSupportsTabs()) return this.skip();

    browser.execute(ga.run, 'require', 'pageVisibilityTracker');
    browser.execute(ga.run, 'send', 'pageview');

    openNewTab();
    closeAllButFirstTab();

    browser.waitUntil(log.hitCountEquals(4));

    var hits = log.getHits();
    assert.strictEqual(hits[1].ni, '1');
    assert.strictEqual(hits[2].ni, '1');
    assert.strictEqual(hits[3].ni, '1');
  });

  it('uses custom metric values if specified', function() {
    if (!browserSupportsTabs()) return this.skip();

    browser.execute(ga.run, 'require', 'pageVisibilityTracker', {
      visibleMetricIndex: 1,
      hiddenMetricIndex: 2
    });
    browser.execute(ga.run, 'send', 'pageview');

    browser.pause(1000);
    openNewTab();
    browser.pause(1000);
    closeAllButFirstTab();

    browser.waitUntil(log.hitCountEquals(4));

    var hits = log.getHits();
    assert(Number(hits[2].ev) >= 1);
    assert(Number(hits[2].cm1) >= 1);
    assert(Number(hits[3].ev) >= 1);
    assert(Number(hits[3].cm2) >= 1);
  });

  it('does not send any hidden events if the session has expired', function() {
    if (!browserSupportsTabs()) return this.skip();

    browser.execute(ga.run, 'require', 'pageVisibilityTracker', {
      sessionTimeout: SESSION_TIMEOUT_IN_MINUTES
    });
    browser.execute(ga.run, 'send', 'pageview');

    // Let the session expire.
    browser.pause(SESSION_TIMEOUT_IN_MILLISECONDS + BUFFER);
    log.removeHits();

    openNewTab();
    log.assertNoHitsReceived();
    closeAllButFirstTab();
  });

  it('sends a pageview before a visible event if the session has expired',
      function() {
    if (!browserSupportsTabs()) return this.skip();

    browser.execute(ga.run, 'require', 'pageVisibilityTracker', {
      sessionTimeout: SESSION_TIMEOUT_IN_MINUTES
    });
    browser.execute(ga.run, 'send', 'pageview');

    // Let the session expire.
    browser.pause(SESSION_TIMEOUT_IN_MILLISECONDS + BUFFER);
    log.removeHits();

    openNewTab();
    closeAllButFirstTab();
    browser.waitUntil(log.hitCountEquals(2));

    // Expects non-pageview hits queued to be sent after the session has timed
    // out to include a pageview immediately before them.
    var hits = log.getHits();
    assert.strictEqual(hits[0].t, 'pageview');
    assert.strictEqual(hits[1].ea, 'change');
    assert.strictEqual(hits[1].el, 'visible');
  });

  it('resets the session timeout when other hits are sent', function() {
    if (!browserSupportsTabs()) return this.skip();

    browser.execute(ga.run, 'require', 'pageVisibilityTracker', {
      sessionTimeout: SESSION_TIMEOUT_IN_MINUTES
    });
    browser.execute(ga.run, 'send', 'pageview');
    browser.pause(SESSION_TIMEOUT_IN_MILLISECONDS / 3);

    browser.execute(ga.run, 'send', 'event', 'Uncategorized', 'unimportant');
    browser.pause(SESSION_TIMEOUT_IN_MILLISECONDS / 3);

    browser.execute(ga.run, 'send', 'event', 'Uncategorized', 'unimportant');
    browser.pause(SESSION_TIMEOUT_IN_MILLISECONDS / 3);

    openNewTab();
    closeAllButFirstTab();

    browser.waitUntil(log.hitCountEquals(6));

    var hits = log.getHits();
    assert.strictEqual(hits[0].t, 'pageview');
    assert.strictEqual(hits[1].ec, 'Page Visibility');
    assert.strictEqual(hits[1].ea, 'change');
    assert.strictEqual(hits[1].el, 'visible');
    assert.strictEqual(hits[2].ec, 'Uncategorized');
    assert.strictEqual(hits[2].ea, 'unimportant');
    assert.strictEqual(hits[3].ec, 'Uncategorized');
    assert.strictEqual(hits[3].ea, 'unimportant');

    // Since each hit above resets the session timeout, opening a new
    // tab will still be considered within the session timeout.
    assert.strictEqual(hits[4].ec, 'Page Visibility');
    assert.strictEqual(hits[4].ea, 'change');
    assert.strictEqual(hits[4].el, 'hidden');
    assert.strictEqual(hits[5].ec, 'Page Visibility');
    assert.strictEqual(hits[5].ea, 'change');
    assert.strictEqual(hits[5].el, 'visible');
  });

  it('reports hidden time when opening a new page ' +
      'if the current session is still active', function() {
    if (!browserSupportsTabs()) return this.skip();

    var sessionStart = +new Date();
    var tab1 = browser.getCurrentTabId();
    browser.execute(ga.run, 'require', 'pageVisibilityTracker', {
      visibleMetricIndex: 1,
      hiddenMetricIndex: 2,
    });
    browser.execute(ga.run, 'send', 'pageview');
    browser.pause(randomInteger(500, 2000));

    var tab2 = openNewTab('/test/blank.html');
    browser.pause(randomInteger(500, 2000));

    var tab3 = openNewTab('/test/autotrack.html?tab=3');
    browser.execute(ga.run, 'create', DEFAULT_TRACKER_FIELDS);
    browser.execute(ga.logHitData, testId);
    browser.execute(ga.run, 'require', 'pageVisibilityTracker', {
      visibleMetricIndex: 1,
      hiddenMetricIndex: 2,
    });
    browser.execute(ga.run, 'send', 'pageview');

    browser.waitUntil(log.hitCountEquals(5));
    var sessionEnd = +new Date();

    // Use the references to make the linter happy.
    assert(tab1 && tab2 && tab3);

    var hits = log.getHits();
    // Tab 1 pageview
    assert(hits[0].dl.endsWith('?tab=1'));
    assert.strictEqual(hits[0].t, 'pageview');
    // Tab 1 change:visible
    assert(hits[1].dl.endsWith('?tab=1'));
    assert.strictEqual(hits[1].ea, 'change');
    assert.strictEqual(hits[1].el, 'visible');
    // Tab 1 change:hidden
    assert(hits[2].dl.endsWith('?tab=1'));
    assert.strictEqual(hits[2].ea, 'change');
    assert.strictEqual(hits[2].el, 'hidden');
    assert(Number(hits[2].cm1) > 0);
    // Tab 2 (no pageview or change events)
    // Tab 3 pageview
    assert(hits[3].dl.endsWith('?tab=3'));
    assert.strictEqual(hits[3].t, 'pageview');
    // Tab 3 change:visible
    assert(hits[4].dl.endsWith('?tab=3'));
    assert.strictEqual(hits[4].ea, 'change');
    assert.strictEqual(hits[4].el, 'visible');
    assert(Number(hits[4].cm2) > 0);

    var totalVisibleTime = getTotalVisibleTime(hits);
    var totalHiddenTime = getTotalHiddenTime(hits);
    var totalTime = getTotalTime(hits);
    var sessionTime = Math.round((sessionEnd - sessionStart) / 1000);

    assert(totalVisibleTime + totalHiddenTime == totalTime);
    // Assert totalTime is within 2 seconds of session time.
    assert(totalTime >= sessionTime - 2 && totalTime <= sessionTime + 2);
  });

  it('stores a visible state if a tab/window is closed ' +
      'when a visible window is still open', function() {
    if (!browserSupportsTabs()) return this.skip();

    var tab1 = browser.getCurrentTabId();
    browser.execute(ga.run, 'require', 'pageVisibilityTracker', {
      visibleMetricIndex: 1,
      hiddenMetricIndex: 2,
    });
    browser.execute(ga.run, 'send', 'pageview');

    var window1 = openNewWindow('/test/autotrack.html?window=1');
    browser.execute(ga.run, 'create', DEFAULT_TRACKER_FIELDS);
    browser.execute(ga.logHitData, testId);
    browser.execute(ga.run, 'require', 'pageVisibilityTracker', {
      visibleMetricIndex: 1,
      hiddenMetricIndex: 2,
    });
    browser.execute(ga.run, 'send', 'pageview');

    browser.close(tab1); // Close window1 and switch to tab1.
    browser.waitUntil(log.hitCountEquals(5));

    var storedSessionData = browser.execute(function() {
      return JSON.parse(localStorage.getItem(
          'autotrack:UA-12345-1:plugins/page-visibility-tracker'));
    }).value;

    // Use the references to make the linter happy.
    assert(tab1 && window1);

    assert.strictEqual(storedSessionData.state, 'visible');
  });

  it('stores a hidden state if a tab/window is closed ' +
      'when no visible windows are still open', function() {
    if (!browserSupportsTabs()) return this.skip();

    var tab1 = browser.getCurrentTabId();
    browser.execute(ga.run, 'require', 'pageVisibilityTracker', {
      visibleMetricIndex: 1,
      hiddenMetricIndex: 2,
    });
    browser.execute(ga.run, 'send', 'pageview');

    var tab2 = openNewTab('/test/blank.html');

    var window1 = openNewWindow('/test/autotrack.html?window=1');
    browser.execute(ga.run, 'create', DEFAULT_TRACKER_FIELDS);
    browser.execute(ga.logHitData, testId);
    browser.execute(ga.run, 'require', 'pageVisibilityTracker', {
      visibleMetricIndex: 1,
      hiddenMetricIndex: 2,
    });
    browser.execute(ga.run, 'send', 'pageview');

    browser.close(tab2); // Close window1 and switch to tab2.
    browser.waitUntil(log.hitCountEquals(6));

    var storedSessionData = browser.execute(function() {
      return JSON.parse(localStorage.getItem(
          'autotrack:UA-12345-1:plugins/page-visibility-tracker'));
    }).value;

    // Use the references to make the linter happy.
    assert(tab1 && tab2 && window1);

    assert.strictEqual(storedSessionData.state, 'hidden');
  });

  it('does not double report when 2+ tabs are used simultaneously', function() {
    if (!browserSupportsTabs()) return this.skip();

    var sessionStart = +new Date();

    var tab1 = browser.getCurrentTabId();
    browser.execute(ga.run, 'require', 'pageVisibilityTracker', {
      visibleMetricIndex: 1,
      hiddenMetricIndex: 2,
    });
    browser.execute(ga.run, 'send', 'pageview');
    browser.pause(randomInteger(500, 2000));

    var tab2 = openNewTab('/test/autotrack.html?tab=2');
    browser.execute(ga.run, 'create', DEFAULT_TRACKER_FIELDS);
    browser.execute(ga.logHitData, testId);
    browser.execute(ga.run, 'require', 'pageVisibilityTracker', {
      visibleMetricIndex: 1,
      hiddenMetricIndex: 2,
    });
    browser.execute(ga.run, 'send', 'pageview');
    browser.pause(randomInteger(500, 2000));

    var tab3 = openNewTab('/test/blank.html');
    browser.pause(randomInteger(500, 2000));

    var tab4 = openNewTab('/test/autotrack.html?tab=4');
    browser.execute(ga.run, 'create', DEFAULT_TRACKER_FIELDS);
    browser.execute(ga.logHitData, testId);
    browser.execute(ga.run, 'require', 'pageVisibilityTracker', {
      visibleMetricIndex: 1,
      hiddenMetricIndex: 2,
    });
    browser.execute(ga.run, 'send', 'pageview');
    browser.pause(randomInteger(500, 2000));

    browser.close(tab3); // Close tab4 and go to tab3.
    browser.pause(randomInteger(500, 2000));

    browser.close(tab2); // Close tab3 and go to tab2.
    browser.pause(randomInteger(500, 2000));

    browser.close(tab1); // Close tab2 and go to tab1.
    var sessionEnd = +new Date();

    browser.waitUntil(log.hitCountEquals(12));

    // Use the references to make the linter happy.
    assert(tab1 && tab2 && tab3 && tab4);

    var hits = log.getHits();
    // Tab 1 pageview
    assert(hits[0].dl.endsWith('?tab=1'));
    assert.strictEqual(hits[0].t, 'pageview');
    // Tab 1 change:visible
    assert(hits[1].dl.endsWith('?tab=1'));
    assert.strictEqual(hits[1].ea, 'change');
    assert.strictEqual(hits[1].el, 'visible');
    // Tab 1 change:hidden
    assert(hits[2].dl.endsWith('?tab=1'));
    assert.strictEqual(hits[2].ea, 'change');
    assert.strictEqual(hits[2].el, 'hidden');
    assert(Number(hits[2].cm1) > 0);
    // Tab 2 pageview
    assert(hits[3].dl.endsWith('?tab=2'));
    assert.strictEqual(hits[3].t, 'pageview');
    // Tab 2 change:visible
    assert(hits[4].dl.endsWith('?tab=2'));
    assert.strictEqual(hits[4].ea, 'change');
    assert.strictEqual(hits[4].el, 'visible');
    // Tab 2 change:hidden
    assert(hits[5].dl.endsWith('?tab=2'));
    assert.strictEqual(hits[5].ea, 'change');
    assert.strictEqual(hits[5].el, 'hidden');
    assert(Number(hits[5].cm1) > 0);
    // Tab 3 (no pageview or change events)
    // Tab 4 pageview
    assert(hits[6].dl.endsWith('?tab=4'));
    assert.strictEqual(hits[6].t, 'pageview');
    // Tab 4 change:visible
    assert(hits[7].dl.endsWith('?tab=4'));
    assert.strictEqual(hits[7].ea, 'change');
    assert.strictEqual(hits[7].el, 'visible');
    assert(Number(hits[7].cm2) > 0);
    // Tab 4 change:hidden
    assert(hits[8].dl.endsWith('?tab=4'));
    assert.strictEqual(hits[8].ea, 'change');
    assert.strictEqual(hits[8].el, 'hidden');
    assert(Number(hits[8].cm1) > 0);
    // Tab 3 (no change events)
    // Tab 2 change:visible
    assert(hits[9].dl.endsWith('?tab=2'));
    assert.strictEqual(hits[9].ea, 'change');
    assert.strictEqual(hits[9].el, 'visible');
    assert(Number(hits[9].cm2) > 0);
    // Tab 2 change:hidden
    assert(hits[10].dl.endsWith('?tab=2'));
    assert.strictEqual(hits[10].ea, 'change');
    assert.strictEqual(hits[10].el, 'hidden');
    assert(Number(hits[10].cm1) > 0);
    // Tab 1 change:visible
    assert(hits[11].dl.endsWith('?tab=1'));
    assert.strictEqual(hits[11].ea, 'change');
    assert.strictEqual(hits[11].el, 'visible');

    var totalVisibleTime = getTotalVisibleTime(hits);
    var totalHiddenTime = getTotalHiddenTime(hits);
    var totalTime = getTotalTime(hits);
    var sessionTime = Math.round((sessionEnd - sessionStart) / 1000);

    assert(totalVisibleTime + totalHiddenTime == totalTime);
    // Assert totalTime is within 2 seconds of session time.
    assert(totalTime >= sessionTime - 2 && totalTime <= sessionTime + 2);

    log.removeHits();
  });

  it('works with multiple tabs and windows open simultaneously', function() {
    if (!browserSupportsTabs()) return this.skip();

    var sessionStart = +new Date();

    var tab1 = browser.getCurrentTabId();
    browser.execute(ga.run, 'require', 'pageVisibilityTracker', {
      visibleMetricIndex: 1,
      hiddenMetricIndex: 2,
    });
    browser.execute(ga.run, 'send', 'pageview');
    browser.pause(randomInteger(500, 2000));

    var tab2 = openNewTab('/test/blank.html');
    browser.pause(randomInteger(500, 2000));

    var tab3 = openNewTab('/test/autotrack.html?tab=3');
    browser.execute(ga.run, 'create', DEFAULT_TRACKER_FIELDS);
    browser.execute(ga.logHitData, testId);
    browser.execute(ga.run, 'require', 'pageVisibilityTracker', {
      visibleMetricIndex: 1,
      hiddenMetricIndex: 2,
    });
    browser.execute(ga.run, 'send', 'pageview');
    browser.pause(randomInteger(500, 2000));

    var window1 = openNewWindow('/test/autotrack.html?window=1');
    browser.execute(ga.run, 'create', DEFAULT_TRACKER_FIELDS);
    browser.execute(ga.logHitData, testId);
    browser.execute(ga.run, 'require', 'pageVisibilityTracker', {
      visibleMetricIndex: 1,
      hiddenMetricIndex: 2,
    });
    browser.execute(ga.run, 'send', 'pageview');
    browser.pause(randomInteger(500, 2000));

    var window2 = openNewWindow('/test/autotrack.html?window=2');
    browser.execute(ga.run, 'create', DEFAULT_TRACKER_FIELDS);
    browser.execute(ga.logHitData, testId);
    browser.execute(ga.run, 'require', 'pageVisibilityTracker', {
      visibleMetricIndex: 1,
      hiddenMetricIndex: 2,
    });
    browser.execute(ga.run, 'send', 'pageview');
    browser.pause(randomInteger(500, 2000));

    browser.close(tab3); // Close window2 and switch to tab3.
    browser.pause(randomInteger(500, 2000));

    browser.close(window1); // Close tab4 and go to window1.
    browser.pause(randomInteger(500, 2000));

    browser.close(tab2); // Close window1 and go to tab2.
    browser.pause(randomInteger(500, 2000));

    browser.close(tab1); // Close tab2 and go to tab1.

    browser.waitUntil(log.hitCountEquals(13));
    var sessionEnd = +new Date();

    // Use the references to make the linter happy.
    assert(tab1 && tab2 && tab3 && window1 && window2);

    var hits = log.getHits();

    // tab1 pageview
    assert(hits[0].dl.endsWith('?tab=1'));
    assert.strictEqual(hits[0].t, 'pageview');
    // tab1 change:visible
    assert(hits[1].dl.endsWith('?tab=1'));
    assert.strictEqual(hits[1].ea, 'change');
    assert.strictEqual(hits[1].el, 'visible');
    // tab1 change:hidden
    assert(hits[2].dl.endsWith('?tab=1'));
    assert.strictEqual(hits[2].ea, 'change');
    assert.strictEqual(hits[2].el, 'hidden');
    assert(Number(hits[2].cm1) > 0);
    // tab2 (no pageview or change events)
    // tab3 pageview
    assert(hits[3].dl.endsWith('?tab=3'));
    assert.strictEqual(hits[3].t, 'pageview');
    // tab3 change:visible
    assert(hits[4].dl.endsWith('?tab=3'));
    assert.strictEqual(hits[4].ea, 'change');
    assert.strictEqual(hits[4].el, 'visible');
    assert(Number(hits[4].cm2) > 0);
    // window1 pageview
    assert(hits[5].dl.endsWith('?window=1'));
    assert.strictEqual(hits[5].t, 'pageview');
    // window1 change:visible
    assert(hits[6].dl.endsWith('?window=1'));
    assert.strictEqual(hits[6].ea, 'change');
    assert.strictEqual(hits[6].el, 'visible');
    assert(Number(hits[6].cm1) > 0);
    // window2 pageview
    assert(hits[7].dl.endsWith('?window=2'));
    assert.strictEqual(hits[7].t, 'pageview');
    // window2 change:visible
    assert(hits[8].dl.endsWith('?window=2'));
    assert.strictEqual(hits[8].ea, 'change');
    assert.strictEqual(hits[8].el, 'visible');
    assert(Number(hits[8].cm1) > 0);
    // window2 change:hidden
    assert(hits[9].dl.endsWith('?window=2'));
    assert.strictEqual(hits[9].ea, 'change');
    assert.strictEqual(hits[9].el, 'hidden');
    assert(Number(hits[9].cm1) > 0);
    // tab3 change:hidden
    assert(hits[10].dl.endsWith('?tab=3'));
    assert.strictEqual(hits[10].ea, 'change');
    assert.strictEqual(hits[10].el, 'hidden');
    assert(Number(hits[10].cm1) > 0);
    // window1 change:hidden
    assert(hits[11].dl.endsWith('?window=1'));
    assert.strictEqual(hits[11].ea, 'change');
    assert.strictEqual(hits[11].el, 'hidden');
    assert(Number(hits[11].cm1) > 0);
    // tab1 change:visible
    assert(hits[12].dl.endsWith('?tab=1'));
    assert.strictEqual(hits[12].ea, 'change');
    assert.strictEqual(hits[12].el, 'visible');
    assert(Number(hits[12].cm2) > 0);

    var totalVisibleTime = getTotalVisibleTime(hits);
    var totalHiddenTime = getTotalHiddenTime(hits);
    var totalTime = getTotalTime(hits);
    var sessionTime = Math.round((sessionEnd - sessionStart) / 1000);

    assert(totalVisibleTime + totalHiddenTime == totalTime);
    // Assert totalTime is within 2 seconds of session time.
    assert(totalTime >= sessionTime - 2 && totalTime <= sessionTime + 2);

    log.removeHits();
  });

  it('works with multiple tabs across multiple sessions', function() {
    if (!browserSupportsTabs()) return this.skip();

    var tab1 = browser.getCurrentTabId();
    browser.execute(ga.run, 'require', 'pageVisibilityTracker', {
      visibleMetricIndex: 1,
      hiddenMetricIndex: 2,
    });
    var session1Start = +new Date();
    browser.execute(ga.run, 'send', 'pageview');
    browser.pause(randomInteger(500, 2000));

    var tab2 = openNewTab('/test/blank.html');
    browser.pause(randomInteger(500, 2000));

    var tab3 = openNewTab('/test/autotrack.html?tab=3');
    browser.execute(ga.run, 'create', DEFAULT_TRACKER_FIELDS);
    browser.execute(ga.logHitData, testId);
    browser.execute(ga.run, 'require', 'pageVisibilityTracker', {
      visibleMetricIndex: 1,
      hiddenMetricIndex: 2,
    });
    browser.execute(ga.run, 'send', 'pageview');
    browser.pause(randomInteger(500, 2000));

    var tab4 = openNewTab('/test/autotrack.html?tab=4');
    browser.execute(ga.run, 'create', DEFAULT_TRACKER_FIELDS);
    browser.execute(ga.logHitData, testId);
    browser.execute(ga.run, 'require', 'pageVisibilityTracker', {
      visibleMetricIndex: 1,
      hiddenMetricIndex: 2,
    });
    browser.execute(ga.run, 'send', 'pageview');
    browser.pause(randomInteger(500, 2000));

    var session1End = +new Date();

    // Manually expire session 1
    expireSession();

    var session2Start = +new Date();

    browser.close(tab3); // Close tab4 and go to tab3.
    browser.pause(randomInteger(500, 2000));

    browser.close(tab2); // Close tab3 and go to tab2.
    browser.pause(randomInteger(500, 2000));

    browser.close(tab1); // Close tab2 and go to tab1.

    browser.waitUntil(log.hitCountEquals(13));
    var session2End = +new Date();

    // Use the references to make the linter happy.
    assert(tab1 && tab2 && tab3 && tab4);

    var hits = log.getHits();
    // Session 1 start
    // tab1 pageview
    assert(hits[0].dl.endsWith('?tab=1'));
    assert.strictEqual(hits[0].t, 'pageview');
    // tab1 change:visible
    assert(hits[1].dl.endsWith('?tab=1'));
    assert.strictEqual(hits[1].ea, 'change');
    assert.strictEqual(hits[1].el, 'visible');
    // tab1 change:hidden
    assert(hits[2].dl.endsWith('?tab=1'));
    assert.strictEqual(hits[2].ea, 'change');
    assert.strictEqual(hits[2].el, 'hidden');
    assert(Number(hits[2].cm1) > 0);
    // tab2 (no pageview or change events)
    // tab3 pageview
    assert(hits[3].dl.endsWith('?tab=3'));
    assert.strictEqual(hits[3].t, 'pageview');
    // tab3 change:visible
    assert(hits[4].dl.endsWith('?tab=3'));
    assert.strictEqual(hits[4].ea, 'change');
    assert.strictEqual(hits[4].el, 'visible');
    assert(Number(hits[4].cm2) > 0);
    // tab3 change:hidden
    assert(hits[5].dl.endsWith('?tab=3'));
    assert.strictEqual(hits[5].ea, 'change');
    assert.strictEqual(hits[5].el, 'hidden');
    assert(Number(hits[5].cm1) > 0);
    // tab4 pageview
    assert(hits[6].dl.endsWith('?tab=4'));
    assert.strictEqual(hits[6].t, 'pageview');
    // tab4 change:visible
    assert(hits[7].dl.endsWith('?tab=4'));
    assert.strictEqual(hits[7].ea, 'change');
    assert.strictEqual(hits[7].el, 'visible');
    // Session 1 end

    // Session 2 start
    // tab4 close (no change event)
    // tab3 pageview (due to session expiring)
    assert(hits[8].dl.endsWith('?tab=3'));
    assert.strictEqual(hits[8].t, 'pageview');
    // tab3 change:visible
    assert(hits[9].dl.endsWith('?tab=3'));
    assert.strictEqual(hits[9].ea, 'change');
    assert.strictEqual(hits[9].el, 'visible');
    assert.strictEqual(hits[9].cm1, undefined); // Session expired.
    assert.strictEqual(hits[9].cm2, undefined); // Session expired.
    // tab3 change:hidden
    assert(hits[10].dl.endsWith('?tab=3'));
    assert.strictEqual(hits[10].ea, 'change');
    assert.strictEqual(hits[10].el, 'hidden');
    assert(Number(hits[10].cm1) > 0);
    // tab2 (no change events)
    // tab1 pageview (due to tracker not being active in current session)
    assert(hits[11].dl.endsWith('?tab=1'));
    assert.strictEqual(hits[11].t, 'pageview');
    // tab1 change:visible
    assert(hits[12].dl.endsWith('?tab=1'));
    assert.strictEqual(hits[12].ea, 'change');
    assert.strictEqual(hits[12].el, 'visible');
    assert(Number(hits[12].cm2) > 0);
    // Session 2 end

    var s1TotalVisibleTime = getTotalVisibleTime(hits.slice(0, 8));
    var s1TotalHiddenTime = getTotalHiddenTime(hits.slice(0, 8));
    var s1TotalTime = getTotalTime(hits.slice(0, 8));
    var s1ElapsedTime = Math.round((session1End - session1Start) / 1000);

    assert(s1TotalVisibleTime + s1TotalHiddenTime == s1TotalTime);
    // Assert s1TotalTime is within 2 seconds of s1ElapsedTime.
    assert(s1TotalTime >= s1ElapsedTime - 2 &&
        s1TotalTime <= s1ElapsedTime + 2);

    var s2TotalVisibleTime = getTotalVisibleTime(hits.slice(8));
    var s2TotalHiddenTime = getTotalHiddenTime(hits.slice(8));
    var s2TotalTime = getTotalTime(hits.slice(8));
    var s2ElapsedTime = Math.round((session2End - session2Start) / 1000);

    assert(s2TotalVisibleTime + s2TotalHiddenTime == s2TotalTime);
    // Assert s2TotalTime is within 2 seconds of s2ElapsedTime.
    assert(s2TotalTime >= s2ElapsedTime - 2 &&
        s2TotalTime <= s2ElapsedTime + 2);
  });

  it('sends heartbeat events when visible if enabled', function() {
    if (!browserSupportsTabs()) return this.skip();

    var sessionStart = +new Date();
    var tab1 = browser.getCurrentTabId();
    browser.execute(ga.run, 'require', 'pageVisibilityTracker', {
      visibleMetricIndex: 1,
      hiddenMetricIndex: 2,
      heartbeatTimeout: 1/60,
    });
    browser.execute(ga.run, 'send', 'pageview');
    browser.waitUntil(log.hitCountEquals(4));

    var tab2 = openNewTab('/test/blank.html');
    browser.pause(2000); // No heartbeat events should be sent here.

    // Use the references to make the linter happy.
    assert(tab1 && tab2);

    var hits = log.getHits();
    assert.strictEqual(hits.length, 5);

    assert(hits[0].dl.endsWith('?tab=1'));
    assert.strictEqual(hits[0].t, 'pageview');
    // Tab 1 change:visible
    assert(hits[1].dl.endsWith('?tab=1'));
    assert.strictEqual(hits[1].ea, 'change');
    assert.strictEqual(hits[1].el, 'visible');
    // Tab 1 heartbeat
    assert(hits[2].dl.endsWith('?tab=1'));
    assert.strictEqual(hits[2].ea, 'heartbeat');
    assert.strictEqual(hits[2].el, 'visible');
    assert(Number(hits[2].cm1) > 0);
    // Tab 1 heartbeat
    assert(hits[3].dl.endsWith('?tab=1'));
    assert.strictEqual(hits[3].ea, 'heartbeat');
    assert.strictEqual(hits[3].el, 'visible');
    assert(Number(hits[3].cm1) > 0);
    // Tab 1 change:hidden
    assert(hits[4].dl.endsWith('?tab=1'));
    assert.strictEqual(hits[4].ea, 'change');
    assert.strictEqual(hits[4].el, 'hidden');

    closeAllButFirstTab();
    browser.waitUntil(log.hitCountEquals(8));
    var sessionEnd = +new Date();

    hits = log.getHits();
    // Tab 1 change:visible
    assert(hits[5].dl.endsWith('?tab=1'));
    assert.strictEqual(hits[5].ea, 'change');
    assert.strictEqual(hits[5].el, 'visible');
    assert(Number(hits[5].cm2) > 0);
    // Tab 1 heartbeat
    assert(hits[6].dl.endsWith('?tab=1'));
    assert.strictEqual(hits[6].ea, 'heartbeat');
    assert.strictEqual(hits[6].el, 'visible');
    assert(Number(hits[6].cm1) > 0);
    // Tab 1 heartbeat
    assert(hits[7].dl.endsWith('?tab=1'));
    assert.strictEqual(hits[7].ea, 'heartbeat');
    assert.strictEqual(hits[7].el, 'visible');
    assert(Number(hits[7].cm1) > 0);

    var totalVisibleTime = getTotalVisibleTime(hits);
    var totalHiddenTime = getTotalHiddenTime(hits);
    var totalTime = getTotalTime(hits);
    var sessionTime = Math.round((sessionEnd - sessionStart) / 1000);

    assert(totalVisibleTime + totalHiddenTime == totalTime);
    // Assert totalTime is within 2 seconds of session time.
    assert(totalTime >= sessionTime - 2 && totalTime <= sessionTime + 2);

    log.removeHits();
  });

  it('stops sending heartbeats when the session expires', function() {
    if (!browserSupportsTabs()) return this.skip();

    var session1Start = +new Date();
    var tab1 = browser.getCurrentTabId();
    browser.execute(ga.run, 'require', 'pageVisibilityTracker', {
      visibleMetricIndex: 1,
      hiddenMetricIndex: 2,
      heartbeatTimeout: 1/60,
    });
    browser.execute(ga.run, 'send', 'pageview');
    browser.waitUntil(log.hitCountEquals(4));
    var session1End = +new Date();
    var hits1 = log.getHits();
    log.removeHits();

    expireSession();
    browser.pause(3000);
    log.assertNoHitsReceived();

    var session2Start = +new Date();
    // An interaction hit should trigger more heartbeats.
    browser.execute(ga.run, 'send', 'pageview');
    browser.waitUntil(log.hitCountEquals(3));
    var session2End = +new Date();
    var hits2 = log.getHits();
    expireSession();

    // Use the references to make the linter happy.
    assert(tab1)

    var s1TotalVisibleTime = getTotalVisibleTime(hits1);
    var s1TotalHiddenTime = getTotalHiddenTime(hits1);
    var s1TotalTime = getTotalTime(hits1);
    var s1ElapsedTime = Math.round((session1End - session1Start) / 1000);

    assert(s1TotalVisibleTime + s1TotalHiddenTime == s1TotalTime);
    // Assert s1TotalTime is within 2 seconds of s1ElapsedTime.
    assert(s1TotalTime >= s1ElapsedTime - 2 &&
        s1TotalTime <= s1ElapsedTime + 2);

    var s2TotalVisibleTime = getTotalVisibleTime(hits2);
    var s2TotalHiddenTime = getTotalHiddenTime(hits2);
    var s2TotalTime = getTotalTime(hits2);
    var s2ElapsedTime = Math.round((session2End - session2Start) / 1000);

    assert(s2TotalVisibleTime + s2TotalHiddenTime == s2TotalTime);
    // Assert s2TotalTime is within 2 seconds of s2ElapsedTime.
    assert(s2TotalTime >= s2ElapsedTime - 2 &&
        s2TotalTime <= s2ElapsedTime + 2);
  });

  it('supports customizing any field via the fieldsObj', function() {
    if (!browserSupportsTabs()) return this.skip();

    browser.execute(ga.run, 'require', 'pageVisibilityTracker', {
      fieldsObj: {
        dimension1: 'pageVisibilityTracker',
        nonInteraction: false
      }
    });
    browser.execute(ga.run, 'send', 'pageview');

    openNewTab();
    closeAllButFirstTab();

    browser.waitUntil(log.hitCountEquals(4));

    var hits = log.getHits();
    assert.strictEqual(hits[1].cd1, 'pageVisibilityTracker');
    assert.strictEqual(hits[1].ni, '0');
    assert.strictEqual(hits[2].cd1, 'pageVisibilityTracker');
    assert.strictEqual(hits[2].ni, '0');
    assert.strictEqual(hits[3].cd1, 'pageVisibilityTracker');
    assert.strictEqual(hits[3].ni, '0');
  });

  it('supports specifying a hit filter', function() {
    if (!browserSupportsTabs()) return this.skip();

    browser.execute(requirePageVisibilityTracker_hitFilter);
    browser.execute(ga.run, 'send', 'pageview');

    openNewTab();
    closeAllButFirstTab();

    browser.waitUntil(log.hitCountEquals(3));

    var hits = log.getHits();
    assert.strictEqual(hits[1].el, 'visible');
    assert.strictEqual(hits[1].cd1, 'pageVisibilityTracker');
    assert.strictEqual(hits[2].el, 'visible');
    assert.strictEqual(hits[2].cd1, 'pageVisibilityTracker');
  });

  it('includes usage params with all hits', function() {
    browser.execute(ga.run, 'require', 'pageVisibilityTracker');
    browser.execute(ga.run, 'send', 'pageview');
    browser.waitUntil(log.hitCountEquals(2));

    var hits = log.getHits();
    assert.strictEqual(hits[0].t, 'pageview');
    assert.strictEqual(hits[0].did, constants.DEV_ID);
    assert.strictEqual(hits[0][constants.VERSION_PARAM], pkg.version);
    assert.strictEqual(hits[1].t, 'event');
    assert.strictEqual(hits[1].did, constants.DEV_ID);
    assert.strictEqual(hits[1][constants.VERSION_PARAM], pkg.version);

    // '40' = '001000000' in hex
    assert.strictEqual(hits[0][constants.USAGE_PARAM], '40');
    assert.strictEqual(hits[1][constants.USAGE_PARAM], '40');
  });

  describe('remove', function() {
    it('destroys all bound events and functionality', function() {
      browser.execute(ga.run, 'require', 'pageVisibilityTracker');
      browser.execute(ga.run, 'send', 'pageview');

      log.removeHits();
      browser.execute(ga.run, 'pageVisibilityTracker:remove');

      openNewTab();
      closeAllButFirstTab();
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
  return !(
      // TODO(philipwalton): on Sauce Labs, Internet explorer and Safari open
      // target="_blank" links in a new window, not tab.
      browserCaps.browserName == 'internet explorer' ||
      browserCaps.browserName == 'safari' ||
      // TODO(philipwalton): Firefox driver (not the regular browser) emits
      // visibility change events in the wrong order.
      // https://bugzilla.mozilla.org/show_bug.cgi?id=1318098
      browserCaps.browserName == 'firefox');
}


/**
 * Opens a new tab by inserting a link with target="_blank" into the DOM
 * and then clicking on it.
 * @param {string} url A an optional URL to navigate to, defaulting to
 *     `/test/blank.html`.
 * @return {string} The tab ID.
 */
function openNewTab(url) {
  var oldTabIds = browser.getTabIds();
  browser.execute(function(url) {
    var a = document.createElement('a');
    a.href = url || '/test/blank.html';
    a.target = '_blank';
    a.id = 'new-tab-link';
    a.setAttribute('style', 'position:fixed;top:0;left:0;right:0;bottom:0');
    a.onclick = function() {document.body.removeChild(a);};
    document.body.appendChild(a);
  }, url);
  browser.element('#new-tab-link').click();

  browser.pause(500);
  browser.waitUntil(function() {
    var newTabIds = browser.getTabIds();
    if (newTabIds.length > oldTabIds.length) {
      browser.switchTab(newTabIds[newTabIds.length - 1]);
      return true;
    }
    return false;
  }, 2000, 'New tab was never opened.', 500);

  return browser.getCurrentTabId();
}


/**
 * Opens a new window by inserting a button with a window.open script handler
 * into the DOM and then clicking on it.
 * @param {string} url A URL to navigate to.
 * @return {string} The window ID.
 */
function openNewWindow(url) {
  var oldTabIds = browser.getTabIds();
  browser.execute(function(url) {
    var div = document.createElement('div');
    div.id = 'new-window-link';
    div.setAttribute('style', 'position:fixed;top:0;left:0;right:0;bottom:0');
    div.onclick = function() {
      window.open(url, 'newWindow' + Math.random(), 'width=600,height=400');
      document.body.removeChild(div);
    };
    document.body.appendChild(div);
  }, url);
  browser.element('#new-window-link').click();

  browser.pause(500);
  browser.waitUntil(function() {
    var newTabIds = browser.getTabIds();
    if (newTabIds.length > oldTabIds.length) {
      browser.switchTab(newTabIds[newTabIds.length - 1]);
      return true;
    }
    return false;
  }, 2000, 'New window was never opened.', 500);

  return browser.getCurrentTabId();
}


/**
 * Closes all tabs other than the oldest one.
 */
function closeAllButFirstTab() {
  var windowHandles = browser.windowHandles().value;
  windowHandles.forEach(function(handle, index) {
    if (index > 0) browser.switchTab(handle).close();
  });
}


/**
 * Forces the session to expire by changing the stored last hit time.
 */
function expireSession() {
  browser.execute(function() {
    var storedSessionData = JSON.parse(
        localStorage.getItem('autotrack:UA-12345-1:session'));

    storedSessionData.hitTime = 946713600000; // The year 2000!
    localStorage.setItem('autotrack:UA-12345-1:session',
        JSON.stringify(storedSessionData));
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
      if (visibilityState == 'hidden') {
        throw 'Exclude changes to hidden';
      }
      else {
        model.set('dimension1', 'pageVisibilityTracker', true);
      }
    }
  });
}


/**
 * Randomly picks an interger between the two passed values (inclusively).
 * @param {number} min The lowest value to pick.
 * @param {number} max The lowest value to pick.
 * @return {number} The random integer picked.
 */
function randomInteger(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}


/**
 * Gets the total visible time for all passed hits. The visible time is
 * assumed to be set on the `cm1` hit param.
 * @param {Array} hits An array of hits.
 * @return {number} The total time in seconds.
 */
function getTotalVisibleTime(hits) {
  return hits.reduce(function(value, nextHit) {
    return value + (Number(nextHit.cm1 || 0));
  }, 0);
}

/**
 * Gets the total hidden time for all passed hits. The hidden time is
 * assumed to be set on the `cm2` hit param.
 * @param {Array} hits An array of hits.
 * @return {number} The total time in seconds.
 */
function getTotalHiddenTime(hits) {
  return hits.reduce(function(value, nextHit) {
    return value + (Number(nextHit.cm2 || 0));
  }, 0);
}


/**
 * Gets the total event value time for all passed hits.
 * @param {Array} hits An array of hits.
 * @return {number} The total time in seconds.
 */
function getTotalTime(hits) {
  return hits.reduce(function(value, nextHit) {
    return value + (Number(nextHit.ev || 0));
  }, 0);
}
