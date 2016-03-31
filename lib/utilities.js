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


var utilities = {

  /**
   * Accepts a function and returns a wrapped version of the function that is
   * expected to be called elsewhere in the system. If it's not called
   * elsewhere after the timeout period, it's called regardless. The wrapper
   * function also prevents the callback from being called more than once.
   * @param {Function} callback The function to call.
   * @param {number} wait How many milliseconds to wait before invoking
   *     the callback.
   * @returns {Function} The wrapped version of the passed function.
   */
  withTimeout: function(callback, wait) {
    var called = false;
    setTimeout(callback, wait || 2000);
    return function() {
      if (!called) {
        called = true;
        callback();
      }
    };
  },


  /**
   * Accepts an object of overrides and defaults and returns a new object
   * with the values merged. For each key in defaults, if there's a
   * corresponding value in overrides, it gets used.
   * @param {Object} overrides The object with properties to override.
   * @param {?Object} defaults The object with properties to use as defaults.
   * @return {Object} The final, merged object.
   */
  defaults: function(overrides, defaults) {
    var result = {};

    if (typeof overrides != 'object') {
      overrides = {};
    }

    if (typeof defaults != 'object') {
      defaults = {};
    }

    for (var key in defaults) {
      if (defaults.hasOwnProperty(key)) {
        result[key] = overrides.hasOwnProperty(key) ?
            overrides[key] : defaults[key];
      }
    }
    return result;
  },


  /**
   * Capitalizes the first letter of a string.
   * @param {string} str The input string.
   * @return {string} The capitalized string
   */
  capitalize: function(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },


  /**
   * Indicates whether the passed variable is a JavaScript object.
   * @param {*} value The input variable to test.
   * @return {boolean} Whether or not the test is an object.
   */
  isObject: function(value) {
    return typeof value == 'object' && value !== null;
  },


  /**
   * Indicates whether the passed variable is a JavaScript array.
   * @param {*} value The input variable to test.
   * @return {boolean} Whether or not the value is an array.
   */
  isArray: Array.isArray || function(value) {
    return Object.prototype.toString.call(value) === '[object Array]';
  },


  /**
   * Accepts a value that may or may not be an array. If it is not an array,
   * it is returned as the first item in a single-item array.
   * @param {*} value The value to convert to an array if it is not.
   * @return {Array} The array-ified value.
   */
  toArray: function(value) {
    return utilities.isArray(value) ? value : [value];
  }
};

module.exports = utilities;
