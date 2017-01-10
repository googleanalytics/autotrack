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


/**
 * @fileoverview
 * The functions exported by this module make it easier (and safer) to wrap
 * foreign object methods (in a modular way) and run callbacks whenever
 * those methods are invoked. The primary feature is the ability to wrap a
 * method without worrying if it's already been wrapped somewhere else in the
 * codebase. It also allows for safe unwrapping by only fullying unwrapping
 * a method once all hooks have been removed.
 */


import EventEmitter from './event-emitter';


const instances = [];
const BEFORE = 'before';
const AFTER = 'after';


/**
 * A class that wraps a foreign object method and emit events before and
 * after the original method is called.
 */
export default class Hook extends EventEmitter {
  /**
   * Wraps the passed object method so that the provided callback is run
   * anytime the passed object method is invoked (immediately beforehand).
   * @param {!Object} obj The object containing the method to hook into.
   * @param {string} methodName The name of the method on the object.
   * @param {!Function} fn The callback to add.
   */
  static addBefore(obj, methodName, fn) {
    getOrCreateHook(obj, methodName).on(BEFORE, fn);
  }

  /**
   * Wraps the passed object method so that the provided callback is run
   * anytime the passed object method is invoked (immediately afterward).
   * @param {!Object} obj The object containing the method to add a callback.
   * @param {string} methodName The name of the method on the object.
   * @param {!Function} fn The callback to add.
   */
  static addAfter(obj, methodName, fn) {
    getOrCreateHook(obj, methodName).on(AFTER, fn);
  }

  /**
   * Removes a callback added via `addBefore()`. If the callback is the
   * only callback added, the method is unwrapped and restored.
   * @param {!Object} obj The object containing the method to remove a callback.
   * @param {string} methodName The name of the method on the object.
   * @param {!Function} fn The callback to remove.
   */
  static removeBefore(obj, methodName, fn) {
    getOrCreateHook(obj, methodName).off(BEFORE, fn)
  }

  /**
   * Removes a callback added via `addAfter()`. If the callback is the
   * only callback added, the method is unwrapped and restored.
   * @param {!Object} obj The object containing the method to remove a callback.
   * @param {string} methodName The name of the method on the object.
   * @param {!Function} fn The callback to remove.
   */
  static removeAfter(obj, methodName, fn) {
    getOrCreateHook(obj, methodName).off(AFTER, fn)
  }

  /**
   * Wraps a foreign object method and overrides it. Also stores a reference
   * to the original method so it can be restored later.
   * @param {!Object} obj The object containing the method.
   * @param {string} methodName The name of the method on the object.
   */
  constructor(obj, methodName) {
    super();
    this.obj = obj;
    this.methodName = methodName;
    this.isTask = /Task$/.test(methodName);
    this.originalMethodRef = this.isTask ?
        obj.get(methodName) : obj[methodName];

    // Wraps the original method.
    this.wrappedMethod = (...args) => {
      this.emit(BEFORE, ...args);
      this.originalMethodRef.call(obj, ...args);
      this.emit(AFTER, ...args);
    };

    // Override original method with the wrapped one.
    if (this.isTask) {
      obj.set(methodName, this.wrappedMethod);
    } else {
      obj[methodName] = this.wrappedMethod;
    }
  }

  /**
   * Calls super and destroys the instance if no registered handlers remain.
   * @param {...*} args
   */
  off(...args) {
    // TODO(philipwalton): super is not currently support by closure compiler,
    // so we have to manually reference the super class.
    EventEmitter.prototype.off.call(this, ...args);
    if (this.getEventCount() === 0) this.destroy();
  }

  /**
   * Calls super and destroys the instance if no registered handlers remain.
   */
  destroy() {
    const index = instances.indexOf(this);
    if (index > -1) {
      instances.splice(index, 1);
      if (this.isTask) {
        this.obj.set(this.methodName, this.originalMethodRef);
      } else {
        this.obj[this.methodName] = this.originalMethodRef;
      }
    }
  }
}


/**
 * Gets a Hook instance for the passed object and method. If the method has
 * already been wrapped via an existing Hook instance, that hook is returned.
 * @param {!Object} obj The object containing the method.
 * @param {string} methodName The name of the method on the object.
 * @return {!Hook}
 */
function getOrCreateHook(obj, methodName) {
  let hook = instances
      .filter((h) => h.obj == obj && h.methodName == methodName)[0];

  if (!hook) {
    hook = new Hook(obj, methodName);
    instances.push(hook);
  }
  return hook;
}
