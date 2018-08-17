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

import IdleValue from '../../lib/idle-value';
import {nextIdleCallback} from './helpers';


const sandbox = sinon.createSandbox();

describe('IdleValue', () => {
  beforeEach(() => {
    sandbox.restore();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('IdleValue', () => {
    describe('constructor', () => {
      it('initializes a value when idle', async () => {
        const initStub = sandbox.stub().returns('42');
        new IdleValue(initStub);

        assert(initStub.notCalled);

        await nextIdleCallback();

        assert(initStub.calledOnce);
      });
    });

    describe('get', () => {
      it('returns the value immediately when already initialized', async () => {
        const initStub = sandbox.stub().returns('42');
        const idleVal = new IdleValue(initStub);

        await nextIdleCallback();
        assert(initStub.calledOnce);

        const val = idleVal.get();

        assert.strictEqual(val, '42');
      });

      it('runs the init function immediately if the value not yet set', () => {
        const initStub = sandbox.stub().returns('42');
        const idleVal = new IdleValue(initStub);

        assert(initStub.notCalled);

        const val = idleVal.get();
        assert.strictEqual(val, '42');
        assert(initStub.calledOnce);
      });

      it('cancels the idle request if run before idle', async () => {
        const initStub = sandbox.stub().returns('42');
        const idleVal = new IdleValue(initStub);

        const val = idleVal.get();
        assert(initStub.calledOnce);
        assert.strictEqual(val, '42');

        await nextIdleCallback();

        // Assert the init function wasn't called again.
        assert(initStub.calledOnce);
      });

      it('does not initialize the value more than once', async () => {
        const initStub = sandbox.stub().returns('42');
        const idleVal = new IdleValue(initStub);

        let val = idleVal.get();
        assert.strictEqual(val, '42');
        assert(initStub.calledOnce);

        val = idleVal.get();
        assert.strictEqual(val, '42');
        assert(initStub.calledOnce);

        await nextIdleCallback();

        val = idleVal.get();
        assert.strictEqual(val, '42');
        assert(initStub.calledOnce);
      });
    });

    describe('set', () => {
      it('updates the value', () => {
        const initStub = sandbox.stub().returns('42');
        const idleVal = new IdleValue(initStub);

        let val = idleVal.get();
        assert.strictEqual(val, '42');

        idleVal.set('43');

        val = idleVal.get();
        assert.strictEqual(val, '43');
      });

      it('cancels the idle request if run before idle', async () => {
        const initStub = sandbox.stub().returns('42');
        const idleVal = new IdleValue(initStub);

        idleVal.set('43');
        assert(initStub.notCalled);

        let val = idleVal.get();
        assert.strictEqual(val, '43');
        assert(initStub.notCalled);

        await nextIdleCallback();

        assert(initStub.notCalled);
      });
    });
  });
});
