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


import {blockingSpy, stubProperty, when} from './idle-queue-test';
import TrackerQueue from '../../lib/tracker-queue';

const sandbox = sinon.createSandbox();
let tracker;
let hits;

const getFields = (overrides = {}) => {
  return Object.assign({}, {
    trackingId: 'UA-12345-1',
    cookieDomain: 'auto',
    siteSpeedSampleRate: 0,
  }, overrides);
};

describe('TrackerQueue', () => {
  beforeEach((done) => {
    sandbox.restore();

    hits = [];
    window.ga('create', getFields());
    window.ga((t) => {
      tracker = t;
      const originalSendHitTask = tracker.get('sendHitTask');
      tracker.set('sendHitTask', (model) => {
        const query = {};
        const hitPayload = model.get('hitPayload');
        hitPayload.split('&').forEach((entry) => {
          const [key, value] = entry.split('=');
          query[decodeURIComponent(key)] = decodeURIComponent(value);
        });

        hits.push(query);
        originalSendHitTask(model);
      });

      done();
    });
  });

  afterEach(() => {
    sandbox.restore();
    window.ga('remove');
  });

  describe('static getOrCreate', () => {
    it('does not create more than one instance per tracking ID', () => {
      const queue1 = TrackerQueue.getOrCreate(tracker);
      const queue2 = TrackerQueue.getOrCreate(tracker);

      assert.strictEqual(queue1, queue2);

      queue1.destroy();
      queue2.destroy(); // Not really needed.
    });
  });

  describe('constructor', () => {
    it('overrides and defers the tracker.send method', async () => {
      stubProperty(document, 'visibilityState').value('visible');

      const originalSendMethod = tracker.send;
      const queue = new TrackerQueue(tracker);

      // Creating the queue should have overridden the `send()` method.
      assert.notEqual(originalSendMethod, tracker.send);

      const spy1 = blockingSpy(5);
      const spy2 = blockingSpy(45);
      const spy3 = blockingSpy(5);
      const spy4 = blockingSpy(45);

      // Add blocking spies to the beginning of the queue to ensure it
      // requests additional idle callbacks. Otherwise the tasks will be
      // invoked sync and it won't test that tracker.send was really deferred.
      queue.add(spy1);
      queue.add(spy2);
      queue.add(spy3);
      queue.add(spy4);

      queue.add(() => {
        tracker.set('dimension1', 'A');
        tracker.set('dimension2', 'A');
      });
      queue.add(() => {
        tracker.set('dimension2', 'B');
        tracker.set('dimension3', 'B');
      });

      // This normally runs sync, but when creating the idle queue it
      // automatically queues the first `send()` call to allow plugin creation
      // logic to finish before any hits are sent.
      tracker.send('pageview');
      tracker.send('pageview');

      await when(() => hits.length == 2);

      // The queue dimension set should be found on this hit
      assert.strictEqual(hits.length, 2);
      assert.strictEqual(hits[0].cd1, 'A');
      assert.strictEqual(hits[0].cd2, 'B');
      assert.strictEqual(hits[0].cd3, 'B');
      assert.strictEqual(hits[1].cd1, 'A');
      assert.strictEqual(hits[1].cd2, 'B');
      assert.strictEqual(hits[1].cd3, 'B');

      // The send method should now be restored.
      assert.strictEqual(originalSendMethod, tracker.send);

      tracker.set('dimension3', 'C');
      tracker.send('pageview');

      // Since the `send()` command has been restored, it should run sync.
      assert.strictEqual(hits.length, 3);
      assert.strictEqual(hits[2].cd1, 'A');
      assert.strictEqual(hits[2].cd2, 'B');
      assert.strictEqual(hits[2].cd3, 'C');

      queue.destroy();
    });

    it('immediately restores the send method if the queue is empty', () => {
      const originalSendMethod = tracker.send;
      const queue = new TrackerQueue(tracker);

      // Creating the queue should have overridden the `send()` method.
      assert.notEqual(originalSendMethod, tracker.send);

      tracker.set('dimension1', 'A');

      // Since there's nothing in the idle queue, this should happen sync
      // and the overridden method should be immediately restored.
      tracker.send('pageview');

      assert.strictEqual(originalSendMethod, tracker.send);
      assert.strictEqual(hits.length, 1);
      assert.strictEqual(hits[0].cd1, 'A');

      queue.destroy();
    });
  });

  describe('destroy', () => {
    it('reverts overridden methods', () => {
      const originalSendMethod = tracker.send;

      const queue = new TrackerQueue(tracker);
      assert.notEqual(originalSendMethod, tracker.send);

      queue.destroy();
      assert.strictEqual(originalSendMethod, tracker.send);
    });
  });
});
