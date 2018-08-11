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

import {cIC, isSafari, queueMicrotask, rIC} from './utilities';

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
   */
  constructor() {
    this.idleCallbackHandle_ = null;
    this.taskQueue_ = [];

    // Bind methods
    this.onVisibilityChange_ = this.onVisibilityChange_.bind(this);
    this.onBeforeUnload_ = this.onBeforeUnload_.bind(this);
    this.processTasks_ = this.processTasks_.bind(this);

    addEventListener('visibilitychange', this.onVisibilityChange_, true);

    // Safari does not reliably fire the `pagehide` or `visibilitychange`
    // events when closing a tab, so we have to use `beforeunload` with a
    // timeout to check whether the default action was prevented.
    // - https://bugs.webkit.org/show_bug.cgi?id=151610
    // - https://bugs.webkit.org/show_bug.cgi?id=151234
    // NOTE: we only add this to Safari because adding it to Firefox would
    // prevent the page from being eligible for bfcache.
    if (isSafari()) {
      addEventListener('beforeunload', this.onBeforeUnload_, true);
    }
  }

  /**
   * @param {!Array<!Function>|!Function} tasks
   */
  add(tasks) {
    // Support single functions or arrays of functions.
    if (typeof tasks === 'function') tasks = [tasks];

    const state = {
      time: Date.now(),
      visibilityState: document.visibilityState,
    };

    for (const task of tasks) {
      this.taskQueue_.push({state, task});
    }

    this.scheduleTaskProcessing_();
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
          'beforeunload', this.onBeforeUnload_, true);
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
   * deadline. If no deadline is passed, it will process all tasks
   * immediately. If an `IdleDeadline` object is passed (as is with
   * `requestIdleCallback`) then the tasks are processed until there's
   * no time remaining.
   * @param {IdleDeadline|undefined} deadline
   */
  processTasks_(deadline) {
    this.cancelScheduledTaskProcessing_();

    // Process tasks until there's none left or the deadline has passed.
    while (this.taskQueue_.length > 0 && deadlineNotPassed(deadline)) {
      const {task, state} = this.taskQueue_.shift();

      // Expose the current state to external code.
      this.state_ = this;

      task(state);
    }
    // State should only be exposed while tasks are processing.
    this.state_ = null;

    if (this.taskQueue_.length > 0) {
      this.scheduleTaskProcessing_();
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
      this.processTasks_();
    }
  }

  /**
   * A callback for the `beforeunload` event than runs all pending callbacks
   * immediately. The reason this is used instead of adding `processTasks_`
   * directly is we can't invoke `processTasks_` with an `Event` object.
   */
  onBeforeUnload_() {
    this.processTasks_();
  }
}

/**
 * Returns true if there's no deadline or if there is a deadline but it has
 * not passed.
 * @param {IdleDeadline|undefined} deadline
 * @return {boolean}
 */
const deadlineNotPassed = (deadline) => {
  return !deadline || deadline.timeRemaining() > 0;
};
