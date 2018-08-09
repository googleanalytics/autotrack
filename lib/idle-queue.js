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
import {cIC, isSafari, queueMicrotask, rIC, uid} from './utilities';

const instances = {};

/**
 * A class wraps a queue of requestIdleCallback functions for two reasons:
 *   1. So other callers can know whether or not the queue is empty.
 *.  2. So we can provide some guarantees that the queued functions will
 *.     run in unload-type situations.
 */
export default class IdleQueue {
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
      instances[trackingId] = new IdleQueue(tracker);
    }
    return instances[trackingId];
  }

  /**
   * @param {!Tracker} tracker An analytics.js tracker object.
   */
  constructor(tracker) {
    this.tracker_ = tracker;
    this.idleCallbacks_ = {};

    this.pendingIdleCallbacks = 0;
    this.beforeSendCallbacks_ = [];

    // Bind methods
    this.onVisibilityChange_ = this.onVisibilityChange_.bind(this);
    this.trackerSendOverride_ = this.trackerSendOverride_.bind(this);

    MethodChain.add(this.tracker_, 'send', this.trackerSendOverride_);
    addEventListener('visibilitychange', this.onVisibilityChange_, true);

    // Safari does not reliably fire the `pagehide` or `visibilitychange`
    // events when closing a tab, so we have to use `beforeunload` with a
    // timeout to check whether the default action was prevented.
    // - https://bugs.webkit.org/show_bug.cgi?id=151610
    // - https://bugs.webkit.org/show_bug.cgi?id=151234
    // NOTE: we only add this to Safari because adding it to Firefox would
    // prevent the page from being eligible for bfcache.
    if (isSafari()) {
      addEventListener('beforeunload', this.processCallbacksImmediately_, true);
    }
  }

  /**
   * @param {!Function} callback
   */
  addCallback(callback) {
    const id = uid();
    const state = {
      time: Date.now(),
      visibilityState: document.visibilityState,
    };
    const entry = this.idleCallbacks_[id] = {callback, state};
    const wrappedCallback = () => {
      callback(state);
      this.onIdleCalbackRun_(id);
    };

    ++this.pendingIdleCallbacks;

    if (document.visibilityState === 'hidden') {
      queueMicrotask(wrappedCallback);
    } else {
      // Schedule the callback in the idle queue and store its handle (so it
      // can be cancelled later if needed).
      entry.handle = rIC(wrappedCallback);
    }
  }

  /**
   * Destroys the instance by unregistering all added event listeners and
   * removing any overridden methods.
   */
  destroy() {
    this.processCallbacksImmediately_({destroy: true});
    MethodChain.remove(this.tracker_, 'send', this.trackerSendOverride_);
    removeEventListener('visibilitychange', this.onVisibilityChange_, true);

    // Safari does not reliably fire the `pagehide` or `visibilitychange`
    // events when closing a tab, so we have to use `beforeunload` with a
    // timeout to check whether the default action was prevented.
    // - https://bugs.webkit.org/show_bug.cgi?id=151610
    // - https://bugs.webkit.org/show_bug.cgi?id=151234
    // NOTE: we only add this to Safari because adding it to Firefox would
    // prevent the page from being eligible for bfcache.
    if (isSafari()) {
      removeEventListener(
          'beforeunload', this.processCallbacksImmediately_, true);
    }
  }

  /**
   * Loops through each added callbacks, cancels the `requestIdleCallback`
   * function, and (unless the destroy flag is `true`), runs each callback
   * in a microtask.
   * @param {{destroy: (boolean)}=} param1
   *     destroy: When true the callbacks are removed and not run.
   */
  processCallbacksImmediately_({destroy = false} = {}) {
    if (this.pendingIdleCallbacks > 0) {
      Object.keys(this.idleCallbacks_).forEach((id) => {
        const {handle, callback, state} = this.idleCallbacks_[id];

        if (handle) {
          cIC(handle);
        }

        if (!destroy) {
          queueMicrotask(() => callback(state));
        }
      });
      this.idleCallbacks_ = {};
    }
  }

  /**
   * Deletes a callback from the stored set and decremets the pending count.
   * @param {number} id
   */
  onIdleCalbackRun_(id) {
    delete this.idleCallbacks_[id];
    --this.pendingIdleCallbacks;

    if (this.pendingIdleCallbacks === 0 &&
        this.trackerSendOverride_ !== null) {
      this.removeTrackerSendOverride_();
    }
  }

  /**
   * A callback for the `visibilitychange` event that runs all pending
   * callbacks immediately if the document's visibility state is hidden.
   */
  onVisibilityChange_() {
    if (document.visibilityState === 'hidden') {
      this.processCallbacksImmediately_();
    }
  }

  /**
   * Generates an override for the `tracker.send()` method.
   * @param {!Function} originalMethod
   * @return {!Function}
   */
  trackerSendOverride_(originalMethod) {
    return (...args) => {
      if (this.pendingIdleCallbacks === 0) {
        this.removeTrackerSendOverride_();
        originalMethod(...args);
      } else {
        this.beforeSendCallbacks_.push(() => {
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

    this.beforeSendCallbacks_.forEach((callback) => callback());
    this.beforeSendCallbacks_ = [];
  }
}
