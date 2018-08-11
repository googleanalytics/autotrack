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

import MethodChain from './method-chain';
import IdleQueue from './idle-queue';

const instances = {};

/**
 * A class wraps a queue of requestIdleCallback functions for two reasons:
 *   1. So other callers can know whether or not the queue is empty.
 *.  2. So we can provide some guarantees that the queued functions will
 *.     run in unload-type situations.
 */
export default class TrackerQueue extends IdleQueue {
  /**
   * Gets an existing instance for the passed arguments or creates a new
   * instance if one doesn't exist.
   * @param {!Tracker} tracker An analytics.js tracker object.
   * @return {Session} The Session instance.
   */
  static getOrCreate(tracker) {
    // Don't create multiple instances for the same property.
    const trackingId = tracker.get('trackingId');
    if (!instances[trackingId]) {
      instances[trackingId] = new IdleQueue();
    }
    return instances[trackingId];
  }

  /**
   * @param {!Tracker} tracker An analytics.js tracker object.
   */
  constructor(tracker) {
    super();

    this.tracker_ = tracker;
    this.beforeSendCallbackQueue_ = [];

    // Bind methods
    this.trackerSendOverride_ = this.trackerSendOverride_.bind(this);

    MethodChain.add(this.tracker_, 'send', this.trackerSendOverride_);
  }

  /**
   * Adds logic to the superclass method to remove the tracker.send override
   * the first time the queue is empty.
   * @param {...*} args The arguments to be passed to the handler.
   */
  processCallbacks_(...args) {
    super.processCallbacks_(...args);

    if (this.callbackQueue_.length === 0 &&
        this.trackerSendOverride_ !== null) {
      this.removeTrackerSendOverride_();
    }
  }

  /**
   * Destroys the instance by unregistering all added event listeners and
   * removing any overridden methods.
   */
  destroy() {
    super.destroy();
    MethodChain.remove(this.tracker_, 'send', this.trackerSendOverride_);
  }

  /**
   * Generates an override for the `tracker.send()` method.
   * @param {!Function} originalMethod
   * @return {!Function}
   */
  trackerSendOverride_(originalMethod) {
    return (...args) => {
      if (this.callbackQueue_.length === 0) {
        this.removeTrackerSendOverride_();
        originalMethod(...args);
      } else {
        this.beforeSendCallbackQueue_.push(() => {
          originalMethod(...args);
        });
      }
    };
  }

  /**
   * Restores the `tracker.send()` override function.
   */
  removeTrackerSendOverride_() {
    MethodChain.remove(this.tracker_, 'send', this.trackerSendOverride_);
    this.trackerSendOverride_ = null;

    this.beforeSendCallbackQueue_.forEach((callback) => callback());
    this.beforeSendCallbackQueue_ = [];
  }
}

