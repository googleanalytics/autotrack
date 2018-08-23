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

import {cIC, isSafari, now, queueMicrotask, rIC} from './utilities';


const DEFAULT_MIN_TASK_TIME = 0;

/**
 * A class wraps a queue of requestIdleCallback functions for two reasons:
 *   1. So other callers can know whether or not the queue is empty.
 *.  2. So we can provide some guarantees that the queued functions will
 *.     run in unload-type situations.
 */
export default class IdleQueue {
  /**
   * Creates the IdleQueue instance and adds lifecycle event listeners to
   * run the queue if the page is hidden (with fallback behavior for Safari).
   * @param {!{defaultMinTaskTime: (number|undefined)}=} param1
   */
  constructor({defaultMinTaskTime} = {}) {
    this.idleCallbackHandle_ = null;
    this.taskQueue_ = [];
    this.isProcessing_ = false;
    this.defaultMinTaskTime_ = defaultMinTaskTime || DEFAULT_MIN_TASK_TIME;

    // Bind methods
    this.processTasksImmediately = this.processTasksImmediately.bind(this);
    this.processTasks_ = this.processTasks_.bind(this);
    this.onVisibilityChange_ = this.onVisibilityChange_.bind(this);

    addEventListener('visibilitychange', this.onVisibilityChange_, true);

    // Safari does not reliably fire the `pagehide` or `visibilitychange`
    // events when closing a tab, so we have to use `beforeunload` with a
    // timeout to check whether the default action was prevented.
    // - https://bugs.webkit.org/show_bug.cgi?id=151610
    // - https://bugs.webkit.org/show_bug.cgi?id=151234
    // NOTE: we only add this to Safari because adding it to Firefox would
    // prevent the page from being eligible for bfcache.
    if (isSafari()) {
      addEventListener('beforeunload', this.processTasksImmediately, true);
    }
  }

  /**
   * @param {!Function} task
   * @return {!IdleQueue}
   */
  add(task, {minTaskTime = this.defaultMinTaskTime_} = {}) {
    const state = {
      time: now(),
      visibilityState: document.visibilityState,
    };

    this.taskQueue_.push({state, task, minTaskTime});

    this.scheduleTaskProcessing_();

    // For chaining.
    return this;
  }

  /**
   * Processes all scheduled tasks synchronously.
   */
  processTasksImmediately() {
    // By not passing a deadline, all tasks will be processed sync.
    this.processTasks_();
  }

  /**
   * @return {boolean}
   */
  hasPendingTasks() {
    return this.taskQueue_.length > 0;
  }

  /**
   * Destroys the instance by unregistering all added event listeners and
   * removing any overridden methods.
   */
  destroy() {
    this.taskQueue_ = [];
    this.cancelScheduledTaskProcessing_();

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
          'beforeunload', this.processTasksImmediately, true);
    }
  }

  /**
   * Schedules the task queue to be processed. If the document is in the
   * hidden state, they queue is scheduled as a microtask so it can be run
   * in cases where a macrotask couldn't (like if the page is unloading). If
   * the document is in the visible state, `requestIdleCallback` is used.
   */
  scheduleTaskProcessing_() {
    if (document.visibilityState === 'hidden') {
      queueMicrotask(this.processTasks_);
    } else {
      if (!this.idleCallbackHandle_) {
        this.idleCallbackHandle_ = rIC(this.processTasks_);
      }
    }
  }

  /**
   * Processes as many tasks in the queue as it can before reaching the
   * deadline. If no deadline is passed, it will process all tasks.
   * If an `IdleDeadline` object is passed (as is with `requestIdleCallback`)
   * then the tasks are processed until there's no time remaining, at which
   * we yield to input or other script and wait until the next idle time.
   * @param {!IdleDeadline=} deadline
   */
  processTasks_(deadline = undefined) {
    this.cancelScheduledTaskProcessing_();

    if (!this.isProcessing_) {
      this.isProcessing_ = true;

      // Process tasks until there's no time left or we need to yield to input.
      while (this.hasPendingTasks() &&
          !shouldYield(deadline, this.taskQueue_[0].minTaskTime)) {
        const {task, state} = this.taskQueue_.shift();

        task(state);
      }

      this.isProcessing_ = false;

      if (this.hasPendingTasks()) {
        // Schedule the rest of the tasks for the next idle time.
        this.scheduleTaskProcessing_();
      }
    }
  }

  /**
   * Cancels any scheduled idle callback and removes the handler (if set).
   */
  cancelScheduledTaskProcessing_() {
    cIC(this.idleCallbackHandle_);
    this.idleCallbackHandle_ = null;
  }

  /**
   * A callback for the `visibilitychange` event that runs all pending
   * callbacks immediately if the document's visibility state is hidden.
   */
  onVisibilityChange_() {
    if (document.visibilityState === 'hidden') {
      this.processTasksImmediately();
    }
  }
}

/**
 * Returns true if the IdleDealine object exists and the remaining time is
 * less or equal to than the minTaskTime. Otherwise returns false.
 * @param {IdleDeadline|undefined} deadline
 * @param {number} minTaskTime
 * @return {boolean}
 */
const shouldYield = (deadline, minTaskTime) => {
  if (deadline && deadline.timeRemaining() <= minTaskTime) {
    return true;
  }
  return false;
};
