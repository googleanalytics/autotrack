/**
 * Copyright 2018 Google Inc. All Rights Reserved.
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

import {IdleQueue} from 'idlize/IdleQueue.mjs';


const instances = {};

/**
 * A class that enforces a unique IdleQueue per tracking ID.
 */
export default class TrackerQueue extends IdleQueue {
  /**
   * Gets an existing instance for the passed tracking ID or creates a new
   * instance if one doesn't exist.
   * @param {string} trackingId An analytics.js tracking ID.
   * @return {!TrackerQueue}
   */
  static getOrCreate(trackingId) {
    // Don't create multiple instances for the same tracking ID.
    if (!(trackingId in instances)) {
      instances[trackingId] = {
        references: 0,
        value: new TrackerQueue(trackingId),
      };
    }

    ++instances[trackingId].references;
    return instances[trackingId].value;
  }

  /**
   * @param {string} trackingId
   */
  constructor(trackingId) {
    // If an idle callback is being run in between frame rendering, it'll
    // have an initial `timeRemaining()` value <= 16ms. If it's run when
    // no frames are being rendered, it'll have an initial
    // `timeRemaining()` <= 50ms. Since all the tasks queued by autotrack
    // are non-critial and non-UI-related, we do not want our tasks to
    // interfere with frame rendering, and therefore by default we pick a
    // `defaultMinTaskTime` value > 16ms, so tasks are always processed
    // outside of frame rendering.
    super({defaultMinTaskTime: 25, ensureTasksRun: true});

    this.trackingId_ = trackingId;
  }

  /**
   * Removes a reference from the instances map. If no more references exist
   * for this instance, destroy it.
   */
  destroy() {
    --instances[this.trackingId_].references;

    if (instances[this.trackingId_].references === 0) {
      super.destroy();
      delete instances[this.trackingId_];
    }
  }
}
