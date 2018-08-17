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

import IdleQueue from './idle-queue';


const instances = {};

/**
 * A class that enforces a unique IdleQueue per tracker.
 */
export default class TrackerQueue extends IdleQueue {
  /**
   * Gets an existing instance for the passed tracker or creates a new
   * instance if one doesn't exist.
   * @param {!Tracker} tracker An analytics.js tracker object.
   * @return {!TrackerQueue}
   */
  static getOrCreate(tracker) {
    // Don't create multiple instances for the same tracker.
    const trackingId = tracker.get('trackingId');

    if (!(trackingId in instances)) {
      instances[trackingId] = {
        references: 0,
        value: new TrackerQueue(tracker),
      };
    }

    ++instances[trackingId].references;
    return instances[trackingId].value;
  }

  /**
   * @param {!Tracker} tracker]
   */
  constructor(tracker) {
    super();
    this.tracker = tracker;
  }

  /**
   * Removes a reference from the instances map. If no more references exist
   * for this instance, destroy it.
   */
  destroy() {
    const trackingId = this.tracker.get('trackingId');

    --instances[trackingId].references;

    if (instances[trackingId].references === 0) {
      super.destroy();
      delete instances[trackingId];
    }
  }
}
