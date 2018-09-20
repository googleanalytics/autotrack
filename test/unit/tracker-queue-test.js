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

import {rIC} from 'idlize/idle-callback-polyfills.mjs';
import {IdleQueue} from 'idlize/IdleQueue.mjs';
import {getIdleDeadlinePrototype, when} from './helpers';
import TrackerQueue from '../../lib/tracker-queue';


const TRACKING_ID = 'UA-12345-1';

const sandbox = sinon.createSandbox();

describe('TrackerQueue', () => {
  beforeEach(() => {
    sandbox.restore();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('static getOrCreate', () => {
    it('creates an instance of for the passed tracker', () => {
      const queue = TrackerQueue.getOrCreate(TRACKING_ID);

      assert(queue instanceof TrackerQueue);

      queue.destroy();
    });

    it('creates an instance that extends IdleQueue', () => {
      const queue = TrackerQueue.getOrCreate(TRACKING_ID);

      assert(queue instanceof IdleQueue);

      queue.destroy();
    });

    it('does not create more than one instance per tracking ID', () => {
      const queue1 = TrackerQueue.getOrCreate(TRACKING_ID);
      const queue2 = TrackerQueue.getOrCreate(TRACKING_ID);

      assert.strictEqual(queue1, queue2);

      queue1.destroy();
      queue2.destroy(); // Not really needed.
    });

    it('sets a defaultMinTaskTime of 25', async () => {
      const idleDeadlinePrototype = await getIdleDeadlinePrototype();

      let timeRemaining;
      sandbox.stub(idleDeadlinePrototype, 'timeRemaining').callsFake(() => {
        return timeRemaining;
      });

      timeRemaining = 13;

      const spy = sandbox.spy();
      const rICSpy = sandbox.spy();

      const queue = TrackerQueue.getOrCreate(TRACKING_ID);
      queue.pushTask(spy);

      rIC(rICSpy);

      await when(() => rICSpy.calledOnce);
      assert(spy.notCalled);

      // Simulate a longer idle period and assert spy is eventually called.
      timeRemaining = 50;
      await when(() => spy.calledOnce);

      queue.destroy();
    });
  });

  describe('destroy', () => {
    it('releases the reference to the instance', () => {
      const queue1 = TrackerQueue.getOrCreate(TRACKING_ID);
      const queue2 = TrackerQueue.getOrCreate(TRACKING_ID);

      assert.strictEqual(queue1, queue2);

      queue1.destroy();

      // queue2 still has a reference, so this shouldn't create a new one
      const queue3 = TrackerQueue.getOrCreate(TRACKING_ID);
      assert.strictEqual(queue2, queue3);

      queue2.destroy();
      queue3.destroy();

      // All the references should be released, so a new one should be created.
      const queue4 = TrackerQueue.getOrCreate(TRACKING_ID);
      assert.notStrictEqual(queue3, queue4);

      queue4.destroy();
    });

    it('destroys the instance if no more references exist', () => {
      sandbox.spy(IdleQueue.prototype, 'destroy');

      const queue1 = TrackerQueue.getOrCreate(TRACKING_ID);
      const queue2 = TrackerQueue.getOrCreate(TRACKING_ID);

      assert.strictEqual(queue1, queue2);

      queue1.destroy();

      assert(IdleQueue.prototype.destroy.notCalled);

      queue2.destroy();

      assert(IdleQueue.prototype.destroy.calledOnce);
      assert(IdleQueue.prototype.destroy.calledOn(queue2));
    });
  });
});
