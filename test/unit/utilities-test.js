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
import qs from 'querystring';
import * as utilities from '../../lib/utilities';


const DEFAULT_FIELDS = {
  trackingId: 'UA-12345-1',
  cookieDomain: 'auto',
  siteSpeedSampleRate: 0,
};


describe('utilities', () => {
  let tracker;
  let hits;

  beforeEach((done) => {
    hits = [];
    window.ga('create', DEFAULT_FIELDS);
    window.ga((t) => {
      tracker = t;
      const originalSendHitTask = tracker.get('sendHitTask');
      tracker.set('sendHitTask', (model) => {
        hits.push(qs.parse(model.get('hitPayload')));
        originalSendHitTask(model);
      });

      done();
    });
  });

  afterEach(() => {
    window.ga('remove');
  });

  describe('deferUntilPluginsLoaded', () => {
    it('queues a function to be run prior to the first send', () => {
      utilities.deferUntilPluginsLoaded(tracker, () => {
        tracker.set('dimension1', '1');
        tracker.send('event');
      });
      utilities.deferUntilPluginsLoaded(tracker, () => {
        tracker.set('dimension2', '2');
      });
      utilities.deferUntilPluginsLoaded(tracker, () => {
        tracker.set('dimension3', '3');
      });
      tracker.send('pageview');

      assert.strictEqual(hits[0].cd1, '1');
      assert.strictEqual(hits[0].cd2, undefined);
      assert.strictEqual(hits[0].cd3, undefined);

      assert.strictEqual(hits[1].cd1, '1');
      assert.strictEqual(hits[1].cd2, '2');
      assert.strictEqual(hits[1].cd3, '3');
    });

    it('runs the function in the next task if send is not yet called',
        (done) => {
      utilities.deferUntilPluginsLoaded(tracker, () => {
        tracker.set('dimension1', '1');
        tracker.send('event');
      });
      utilities.deferUntilPluginsLoaded(tracker, () => {
        tracker.set('dimension2', '2');
      });
      utilities.deferUntilPluginsLoaded(tracker, () => {
        tracker.set('dimension3', '3');
      });
      setTimeout(() => {
        tracker.send('pageview');

        assert.strictEqual(hits[0].cd1, '1');
        assert.strictEqual(hits[0].cd2, undefined);
        assert.strictEqual(hits[0].cd3, undefined);

        assert.strictEqual(hits[1].cd1, '1');
        assert.strictEqual(hits[1].cd2, '2');
        assert.strictEqual(hits[1].cd3, '3');
        done();
      }, 100);
    });

    it('runs queued functions in the order they were queued', () => {
      const order = [];
      utilities.deferUntilPluginsLoaded(tracker, () => order.push(1));
      utilities.deferUntilPluginsLoaded(tracker, () => order.push(2));
      utilities.deferUntilPluginsLoaded(tracker, () => order.push(3));
      tracker.send('pageview');

      assert.strictEqual(order[0], 1);
      assert.strictEqual(order[1], 2);
      assert.strictEqual(order[2], 3);
    });
  });
});
