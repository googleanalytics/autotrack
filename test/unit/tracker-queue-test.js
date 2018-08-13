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

 import IdleQueue from '../../lib/idle-queue';
import {getOrCreateTrackerQueue} from '../../lib/tracker-queue';

const sandbox = sinon.createSandbox();
let tracker;

const getFields = (overrides = {}) => {
  return Object.assign({}, {
    trackingId: 'UA-12345-1',
    cookieDomain: 'auto',
    siteSpeedSampleRate: 0,
  }, overrides);
};

describe('getOrCreateTrackerQueue', () => {
  beforeEach((done) => {
    sandbox.restore();

    window.ga('create', getFields());
    window.ga((t) => {
      tracker = t;
      done();
    });
  });

  afterEach(() => {
    sandbox.restore();
    window.ga('remove');
  });

  it('creates an instance of IdleQueue for the passed tracker', () => {
    const queue = getOrCreateTrackerQueue(tracker);

    assert(queue instanceof IdleQueue);

    queue.destroy();
  });

  it('does not create more than one instance per tracking ID', () => {
    const queue1 = getOrCreateTrackerQueue(tracker);
    const queue2 = getOrCreateTrackerQueue(tracker);

    assert.strictEqual(queue1, queue2);

    queue1.destroy();
    queue2.destroy(); // Not really needed.
  });
});
