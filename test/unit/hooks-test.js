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
import Hook from '../../lib/hook';


const TRACKING_ID = 'UA-12345-1';


describe('Hook', () => {
  let tracker;
  let originalSetMethod;
  let originalBuildHitTask;

  beforeEach((done) => {
    window.ga('create', TRACKING_ID, 'auto', {siteSpeedSampleRate: 0});
    window.ga((t) => {
      tracker = t;
      originalSetMethod = tracker.set;
      originalBuildHitTask = tracker.get('buildHitTask');
      done();
    });
  });

  afterEach(() => {
    assert.equal(tracker.set, originalSetMethod);
    assert.equal(tracker.get('buildHitTask'), originalBuildHitTask);
    window.ga('remove');
  });

  describe('static addBefore/addAfter', () => {
    it('wraps the passed method', () => {
      const callback = sinon.spy();
      Hook.addBefore(tracker, 'set', callback);

      assert.notEqual(tracker.set, originalSetMethod);

      Hook.removeBefore(tracker, 'set', callback);
    });

    it('supports wrapping an analytics.js task', () => {
      const callback = sinon.spy();
      Hook.addBefore(tracker, 'buildHitTask', callback);

      assert.notEqual(tracker.get('buildHitTask'), originalBuildHitTask);

      Hook.removeBefore(tracker, 'buildHitTask', callback);
    });

    it('does not create a new hook if one already exists', () => {
      const callback1 = sinon.spy();
      const callback2 = sinon.spy();

      Hook.addBefore(tracker, 'set', callback1);
      var wrappedMethod1 = tracker.set;

      Hook.addBefore(tracker, 'set', callback2);
      var wrappedMethod2 = tracker.set;

      assert.equal(wrappedMethod1, wrappedMethod2);

      Hook.removeBefore(tracker, 'set', callback1);
      Hook.removeBefore(tracker, 'set', callback2);
    });

    it('adds a callback to the method', () => {
      const callback = sinon.spy();
      sinon.spy(tracker, 'set');

      Hook.addBefore(tracker, 'set', callback);
      tracker.set();
      Hook.removeBefore(tracker, 'set', callback);

      assert(callback.calledOnce);
      assert(tracker.set.calledOnce);

      tracker.set.restore();
    });

    it('supports invoking the callback before or after the method', () => {
      let order = [];
      const before1 = () => order.push(1);
      const before2 = () => order.push(2);
      const original = () => order.push(3);
      const after1 = () => order.push(4);
      const after2 = () => order.push(5);
      sinon.stub(tracker, 'set', original);

      Hook.addBefore(tracker, 'set', before1);
      Hook.addBefore(tracker, 'set', before2);
      Hook.addAfter(tracker, 'set', after1);
      Hook.addAfter(tracker, 'set', after2);

      tracker.set();

      Hook.removeBefore(tracker, 'set', before1);
      Hook.removeBefore(tracker, 'set', before2);
      Hook.removeAfter(tracker, 'set', after1);
      Hook.removeAfter(tracker, 'set', after2);

      assert.deepEqual(order, [1, 2, 3, 4, 5]);

      tracker.set.restore();
    });
  });

  describe('static removeBefore/removeAfter', () => {
    it('removes a previously added callback', () => {
      let order = [];
      const before1 = () => order.push(1);
      const before2 = () => order.push(2);
      const original = () => order.push(3);
      const after1 = () => order.push(4);
      const after2 = () => order.push(5);
      sinon.stub(tracker, 'set', original);

      Hook.addBefore(tracker, 'set', before1);
      Hook.addBefore(tracker, 'set', before2);
      Hook.addAfter(tracker, 'set', after1);
      Hook.addAfter(tracker, 'set', after2);

      tracker.set();
      assert.deepEqual(order, [1, 2, 3, 4, 5]);

      Hook.removeBefore(tracker, 'set', before1);
      Hook.removeAfter(tracker, 'set', after2);

      order = [];
      tracker.set();
      assert.deepEqual(order, [2, 3, 4]);

      Hook.removeBefore(tracker, 'set', before2);
      Hook.removeAfter(tracker, 'set', after1);

      order = [];
      tracker.set();
      assert.deepEqual(order, [3]);

      tracker.set.restore();
    });

    it('supports removing callbacks added to analytics.js tasks', () => {
      let order = [];
      const before1 = () => order.push(1);
      const before2 = () => order.push(2);
      const original = () => order.push(3);
      const after1 = () => order.push(4);
      const after2 = () => order.push(5);
      tracker.set('buildHitTask', original);

      var originalSendHitTask = tracker.get('sendHitTask');
      tracker.set('sendHitTask', null); // Prevent hits from being sent.

      Hook.addBefore(tracker, 'buildHitTask', before1);
      Hook.addBefore(tracker, 'buildHitTask', before2);
      Hook.addAfter(tracker, 'buildHitTask', after1);
      Hook.addAfter(tracker, 'buildHitTask', after2);

      tracker.send('data');
      assert.deepEqual(order, [1, 2, 3, 4, 5]);

      Hook.removeBefore(tracker, 'buildHitTask', before1);
      Hook.removeAfter(tracker, 'buildHitTask', after2);

      order = [];
      tracker.send('data');
      assert.deepEqual(order, [2, 3, 4]);

      Hook.removeBefore(tracker, 'buildHitTask', before2);
      Hook.removeAfter(tracker, 'buildHitTask', after1);

      order = [];
      tracker.send('data');
      assert.deepEqual(order, [3]);

      tracker.set('buildHitTask', originalBuildHitTask);
      tracker.set('sendHitTask', originalSendHitTask);
    });

    it('does not error if no matching callback exists', () => {
      assert.doesNotThrow(() => {
        Hook.removeBefore(tracker, 'set', () => {});
        Hook.removeBefore(tracker, 'buildHitTask', () => {});
        Hook.removeAfter(tracker, 'set', () => {});
        Hook.removeAfter(tracker, 'buildHitTask', () => {});
      });
    });

    it('restores the original method if all callbacks are removed', () => {
      const before1 = sinon.spy();
      const before2 = sinon.spy();
      const after1 = sinon.spy();
      const after2 = sinon.spy();

      Hook.addBefore(tracker, 'set', before1);
      Hook.addBefore(tracker, 'set', before2);
      Hook.addAfter(tracker, 'set', after1);
      Hook.addAfter(tracker, 'set', after2);
      Hook.addBefore(tracker, 'buildHitTask', before1);
      Hook.addBefore(tracker, 'buildHitTask', before2);
      Hook.addAfter(tracker, 'buildHitTask', after1);
      Hook.addAfter(tracker, 'buildHitTask', after2);

      assert.notEqual(tracker.set, originalSetMethod);
      assert.notEqual(tracker.get('buildHitTask'), originalBuildHitTask);

      Hook.removeBefore(tracker, 'set', before1);
      Hook.removeBefore(tracker, 'set', before2);
      Hook.removeAfter(tracker, 'set', after1);
      Hook.removeBefore(tracker, 'buildHitTask', before1);
      Hook.removeBefore(tracker, 'buildHitTask', before2);
      Hook.removeAfter(tracker, 'buildHitTask', after1);

      assert.notEqual(tracker.set, originalSetMethod);
      assert.notEqual(tracker.get('buildHitTask'), originalBuildHitTask);

      Hook.removeAfter(tracker, 'set', after2);
      Hook.removeAfter(tracker, 'buildHitTask', after2);

      assert.equal(tracker.set, originalSetMethod);
      assert.equal(tracker.get('buildHitTask'), originalBuildHitTask);
    });
  });
});
