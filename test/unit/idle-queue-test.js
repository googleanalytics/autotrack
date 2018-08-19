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
import {nextMicroTask, nextIdleCallback, when} from './helpers';
import IdleQueue from '../../lib/idle-queue';
import {isSafari, rIC} from '../../lib/utilities';


const sandbox = sinon.createSandbox();

/**
 * A wrapper around `sinon.stub()` that supports non-existent own properties.
 * @param {!Object} obj
 * @param {string} prop
 * @param {*} value
 * @return {{value: !Function}}
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

const blockingSpy = (ms) => {
  return sandbox.stub().callsFake(() => {
    const startTime = +new Date;
    while (new Date - startTime < ms) {
      // Do nothing.
    }
  });
};

describe('IdleQueue', () => {
  beforeEach(() => {
    sandbox.restore();
    stubProperty(document, 'visibilityState').value('visible');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('constructor', () => {
    it('adds lifecycle event listeners that process tasks immediately', () => {
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

      const spy1 = sandbox.spy();
      const spy2 = sandbox.spy();

      queue.add(spy1);
      queue.add(spy2);
      dispatch(window, 'beforeunload');

      if (isSafari()) {
        assert(spy1.calledOnce);
        assert(spy2.calledOnce);
      } else {
        assert(spy1.notCalled);
        assert(spy2.notCalled);
      }

      const spy3 = sandbox.spy();
      const spy4 = sandbox.spy();
      const spy5 = sandbox.spy();

      queue.add(spy3);
      queue.add(spy4);
      queue.add(spy5);

      stubProperty(document, 'visibilityState').value('hidden');
      dispatch(document, 'visibilitychange');

      assert(spy3.calledOnce);
      assert(spy4.calledOnce);
      assert(spy5.calledOnce);

      queue.destroy();
    });
  });

  describe('add', () => {
    it('queues a task to run when idle', async () => {
      const spy1 = sandbox.spy();
      const spy2 = sandbox.spy();
      const spy3 = sandbox.spy();

      const queue = new IdleQueue();

      // Since this idle callback is scheduled before the spies are added,
      // It should always run first.
      rIC(() => {
        assert(spy1.notCalled);
        assert(spy2.notCalled);
        assert(spy3.notCalled);
      });

      queue.add(spy1);
      queue.add(spy2);
      queue.add(spy3);

      assert(spy1.notCalled);
      assert(spy2.notCalled);
      assert(spy3.notCalled);

      await when(() => spy3.calledOnce);

      assert(spy1.calledOnce);
      assert(spy2.calledOnce);
      assert(spy3.calledOnce);

      queue.destroy();
    });

    it('supports passing an array of tasks', async () => {
      const spy1 = sandbox.spy();
      const spy2 = sandbox.spy();
      const spy3 = sandbox.spy();

      const queue = new IdleQueue();

      queue.add([spy1, spy2, spy3]);

      assert(spy1.notCalled);
      assert(spy2.notCalled);
      assert(spy3.notCalled);

      await when(() => spy3.calledOnce);

      assert(spy1.calledOnce);
      assert(spy2.calledOnce);
      assert(spy3.calledOnce);

      queue.destroy();
    });

    it('waits until the next idle period if all tasks cannot finish',
        async () => {
      const spy1 = blockingSpy(5);
      const spy2 = blockingSpy(45);
      const spy3 = blockingSpy(5);
      const spy4 = blockingSpy(5);
      const rICSpy = sandbox.spy();

      const queue = new IdleQueue();

      queue.add([spy1, spy2, spy3, spy4]);

      // This callback is queue after the 4 spies, but it should run at some
      // point between them.
      rIC(rICSpy);

      assert(spy1.notCalled);
      assert(spy2.notCalled);
      assert(spy3.notCalled);
      assert(spy4.notCalled);
      assert(rICSpy.notCalled);

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

    it('runs the task as a microtask when in the hidden state',
        async () => {
      stubProperty(document, 'visibilityState').value('hidden');

      const spy1 = sandbox.spy();
      const spy2 = sandbox.spy();
      const spy3 = sandbox.spy();

      const queue = new IdleQueue();

      queue.add([spy1, spy2, spy3]);

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

        const spy1 = sandbox.spy();
        const spy2 = sandbox.spy();
        const spy3 = sandbox.spy();
        const queue = new IdleQueue();

        queue.add([spy1, spy2, spy3]);

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

        const spy1 = sandbox.spy();
        const spy2 = sandbox.spy();
        const spy3 = sandbox.spy();
        const spy4 = sandbox.spy();
        const spy5 = sandbox.spy();
        const spy6 = sandbox.spy();

        const queue = new IdleQueue();

        queue.add(spy1);
        queue.add(() => {
          queue.add(() => {
            spy4();
            queue.add(spy6);
          });
          spy2();
        });
        queue.add(() => {
          queue.add(spy5);
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
      const spy1 = blockingSpy(5);
      const spy2 = blockingSpy(45);
      const spy3 = blockingSpy(5);
      const spy4 = blockingSpy(45);
      const spy5 = blockingSpy(5);
      const spy6 = blockingSpy(45);

      const queue = new IdleQueue();

      queue.add(spy1);
      queue.add(() => {
        queue.add(() => {
          spy4();
          queue.add(spy6);
        });
        spy2();
      });
      queue.add(() => {
        queue.add(spy5);
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
      const spy1 = blockingSpy(5);
      const spy2 = blockingSpy(45);
      const spy3 = blockingSpy(5);
      const spy4 = blockingSpy(45);
      const spy5 = blockingSpy(5);
      const spy6 = blockingSpy(45);

      const queue = new IdleQueue();

      queue.add(spy1);
      queue.add(() => {
        queue.add(() => {
          spy4();
          queue.add(spy6);
        });
        spy2();
      });
      queue.add(() => {
        queue.add(spy5);
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
      const spy1 = sandbox.spy();
      const spy2 = sandbox.spy();
      const queue = new IdleQueue();

      queue.add([spy1, spy2]);
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
