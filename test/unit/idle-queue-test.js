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


import {dispatch} from 'dom-utils';
import IdleQueue from '../../lib/idle-queue';
import {isSafari, queueMicrotask, rIC} from '../../lib/utilities';

/*
 * A wrapper around `sinon.stub()` for properties that supports non-existent
 * own properties (sinon doesn't).
 */
const stubProperty = (obj, prop, value) => {
  if (!obj.hasOwnProperty(prop)) {
    return {
      value: (value) => {
        Object.defineProperty(obj, prop, {value, configurable: true});
      },
    };
  } else {
    return sandbox.stub(obj, prop);
  }
};


const getFields = (overrides = {}) => {
  return Object.assign({}, {
    trackingId: 'UA-12345-1',
    cookieDomain: 'auto',
    siteSpeedSampleRate: 0,
  }, overrides);
};

const sandbox = sinon.createSandbox();
let tracker;
let hits;

describe('IdleQueue', () => {
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

  describe('constructor', () => {
    it('adds a lifecycle event listeners to window', () => {
      sandbox.spy(window, 'addEventListener');

      const queue = new IdleQueue(tracker);

      if (isSafari()) {
        assert(window.addEventListener.calledTwice);
        assert(window.addEventListener.calledWith(
            'beforeunload', sinon.match.func, true));
      } else {
        assert(window.addEventListener.calledOnce);
      }
      assert(window.addEventListener.calledWith(
          'visibilitychange', sinon.match.func, true));

      queue.destroy();
    });

    it('overrides and defers the tracker.send method', (done) => {
      const originalSendMethod = tracker.send;
      const queue = new IdleQueue(tracker);

      // Creating the queue should have overridden the `send()` method.
      assert.notEqual(originalSendMethod, tracker.send);

      queue.addCallback(() => {
        tracker.set('dimension1', 'A');
        tracker.set('dimension2', 'A');
      });
      queue.addCallback(() => {
        tracker.set('dimension2', 'B');
        tracker.set('dimension3', 'B');
      });
      // This normally runs sync, but when creating the idle queue it
      // automatically queues the first `send()` call to allow plugin creation
      // logic to finish before any hits are sent.
      tracker.send('pageview');
      tracker.send('pageview');

      rIC(() => {
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
        done();
      });
    });

    it('immediately restores the send method if the queue is empty', () => {
      const originalSendMethod = tracker.send;
      const queue = new IdleQueue(tracker);

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

  describe('addCallback', () => {
    it('queues a task to run (when idle if supported)', (done) => {
      stubProperty(document, 'visibilityState').value('visible');

      const spy = sandbox.spy();
      const queue = new IdleQueue(tracker);

      queue.addCallback(spy);

      assert(spy.notCalled);
      rIC(() => {
        assert(spy.calledOnce);

        queue.destroy();
        done();
      });
    });

    it('runs the callback as a microtask when in the hidden state', (done) => {
      stubProperty(document, 'visibilityState').value('hidden');

      const spy = sandbox.spy();
      const queue = new IdleQueue(tracker);

      queue.addCallback(spy);

      queueMicrotask(() => {
        assert(spy.calledOnce);

        queue.destroy();
        done();
      });
    });

    it('runs tasks in order', async () => {
      const testQueueOrder = (visibilityState) => {
        return new Promise((resolve) => {
          stubProperty(document, 'visibilityState').value(visibilityState);

          const spy1 = sandbox.spy();
          const spy2 = sandbox.spy();
          const spy3 = sandbox.spy();
          const queue = new IdleQueue(tracker);

          queue.addCallback(spy1);
          queue.addCallback(spy2);
          queue.addCallback(spy3);

          assert(spy1.notCalled);
          assert(spy2.notCalled);
          assert(spy3.notCalled);

          rIC(() => {
            assert(spy1.calledOnce);
            assert(spy1.calledBefore(spy2));

            assert(spy2.calledOnce);
            assert(spy2.calledBefore(spy3));

            assert(spy3.calledOnce);

            queue.destroy();
            resolve();
          });
        });
      };

      await testQueueOrder('visible');
      await testQueueOrder('hidden');
    });

    it('runs nested tasks in order', async () => {
      const testQueueOrder = (visibilityState) => {
        return new Promise((resolve) => {
          stubProperty(document, 'visibilityState').value(visibilityState);

          const spy1 = sandbox.spy();
          const spy2 = sandbox.spy();
          const spy3 = sandbox.spy();
          const spy4 = sandbox.spy();
          const spy5 = sandbox.spy();
          const spy6 = sandbox.spy();

          const queue = new IdleQueue(tracker);

          queue.addCallback(spy1);
          queue.addCallback(() => {
            queue.addCallback(() => {
              spy4();
              queue.addCallback(spy6);
            });
            spy2();
          });
          queue.addCallback(() => {
            queue.addCallback(spy5);
            spy3();
          });

          // Nest the `rIC()` calls to ensure nested tasks are run.
          rIC(() => {
            rIC(() => {
              rIC(() => {
                assert(spy1.calledOnce);
                assert(spy1.calledBefore(spy2));
                assert(spy2.calledOnce);
                assert(spy2.calledBefore(spy3));
                assert(spy3.calledOnce);
                assert(spy3.calledBefore(spy4));
                assert(spy4.calledOnce);
                assert(spy4.calledBefore(spy5));
                assert(spy5.calledOnce);

                queue.destroy();
                resolve();
              });
            });
          });
        });
      };

      await testQueueOrder('visible');
      await testQueueOrder('hidden');
    });

    it('handles changes in visibilityState while the queue is pending',
        (done) => {
      stubProperty(document, 'visibilityState').value('visible');

      const spy1 = sandbox.spy();
      const spy2 = sandbox.spy();
      const spy3 = sandbox.spy();
      const queue = new IdleQueue(tracker);

      queue.addCallback(spy1);
      queue.addCallback(spy2);
      assert(spy1.notCalled);
      assert(spy2.notCalled);

      stubProperty(document, 'visibilityState').value('hidden');
      dispatch(document, 'visibilitychange', self);

      queueMicrotask(() => {
        assert(spy1.calledOnce);
        assert(spy2.calledOnce);
        assert(spy3.notCalled);

        queue.addCallback(spy3);

        queueMicrotask(() => {
          assert(spy3.calledOnce);

          queue.destroy();
          done();
        });
      });
    });

    it('does not run queued tasks twice after a visibilitychange', (done) => {
      stubProperty(document, 'visibilityState').value('visible');

      const spy1 = sandbox.spy();
      const spy2 = sandbox.spy();
      const queue = new IdleQueue(tracker);

      queue.addCallback(spy1);
      queue.addCallback(spy2);
      assert(spy1.notCalled);
      assert(spy2.notCalled);

      stubProperty(document, 'visibilityState').value('hidden');
      dispatch(document, 'visibilitychange', self);

      queueMicrotask(() => {
        assert(spy1.calledOnce);
        assert(spy2.calledOnce);

        // Wait until the next idle point to assert the tasks weren't re-called.
        rIC(() => {
          assert(spy1.calledOnce);
          assert(spy2.calledOnce);

          queue.destroy();
          done();
        });
      });
    });
  });

  describe('destroy', () => {
    it('removes all added listeners', () => {
      sandbox.spy(self, 'removeEventListener');

      const queue = new IdleQueue(tracker);
      assert(self.removeEventListener.notCalled);

      queue.destroy();

      if (isSafari()) {
        assert(self.removeEventListener.calledTwice);
        assert(self.removeEventListener.calledWith(
            'beforeunload', sinon.match.func, true));
      } else {
        assert(self.removeEventListener.calledOnce);
      }
      assert(self.removeEventListener.calledWith(
          'visibilitychange', sinon.match.func, true));
    });

    it('reverts overridden methods', () => {
      const originalSendMethod = tracker.send;

      const queue = new IdleQueue(tracker);
      assert.notEqual(originalSendMethod, tracker.send);

      queue.destroy();
      assert.strictEqual(originalSendMethod, tracker.send);
    });
  });
});
