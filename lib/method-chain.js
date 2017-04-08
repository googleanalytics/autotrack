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
 * The functions exported by this module make it easier (and safer) to override
 * foreign object methods (in a modular way) and respond to or modify their
 * invocation. The primary feature is the ability to override a method without
 * worrying if it's already been overridden somewhere else in the codebase. It
 * also allows for safe restoring of an overridden method by only fully
 * restoring a method once all overrides have been removed.
 */


const instances = [];


/**
 * A class that wraps a foreign object method and emit events before and
 * after the original method is called.
 */
export default class MethodChain {
  /**
   * Adds the passed override method to the list of method chain overrides.
   * @param {!Object} context The object containing the method to chain.
   * @param {string} methodName The name of the method on the object.
   * @param {!Function} methodOverride The override method to add.
   */
  static add(context, methodName, methodOverride) {
    getOrCreateMethodChain(context, methodName).add(methodOverride);
  }

  /**
   * Removes a method chain added via `add()`. If the override is the
   * only override added, the original method is restored.
   * @param {!Object} context The object containing the method to unchain.
   * @param {string} methodName The name of the method on the object.
   * @param {!Function} methodOverride The override method to remove.
   */
  static remove(context, methodName, methodOverride) {
    getOrCreateMethodChain(context, methodName).remove(methodOverride);
  }

  /**
   * Wraps a foreign object method and overrides it. Also stores a reference
   * to the original method so it can be restored later.
   * @param {!Object} context The object containing the method.
   * @param {string} methodName The name of the method on the object.
   */
  constructor(context, methodName) {
    this.context = context;
    this.methodName = methodName;
    this.isTask = /Task$/.test(methodName);

    this.originalMethodReference = this.isTask ?
        context.get(methodName) : context[methodName];

    this.methodChain = [];
    this.boundMethodChain = [];

    // Wraps the original method.
    this.wrappedMethod = (...args) => {
      const lastBoundMethod =
          this.boundMethodChain[this.boundMethodChain.length - 1];

      return lastBoundMethod(...args);
    };

    // Override original method with the wrapped one.
    if (this.isTask) {
      context.set(methodName, this.wrappedMethod);
    } else {
      context[methodName] = this.wrappedMethod;
    }
  }

  /**
   * Adds a method to the method chain.
   * @param {!Function} overrideMethod The override method to add.
   */
  add(overrideMethod) {
    this.methodChain.push(overrideMethod);
    this.rebindMethodChain();
  }

  /**
   * Removes a method from the method chain and restores the prior order.
   * @param {!Function} overrideMethod The override method to remove.
   */
  remove(overrideMethod) {
    const index = this.methodChain.indexOf(overrideMethod);
    if (index > -1) {
      this.methodChain.splice(index, 1);
      if (this.methodChain.length > 0) {
        this.rebindMethodChain();
      } else {
        this.destroy();
      }
    }
  }

  /**
   * Loops through the method chain array and recreates the bound method
   * chain array. This is necessary any time a method is added or removed
   * to ensure proper original method context and order.
   */
  rebindMethodChain() {
    this.boundMethodChain = [];
    for (let method, i = 0; method = this.methodChain[i]; i++) {
      const previousMethod = this.boundMethodChain[i - 1] ||
          this.originalMethodReference.bind(this.context);
      this.boundMethodChain.push(method(previousMethod));
    }
  }

  /**
   * Calls super and destroys the instance if no registered handlers remain.
   */
  destroy() {
    const index = instances.indexOf(this);
    if (index > -1) {
      instances.splice(index, 1);
      if (this.isTask) {
        this.context.set(this.methodName, this.originalMethodReference);
      } else {
        this.context[this.methodName] = this.originalMethodReference;
      }
    }
  }
}


/**
 * Gets a MethodChain instance for the passed object and method. If the method
 * has already been wrapped via an existing MethodChain instance, that
 * instance is returned.
 * @param {!Object} context The object containing the method.
 * @param {string} methodName The name of the method on the object.
 * @return {!MethodChain}
 */
function getOrCreateMethodChain(context, methodName) {
  let methodChain = instances
      .filter((h) => h.context == context && h.methodName == methodName)[0];

  if (!methodChain) {
    methodChain = new MethodChain(context, methodName);
    instances.push(methodChain);
  }
  return methodChain;
}
