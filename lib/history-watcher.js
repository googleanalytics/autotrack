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


var nativeHistory = window.history;
var nativePushState;
var nativeReplaceState;

var listeners = [];
var isWatchingHistoryApi;


/**
 * Wraps native history methods to track URL changes via `pushState()`,
 * `replaceState()`, and the `popstate` event.
 */
function wrapHistoryMethods() {
  // Overrides history.pushState.
  nativePushState = nativeHistory.pushState;
  nativeHistory.pushState = function() {
    nativePushState.apply(history, arguments);
    handleHistoryChange();
  }.bind(this);

  // Overrides history.repaceState.
  nativeReplaceState = nativeHistory.replaceState;
  nativeHistory.replaceState = function() {
    nativeReplaceState.apply(history, arguments);
    handleHistoryChange(true);
  }.bind(this);

  // Handles URL changes via user interaction.
  window.addEventListener('popstate', handleHistoryChange);

  isWatchingHistoryApi = true;
}


/**
 * Loops through each of the added listeners and invokes the callback,
 * optionally passing a boolean to indicate that history was replaced
 * rather than updated.
 * @param {boolean} historyWasReplaced True if the history was changed via
 *     `replaceState()`.
 */
function handleHistoryChange(historyWasReplaced) {
  for (var listener, i = 0; listener = listeners[i]; i++) {
    listener(historyWasReplaced);
  }
};


module.exports = {
  /**
   * Adds a listener to be invoked when the history changes.
   * @param {Function} listener The listener function to add.
   */
  addListener: function(listener) {
    if (!isWatchingHistoryApi) {
      wrapHistoryMethods();
    }
    listeners.push(listener);
  },

  /**
   * Removes an added listener. If all listeners have been removed, the
   * native history methods are restored.
   * @param {Function} listener The listener function to remoe.
   */
  removeListener: function(listener) {
    var listenerIndex = listeners.indexOf(listener);
    if (listenerIndex > -1) {
      listeners.splice(listenerIndex, 1);
    }
    if (!listeners.length) {
      window.removeEventListener('popstate', handleHistoryChange);
      nativeHistory.replaceState = nativeReplaceState;
      nativeHistory.pushState = nativePushState;

      isWatchingHistoryApi = false;
    }
  },
};
