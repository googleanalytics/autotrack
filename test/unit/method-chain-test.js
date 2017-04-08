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


import assert from 'assert';
import sinon from 'sinon';
import MethodChain from '../../lib/method-chain';


const TRACKING_ID = 'UA-12345-1';


describe('MethodChain', () => {
  let tracker;
  let trackerGetSpy;
  let trackerSetSpy;
  let trackerBuildHitTaskSpy;

  beforeEach((done) => {
    window.ga('create', TRACKING_ID, 'auto', {siteSpeedSampleRate: 0});
    window.ga('set', 'dimension1', 'foobar');
    window.ga((t) => {
      tracker = t;
      trackerBuildHitTaskSpy = sinon.spy(tracker.get('buildHitTask'));
      tracker.set('buildHitTask', trackerBuildHitTaskSpy);
      tracker.set('sendHitTask', null);
      trackerGetSpy = sinon.spy(tracker, 'get');
      trackerSetSpy = sinon.spy(tracker, 'set');
      done();
    });
  });

  afterEach(() => window.ga('remove'));

  describe('static add', () => {
    it('overrides the passed method', () => {
      const spy1 = sinon.spy();
      const spy2 = sinon.spy();
      const spy3 = sinon.spy();

      const overrideMethod1 = (originalMethod) => {
        return (...args) => {
          spy1();
          return originalMethod(...args);
        };
      };
      const overrideMethod2 = (originalMethod) => {
        return (...args) => {
          spy2();
          return originalMethod(...args);
        };
      };
      const overrideMethod3 = (originalMethod) => {
        return (...args) => {
          spy3();
          return originalMethod(...args);
        };
      };

      MethodChain.add(tracker, 'set', overrideMethod1);
      MethodChain.add(tracker, 'set', overrideMethod2);
      MethodChain.add(tracker, 'set', overrideMethod3);
      tracker.set('page', '/foo');

      assert.notEqual(tracker.set, trackerSetSpy);
      assert(trackerSetSpy.calledOnce);
      assert(spy1.calledOnce);
      assert(spy2.calledOnce);
      assert(spy3.calledOnce);
      assert(tracker.get('page'), '/foo');

      MethodChain.remove(tracker, 'set', overrideMethod1);
      MethodChain.remove(tracker, 'set', overrideMethod2);
      MethodChain.remove(tracker, 'set', overrideMethod3);
    });

    it('supports overriding an analytics.js task', () => {
      const spy1 = sinon.spy();
      const spy2 = sinon.spy();
      const spy3 = sinon.spy();

      const overrideMethod1 = (originalMethod) => {
        return (...args) => {
          spy1();
          return originalMethod(...args);
        };
      };
      const overrideMethod2 = (originalMethod) => {
        return (...args) => {
          spy2();
          return originalMethod(...args);
        };
      };
      const overrideMethod3 = (originalMethod) => {
        return (...args) => {
          spy3();
          return originalMethod(...args);
        };
      };

      MethodChain.add(tracker, 'buildHitTask', overrideMethod1);
      MethodChain.add(tracker, 'buildHitTask', overrideMethod2);
      MethodChain.add(tracker, 'buildHitTask', overrideMethod3);
      tracker.send('pageview', '/foo');

      assert.notEqual(tracker.get('buildHitTask'), trackerBuildHitTaskSpy);
      assert(trackerBuildHitTaskSpy.calledOnce);
      assert(spy1.calledOnce);
      assert(spy2.calledOnce);
      assert(spy3.calledOnce);

      MethodChain.remove(tracker, 'buildHitTask', overrideMethod1);
      MethodChain.remove(tracker, 'buildHitTask', overrideMethod2);
      MethodChain.remove(tracker, 'buildHitTask', overrideMethod3);
    });

    it('does not create a new MethodChain if one already exists', () => {
      const overrideMethod1 = sinon.spy();
      const overrideMethod2 = sinon.spy();

      MethodChain.add(tracker, 'set', overrideMethod1);
      const originalMethodReference1 = tracker.set;

      MethodChain.add(tracker, 'set', overrideMethod2);
      const originalMethodReference2 = tracker.set;

      assert.equal(originalMethodReference1, originalMethodReference2);

      MethodChain.remove(tracker, 'set', overrideMethod1);
      MethodChain.remove(tracker, 'set', overrideMethod2);
    });

    it('calls the original method with the proper args/context', function() {
      const spy1 = sinon.spy();
      const spy2 = sinon.spy();

      const overrideMethod1 = (originalMethod) => {
        return (...args) => {
          spy1();
          return originalMethod(...args);
        };
      };
      const overrideMethod2 = (originalMethod) => {
        return (...args) => {
          spy2();
          return originalMethod(...args);
        };
      };

      MethodChain.add(tracker, 'set', overrideMethod1);
      MethodChain.add(tracker, 'set', overrideMethod2);
      tracker.set('page', '/foo');

      assert(trackerSetSpy.alwaysCalledWith('page', '/foo'));
      assert(trackerSetSpy.alwaysCalledOn(tracker));

      MethodChain.remove(tracker, 'set', overrideMethod1);
      MethodChain.remove(tracker, 'set', overrideMethod2);
    });

    it('supports return values', function() {
      const spy1 = sinon.spy();
      const spy2 = sinon.spy();

      const overrideMethod1 = (originalMethod) => {
        return (...args) => {
          spy1();
          return originalMethod(...args);
        };
      };
      const overrideMethod2 = (originalMethod) => {
        return (...args) => {
          spy2();
          return originalMethod(...args);
        };
      };

      MethodChain.add(tracker, 'get', overrideMethod1);
      MethodChain.add(tracker, 'get', overrideMethod2);

      assert.strictEqual(tracker.get('dimension1'), 'foobar');
      assert(trackerGetSpy.calledOnce);

      MethodChain.remove(tracker, 'get', overrideMethod1);
      MethodChain.remove(tracker, 'get', overrideMethod2);
    });

    it('supports modifying the passed args', function() {
      const overrideMethod1 = (originalMethod) => {
        return (...args) => {
          const queryIndex = args[0].page.indexOf('?');
          if (queryIndex) {
            const parts = args[0].page.split('?');
            args[0].page = parts[0];
            args[0].dimension1 = parts[1];
          }
          return originalMethod(...args);
        };
      };
      const overrideMethod2 = (originalMethod) => {
        return (...args) => {
          args[0].metric1 = true;
          return originalMethod(...args);
        };
      };

      MethodChain.add(tracker, 'set', overrideMethod1);
      MethodChain.add(tracker, 'set', overrideMethod2);
      tracker.set({page: '/path?query'});

      assert(trackerSetSpy.calledWith(sinon.match({
        page: '/path',
        dimension1: 'query',
        metric1: true,
      })));
      assert.strictEqual(tracker.get('page'), '/path');
      assert.strictEqual(tracker.get('dimension1'), 'query');
      assert.strictEqual(tracker.get('metric1'), true);

      MethodChain.remove(tracker, 'set', overrideMethod1);
      MethodChain.remove(tracker, 'set', overrideMethod2);
    });

    it('supports modifying the return value', function() {
      const overrideMethod1 = (originalMethod) => {
        return (...args) => {
          const returnValue = originalMethod(...args);
          return returnValue.replace('foobar', 'not foobar');
        };
      };
      const overrideMethod2 = (originalMethod) => {
        return (...args) => {
          const returnValue = originalMethod(...args);
          return returnValue.replace('not foobar', 'not NOT foobar');
        };
      };

      MethodChain.add(tracker, 'get', overrideMethod1);
      MethodChain.add(tracker, 'get', overrideMethod2);
      assert(tracker.get('dimension1'), 'not NOT foobar');

      MethodChain.remove(tracker, 'get', overrideMethod1);
      MethodChain.remove(tracker, 'get', overrideMethod2);
    });
  });

  describe('static remove', () => {
    it('restores the passed method', () => {
      const spy1 = sinon.spy();
      const spy2 = sinon.spy();
      const spy3 = sinon.spy();

      const overrideMethod1 = (originalMethod) => {
        return (...args) => {
          spy1();
          return originalMethod(...args);
        };
      };
      const overrideMethod2 = (originalMethod) => {
        return (...args) => {
          spy2();
          return originalMethod(...args);
        };
      };
      const overrideMethod3 = (originalMethod) => {
        return (...args) => {
          spy3();
          return originalMethod(...args);
        };
      };

      MethodChain.add(tracker, 'set', overrideMethod1);
      MethodChain.add(tracker, 'set', overrideMethod2);
      MethodChain.add(tracker, 'set', overrideMethod3);

      tracker.set('page', '/foo');

      assert.notEqual(tracker.set, trackerSetSpy);
      assert(trackerSetSpy.calledOnce);
      assert(spy1.calledOnce);
      assert(spy2.calledOnce);
      assert(spy3.calledOnce);
      assert(tracker.get('page'), '/foo');

      trackerSetSpy.reset();
      spy1.reset();
      spy2.reset();
      spy3.reset();

      MethodChain.remove(tracker, 'set', overrideMethod1);
      tracker.set('page', '/bar');

      assert.notEqual(tracker.set, trackerSetSpy);
      assert(trackerSetSpy.calledOnce);
      assert(!spy1.called);
      assert(spy2.calledOnce);
      assert(spy3.calledOnce);
      assert(tracker.get('page'), '/bar');

      trackerSetSpy.reset();
      spy1.reset();
      spy2.reset();
      spy3.reset();

      MethodChain.remove(tracker, 'set', overrideMethod2);
      MethodChain.remove(tracker, 'set', overrideMethod3);
      tracker.set('page', '/qux');

      assert.equal(tracker.set, trackerSetSpy);
      assert(trackerSetSpy.calledOnce);
      assert(!spy1.called);
      assert(!spy2.called);
      assert(!spy3.called);
      assert(tracker.get('page'), '/qux');
    });

    it('supports restoring an analytics.js task', () => {
      const spy1 = sinon.spy();
      const spy2 = sinon.spy();
      const spy3 = sinon.spy();

      const overrideMethod1 = (originalMethod) => {
        return (...args) => {
          spy1();
          return originalMethod(...args);
        };
      };
      const overrideMethod2 = (originalMethod) => {
        return (...args) => {
          spy2();
          return originalMethod(...args);
        };
      };
      const overrideMethod3 = (originalMethod) => {
        return (...args) => {
          spy3();
          return originalMethod(...args);
        };
      };

      MethodChain.add(tracker, 'buildHitTask', overrideMethod1);
      MethodChain.add(tracker, 'buildHitTask', overrideMethod2);
      MethodChain.add(tracker, 'buildHitTask', overrideMethod3);

      tracker.send('pageview', '/foo');

      assert.notEqual(tracker.get('buildHitTask'), trackerBuildHitTaskSpy);
      assert(trackerBuildHitTaskSpy.calledOnce);
      assert(spy1.calledOnce);
      assert(spy2.calledOnce);
      assert(spy3.calledOnce);

      trackerBuildHitTaskSpy.reset();
      spy1.reset();
      spy2.reset();
      spy3.reset();

      MethodChain.remove(tracker, 'buildHitTask', overrideMethod1);
      tracker.send('pageview', '/bar');

      assert.notEqual(tracker.get('buildHitTask'), trackerBuildHitTaskSpy);
      assert(trackerBuildHitTaskSpy.calledOnce);
      assert(!spy1.called);
      assert(spy2.calledOnce);
      assert(spy3.calledOnce);

      trackerBuildHitTaskSpy.reset();
      spy1.reset();
      spy2.reset();
      spy3.reset();

      MethodChain.remove(tracker, 'buildHitTask', overrideMethod2);
      MethodChain.remove(tracker, 'buildHitTask', overrideMethod3);
      tracker.send('pageview', '/qux');

      assert.equal(tracker.get('buildHitTask'), trackerBuildHitTaskSpy);
      assert(trackerBuildHitTaskSpy.calledOnce);
      assert(!spy1.called);
      assert(!spy2.called);
      assert(!spy3.called);
    });
  });
});
