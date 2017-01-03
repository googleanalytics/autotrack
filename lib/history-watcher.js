/**
 * Copyright 2016 Google Inc. All Rights Reserved.
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


import EventEmitter from './event-emitter';


let singleton;
let nativeHistory;
let nativePushState;
let nativeReplaceState;


/**
 * A HistoryWatcher class that allows consumers to subscribe to history changes
 * made via `history.pushState()`, `history.replaceState()`, or user-invoked
 * navigations via the `popstate` event.
 */
export class HistoryWatcher extends EventEmitter {
  /**
   * Overrides the native `history.pushState()` and `history.replaceState()`
   * methods and adds a `popstate` listener.
   */
  constructor() {
    super();

    this.handlePopState_ = this.handlePopState_.bind(this);

    // Assign native history method at instantiation time.
    nativeHistory = window.history;

    // Overrides history.pushState.
    nativePushState = nativeHistory.pushState;
    nativeHistory.pushState = (...args) => {
      nativePushState.apply(history, args);
      this.emit('pushstate', ...args);
    };

    // Overrides history.repaceState.
    nativeReplaceState = nativeHistory.replaceState;
    nativeHistory.replaceState = (...args) => {
      nativeReplaceState.apply(history, args);
      this.emit('replacestate', ...args);
    };

    // Handles URL changes via user interaction.
    window.addEventListener('popstate', this.handlePopState_);
  }

  /**
   * Handles native `popstate` events and emits a local popstate event.
   * @param {Event} event The native popstate event.
   */
  handlePopState_(event) {
    this.emit('popstate', event);
  }

  /**
   * Removes all handlers and restores all native methods.
   */
  destroy() {
    window.removeEventListener('popstate', this.handlePopState_);
    nativeHistory.replaceState = nativeReplaceState;
    nativeHistory.pushState = nativePushState;
    this.off();
    singleton = null;
  }
}


/**
 * @return {HistoryWatcher} The singleton instance.
 */
export default function getHistoryWatcher() {
  if (singleton) {
    return singleton;
  } else {
    return singleton = new HistoryWatcher();
  }
}
