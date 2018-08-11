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

const sandbox = sinon.createSandbox();

/**
 * A wrapper around `sinon.stub()` that supports non-existent own properties.
 * @param {!Object} obj
 * @param {string} prop
 * @param {*} value
 * @return {{value: !Function}}
 */
export const stubProperty = (obj, prop, value) => {
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

export const blockingSpy = (ms) => {
  return sandbox.stub().callsFake(() => {
    const startTime = performance.now();
    while (performance.now() - startTime < ms) {
      // Do nothing.
    }
  });
};

export const when = async (fn, intervalMillis = 100, retries = 20) => {
  for (let i = 0; i < retries; i++) {
    const result = await fn();
    if (result) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMillis));
  }
  throw new Error(`${fn} didn't return true after ${retries} retries.`);
};

const nextMicroTask = () => new Promise((res) => queueMicrotask(res));
const nextIdleCallback = () => new Promise((res) => rIC(res));

describe('IdleQueue', () => {
  beforeEach(() => {
    sandbox.restore();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('constructor', () => {
    it('adds lifecycle event listeners that process callbacks immediately',
        () => {
      sandbox.spy(window, 'addEventListener');

      const queue = new IdleQueue();

      assert(window.addEventListener.calledWith(
          'visibilitychange', sinon.match.func, true));

      if (isSafari()) {
        assert(window.addEventListener.calledWith(
            'beforeunload', sinon.match.func, true));
      } else {
        assert(!window.addEventListener.calledWith(
            'beforeunload', sinon.match.func, true));
      }

      stubProperty(document, 'visibilityState').value('visible');

      const spy1 = sinon.spy();
      const spy2 = sinon.spy();

      queue.addCallback(spy1);
      queue.addCallback(spy2);
      dispatch(window, 'beforeunload');

      if (isSafari()) {
        assert(spy1.calledOnce);
        assert(spy2.calledOnce);
      } else {
        assert(spy1.notCalled);
        assert(spy2.notCalled);
      }

      const spy3 = sinon.spy();
      const spy4 = sinon.spy();
      const spy5 = sinon.spy();

      queue.addCallback(spy3);
      queue.addCallback(spy4);
      queue.addCallback(spy5);

      stubProperty(document, 'visibilityState').value('hidden');
      dispatch(document, 'visibilitychange');

      assert(spy1.calledOnce);
      assert(spy2.calledOnce);
      assert(spy3.calledOnce);

      queue.destroy();
    });
  });

  describe('addCallback', () => {
    it('queues a task to run when idle', async () => {
      stubProperty(document, 'visibilityState').value('visible');

      const spy1 = sinon.spy();
      const spy2 = sinon.spy();
      const spy3 = sinon.spy();

      const queue = new IdleQueue();

      queue.addCallback(spy1);
      queue.addCallback(spy2);
      queue.addCallback(spy3);

      assert(spy1.notCalled);
      assert(spy2.notCalled);
      assert(spy3.notCalled);

      await nextIdleCallback();

      // At this point at least one of the spies should have been called, but
      // not necessarily all of them (it depends on the idle time remaining).
      assert(spy1.calledOnce);

      await when(() => spy3.calledOnce);

      assert(spy1.calledOnce);
      assert(spy2.calledOnce);
      assert(spy3.calledOnce);

      queue.destroy();
    });

    it('waits until the next idle period if all tasks cannot finish',
        async () => {
      stubProperty(document, 'visibilityState').value('visible');

      const spy1 = blockingSpy(5);
      const spy2 = blockingSpy(45);
      const spy3 = blockingSpy(5);
      const spy4 = blockingSpy(5);
      const rICSpy = sinon.spy();

      const queue = new IdleQueue();

      queue.addCallback(spy1);
      queue.addCallback(spy2);
      queue.addCallback(spy3);
      queue.addCallback(spy4);

      // rICSpy is queued after the 4 spies above,
      // but it should run at some point between them.
      rIC(rICSpy);

      assert(spy1.notCalled);
      assert(spy2.notCalled);
      assert(spy3.notCalled);
      assert(spy4.notCalled);
      assert(rICSpy.notCalled);

      await nextIdleCallback();

      // At this point the one set of idle callbacks should have been called,
      // but any that couldn't finished within the time remaining should have
      // been queued for the next idle time.
      assert(spy1.calledOnce);
      assert(rICSpy.calledOnce);
      assert(spy4.notCalled);

      await when(() => spy4.calledOnce);

      assert(spy1.calledOnce);
      assert(spy2.calledOnce);
      assert(spy3.calledOnce);
      assert(spy4.calledOnce);

      assert(rICSpy.calledOnce);
      assert(rICSpy.calledAfter(spy1));
      assert(rICSpy.calledBefore(spy4));

      queue.destroy();
    });

    it('runs the callback as a microtask when in the hidden state',
        async () => {
      stubProperty(document, 'visibilityState').value('hidden');

      const spy1 = sinon.spy();
      const spy2 = sinon.spy();
      const spy3 = sinon.spy();

      const queue = new IdleQueue();

      queue.addCallback(spy1);
      queue.addCallback(spy2);
      queue.addCallback(spy3);

      assert(spy1.notCalled);
      assert(spy2.notCalled);
      assert(spy3.notCalled);

      await nextMicroTask();

      assert(spy1.calledOnce);
      assert(spy2.calledOnce);
      assert(spy3.calledOnce);

      queue.destroy();
    });

    it('runs tasks in order', async () => {
      const testQueueOrder = async (visibilityState) => {
        stubProperty(document, 'visibilityState').value(visibilityState);

        const spy1 = sinon.spy();
        const spy2 = sinon.spy();
        const spy3 = sinon.spy();
        const queue = new IdleQueue();

        queue.addCallback(spy1);
        queue.addCallback(spy2);
        queue.addCallback(spy3);

        assert(spy1.notCalled);
        assert(spy2.notCalled);
        assert(spy3.notCalled);

        await when(() => spy3.calledOnce);

        assert(spy1.calledOnce);
        assert(spy1.calledBefore(spy2));
        assert(spy2.calledOnce);
        assert(spy2.calledBefore(spy3));
        assert(spy3.calledOnce);

        queue.destroy();
      };

      await testQueueOrder('visible');
      await testQueueOrder('hidden');
    });

    it('runs nested tasks in order', async () => {
      const testQueueOrder = async (visibilityState) => {
        stubProperty(document, 'visibilityState').value(visibilityState);

        const spy1 = sinon.spy();
        const spy2 = sinon.spy();
        const spy3 = sinon.spy();
        const spy4 = sinon.spy();
        const spy5 = sinon.spy();
        const spy6 = sinon.spy();

        const queue = new IdleQueue();

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

        await when(() => spy6.calledOnce);

        assert(spy1.calledOnce);
        assert(spy1.calledBefore(spy2));
        assert(spy2.calledOnce);
        assert(spy2.calledBefore(spy3));
        assert(spy3.calledOnce);
        assert(spy3.calledBefore(spy4));
        assert(spy4.calledOnce);
        assert(spy4.calledBefore(spy5));
        assert(spy5.calledOnce);
        assert(spy5.calledBefore(spy6));
        assert(spy6.calledOnce);

        queue.destroy();
      };

      await testQueueOrder('visible');
      await testQueueOrder('hidden');
    });

    it('runs nested tasks in order across idle periods', async () => {
      stubProperty(document, 'visibilityState').value('visible');

      const spy1 = blockingSpy(5);
      const spy2 = blockingSpy(45);
      const spy3 = blockingSpy(5);
      const spy4 = blockingSpy(45);
      const spy5 = blockingSpy(5);
      const spy6 = blockingSpy(45);

      const queue = new IdleQueue();

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

      await when(() => spy6.calledOnce);

      assert(spy1.calledOnce);
      assert(spy1.calledBefore(spy2));
      assert(spy2.calledOnce);
      assert(spy2.calledBefore(spy3));
      assert(spy3.calledOnce);
      assert(spy3.calledBefore(spy4));
      assert(spy4.calledOnce);
      assert(spy4.calledBefore(spy5));
      assert(spy5.calledOnce);
      assert(spy5.calledBefore(spy6));
      assert(spy6.calledOnce);

      queue.destroy();
    });

    it('handles changes in visibilityState while the queue is pending',
        async () => {
      stubProperty(document, 'visibilityState').value('visible');

      const spy1 = blockingSpy(5);
      const spy2 = blockingSpy(45);
      const spy3 = blockingSpy(5);
      const spy4 = blockingSpy(45);
      const spy5 = blockingSpy(5);
      const spy6 = blockingSpy(45);

      const queue = new IdleQueue();

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

      // This should run at some point in the middle of the 6 spies running.
      // Ensure that the remaining spies are called immediately.
      rIC(() => {
        assert(spy1.calledOnce);
        assert(spy6.notCalled);

        dispatch(window, 'beforeunload');

        if (isSafari()) {
          assert(spy6.calledOnce);
        } else {
          assert(spy6.notCalled);
        }

        stubProperty(document, 'visibilityState').value('hidden');
        dispatch(document, 'visibilitychange');

        assert(spy6.calledOnce);
      });

      await when(() => spy6.calledOnce);

      assert(spy1.calledOnce);
      assert(spy1.calledBefore(spy2));
      assert(spy2.calledOnce);
      assert(spy2.calledBefore(spy3));
      assert(spy3.calledOnce);
      assert(spy3.calledBefore(spy4));
      assert(spy4.calledOnce);
      assert(spy4.calledBefore(spy5));
      assert(spy5.calledOnce);
      assert(spy5.calledBefore(spy6));
      assert(spy6.calledOnce);

      queue.destroy();
    });

    it('does not run queued tasks twice after a visibilitychange', async () => {
      stubProperty(document, 'visibilityState').value('visible');

      const spy1 = sinon.spy();
      const spy2 = sinon.spy();
      const queue = new IdleQueue();

      queue.addCallback(spy1);
      queue.addCallback(spy2);
      assert(spy1.notCalled);
      assert(spy2.notCalled);

      dispatch(window, 'beforeunload');

      stubProperty(document, 'visibilityState').value('hidden');
      dispatch(document, 'visibilitychange');

      assert(spy1.calledOnce);
      assert(spy2.calledOnce);

      // Wait until the next idle point to assert the tasks weren't re-called.
      await nextIdleCallback();

      assert(spy1.calledOnce);
      assert(spy2.calledOnce);

      queue.destroy();
    });
  });

  describe('destroy', () => {
    it('removes all added listeners', () => {
      sandbox.spy(self, 'removeEventListener');

      const queue = new IdleQueue();
      assert(self.removeEventListener.notCalled);

      queue.destroy();

      assert(self.removeEventListener.calledWith(
          'visibilitychange', sinon.match.func, true));

      if (isSafari()) {
        assert(window.removeEventListener.calledWith(
            'beforeunload', sinon.match.func, true));
      } else {
        assert(!window.removeEventListener.calledWith(
            'beforeunload', sinon.match.func, true));
      }
    });
  });
});
