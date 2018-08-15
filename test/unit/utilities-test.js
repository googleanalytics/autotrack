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


import * as utilities from '../../lib/utilities';
import {nextIdleCallback} from './helpers';


const DEFAULT_FIELDS = {
  trackingId: 'UA-12345-1',
  cookieDomain: 'auto',
  siteSpeedSampleRate: 0,
};

const sandbox = sinon.createSandbox();

describe('utilities', () => {
  let tracker;
  let hits;

  beforeEach((done) => {
    sandbox.restore();

    hits = [];
    window.ga('create', DEFAULT_FIELDS);
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

  describe('defineIdleProperty', () => {
    it('defines a getter whose value is idly initialized', async () => {
      const obj = {};

      const init = sandbox.stub().returns('expensiveValue');
      utilities.defineIdleProperty(obj, 'expensiveProp', init);

      assert(init.notCalled);

      await nextIdleCallback();

      assert(init.calledOnce);
      assert.strictEqual(obj.expensiveProp, 'expensiveValue');
    });

    it('initilizes immediately if the property is accessed', async () => {
      const obj = {};

      const init = sandbox.stub().returns('expensiveValue');
      utilities.defineIdleProperty(obj, 'expensiveProp', init);

      assert(init.notCalled);

      assert.strictEqual(obj.expensiveProp, 'expensiveValue');
      assert(init.calledOnce);
    });

    it('does not initialize the property more than once', async () => {
      const obj = {};

      const init = sandbox.stub().returns('expensiveValue');
      utilities.defineIdleProperty(obj, 'expensiveProp', init);

      assert(init.notCalled);

      obj.expensiveProp;
      obj.expensiveProp;
      obj.expensiveProp;
      assert(init.calledOnce);
    });

    it('lets the property be set', () => {
      const obj = {};

      const init = sandbox.stub().returns('expensiveValue');
      utilities.defineIdleProperty(obj, 'expensiveProp', init);

      assert(init.notCalled);

      assert.strictEqual(obj.expensiveProp, 'expensiveValue');
      assert(init.calledOnce);

      obj.expensiveProp = 'newValue';
      assert.strictEqual(obj.expensiveProp, 'newValue');
    });

    it('lets the property be re-idly-defined', () => {
      sandbox.spy(Object, 'defineProperty');

      const obj = {};

      const init1 = sandbox.stub().returns('expensiveValue');
      const init2 = sandbox.stub().returns('newExpensiveValue');
      utilities.defineIdleProperty(obj, 'expensiveProp', init1);

      assert(Object.defineProperty.calledOnce);
      assert(Object.defineProperty.firstCall.calledWith(obj, 'expensiveProp',
          sinon.match({
        configurable: true,
        get: sinon.match.func,
        set: sinon.match.func,
      })));

      assert(init1.notCalled);

      assert.strictEqual(obj.expensiveProp, 'expensiveValue');
      assert(init1.calledOnce);

      utilities.defineIdleProperty(obj, 'expensiveProp', init2);

      assert(Object.defineProperty.calledTwice);
      assert(Object.defineProperty.secondCall.calledWith(obj, 'expensiveProp',
          sinon.match({
        configurable: true,
        get: sinon.match.func,
        set: sinon.match.func,
      })));

      assert(init2.notCalled);

      assert.strictEqual(obj.expensiveProp, 'newExpensiveValue');
      assert(init2.calledOnce);
    });
  });

  describe('defineIdleProperties', () => {
    it('calls defineIdleProperty for each passed prop', async () => {
      sandbox.spy(Object, 'defineProperty');

      const obj = {};

      const init1 = sandbox.stub().returns('value1');
      const init2 = sandbox.stub().returns('value2');

      utilities.defineIdleProperties(obj, {
        prop1: init1,
        prop2: init2,
      });

      assert(Object.defineProperty.calledTwice);
      assert(Object.defineProperty.firstCall.calledWith(obj, 'prop1',
          sinon.match({
        configurable: true,
        get: sinon.match.func,
        set: sinon.match.func,
      })));
      assert(Object.defineProperty.secondCall.calledWith(obj, 'prop2',
          sinon.match({
        configurable: true,
        get: sinon.match.func,
        set: sinon.match.func,
      })));

      assert(init1.notCalled);
      assert(init2.notCalled);

      assert.strictEqual(obj.prop1, 'value1');
      assert(init2.notCalled);

      await nextIdleCallback();

      assert.strictEqual(obj.prop1, 'value1');
      assert.strictEqual(obj.prop2, 'value2');
    });
  });
});
