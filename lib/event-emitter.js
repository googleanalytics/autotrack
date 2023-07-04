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


/**
 * An simple reimplementation of the native Node.js EventEmitter class.
 * The goal of this implementation is to be as small as possible.
 */
export default class EventEmitter {
  /**
   * Creates the event registry.
   */
  constructor() {
    this.registry_ = {};
  }

  /**
   * Adds a handler function to the registry for the passed event.
   * @param {string} event The event name.
   * @param {!Function} fn The handler to be invoked when the passed
   *     event is emitted.
   */
  on(event, fn) {
    this.getRegistry_(event).push(fn);
  }

  /**
   * Removes a handler function from the registry for the passed event.
   * @param {string=} event The event name.
   * @param {Function=} fn The handler to be removed.
   */
  off(event = undefined, fn = undefined) {
    if (event && fn) {
      const eventRegistry = this.getRegistry_(event);
      const handlerIndex = eventRegistry.indexOf(fn);
      if (handlerIndex > -1) {
        eventRegistry.splice(handlerIndex, 1);
      }
    } else {
      this.registry_ = {};
    }
  }

  /**
   * Runs all registered handlers for the passed event with the optional args.
   * @param {string} event The event name.
   * @param {...*} args The arguments to be passed to the handler.
   */
  emit(event, ...args) {
    this.getRegistry_(event).forEach((fn) => fn(...args));
  }

  /**
   * Returns an array of handlers associated with the passed event name.
   * If no handlers have been registered, an empty array is returned.
   * @private
   * @param {string} event The event name.
   * @return {!Array} An array of handler functions.
   */
  getRegistry_(event) {
    return this.registry_[event] = (this.registry_[event] || []);
  }
}
