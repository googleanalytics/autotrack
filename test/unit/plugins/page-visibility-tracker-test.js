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


import '../../../lib/plugins/page-visibility-tracker';


const TRACKING_ID = 'UA-12345-1';
const DEFAULT_SESSION_TIMEOUT = 30;
const DEFAULT_VISIBLE_THRESHOLD = 5000;


describe('PageVisibilityTracker', function() {
  let tracker;
  let PageVisibilityTracker;

  beforeEach(function(done) {
    localStorage.clear();
    window.ga('create', TRACKING_ID, 'auto');
    window.ga(function(t) {
      tracker = t;
      PageVisibilityTracker = window.gaplugins.PageVisibilityTracker;
      done();
    });
  });

  afterEach(function() {
    localStorage.clear();
    window.ga('remove');
  });

  xdescribe('constructor', function() {
    it('stores the tracker on the instance', function() {
      if (!document.visibilityState) this.skip();

      const pvt = new PageVisibilityTracker(tracker);
      assert.strictEqual(tracker, pvt.tracker);

      pvt.remove();
    });

    it('merges the passed options with the defaults', function() {
      if (!document.visibilityState) this.skip();

      let pvt = new PageVisibilityTracker(tracker);

      assert.deepEqual(pvt.opts, {
        sessionTimeout: DEFAULT_SESSION_TIMEOUT,
        sendInitialPageview: false,
        visibleThreshold: DEFAULT_VISIBLE_THRESHOLD,
        fieldsObj: {},
      });
      pvt.remove();

      const opts = {
        sessionTimeout: 5,
        visibleThreshold: 0,
        timeZone: 'America/Los_Angeles',
        sendInitialPageview: false,
        pageLoadsMetricIndex: 1,
        visibleMetricIndex: 2,
        fieldsObj: {nonInteraction: true},
        hitFilter: sinon.stub(),
      };
      pvt = new PageVisibilityTracker(tracker, opts);
      assert.deepEqual(pvt.opts, opts);
      pvt.remove();
    });

    it('stores the initial visibility state', function(done) {
      if (!document.visibilityState) this.skip();

      const pvt = new PageVisibilityTracker(tracker);

      // The data is written async, so we use a timeout before checking.
      setTimeout(() => {
        const storeData = pvt.store.get();
        assert(storeData.state);
        assert(storeData.time);
        assert(storeData.pageId);
        assert(storeData.sessionId);

        const localStorageData = JSON.parse(localStorage.getItem(
            `autotrack:${TRACKING_ID}:plugins/page-visibility-tracker`));
        assert(localStorageData.state);
        assert(localStorageData.time);
        assert(localStorageData.pageId);

        pvt.remove();
        done();
      });
    });
  });
});
