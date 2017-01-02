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


import {getAttributes} from 'dom-utils';


/**
 * Accepts default and user override fields and an optional tracker, hit
 * filter, and target element and returns a single object that can be used in
 * `ga('send', ...)` commands.
 * @param {Object} defaultFields The default fields to return.
 * @param {Object} userFields Fields set by the user to override the defaults.
 * @param {Object} opt_tracker The tracker object to apply the hit filter to.
 * @param {Function} opt_hitFilter A filter function that gets
 *     called with the tracker model right before the `buildHitTask`. It can
 *     be used to modify the model for the current hit only.
 * @param {Element} opt_target If the hit originated from an interaction
 *     with a DOM element, hitFilter is invoked with that element as the
 *     second argument.
 * @return {Object} The final fields object.
 */
export function createFieldsObj(
    defaultFields, userFields, opt_tracker, opt_hitFilter, opt_target) {
  if (typeof opt_hitFilter == 'function') {
    const originalBuildHitTask = opt_tracker.get('buildHitTask');
    return {
      'buildHitTask': (model) => {
        model.set(defaultFields, null, true);
        model.set(userFields, null, true);
        opt_hitFilter(model, opt_target);
        originalBuildHitTask(model);
      }
    };
  }
  else {
    return assign({}, defaultFields, userFields);
  }
}


/**
 * Retrieves the attributes from an DOM element and returns a fields object
 * for all attributes matching the passed prefix string.
 * @param {Element} element The DOM element to get attributes from.
 * @param {string} prefix An attribute prefix. Only the attributes matching
 *     the prefix will be returned on the fields object.
 * @return {Object} An object of analytics.js fields and values
 */
export function getAttributeFields(element, prefix) {
  const attributes = getAttributes(element);
  const attributeFields = {};

  Object.keys(attributes).forEach(function(attribute) {
    // The `on` prefix is used for event handling but isn't a field.
    if (attribute.indexOf(prefix) === 0 && attribute != prefix + 'on') {
      let value = attributes[attribute];

      // Detects Boolean value strings.
      if (value == 'true') value = true;
      if (value == 'false') value = false;

      const field = utilities.camelCase(attribute.slice(prefix.length));
      attributeFields[field] = value;
    }
  });

  return attributeFields;
}


/**
 * Accepts a function to be invoked one the DOM is ready. If the DOM is
 * already ready, the callback is invoked immediately.
 * @param {Function} callback The ready callback.
 */
export function domReady(callback) {
  if (document.readyState == 'loading') {
    document.addEventListener('DOMContentLoaded', function fn() {
      document.removeEventListener('DOMContentLoaded', fn);
      callback();
    });
  } else {
    callback();
  }
}


/**
 * Returns a function, that, as long as it continues to be invoked, will not
 * be triggered. The function will be called after it stops being called for
 * `wait` milliseconds.
 * @param {Function} function to wrap
 * @param {number} timeout in ms (`100`)
 */
export function debounce(fn, wait) {
  let timeout;
  return function() {
    clearTimeout(timeout);
    timeout = setTimeout(fn, wait);
  };
}


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
export function withTimeout(callback, wait) {
  let called = false;
  const fn = function() {
    if (!called) {
      called = true;
      callback();
    }
  };
  setTimeout(fn, wait || 2000);
  return fn;
}


export const assign = Object.assign || function(target, ...sources) {
  for (let source, i = 0; source = sources[i]; i++) {
    for (let key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }
  return target;
};


/**
 * Accepts a string containing hyphen or underscore word separators and
 * converts it to camelCase.
 * @param {string} str The string to camelCase.
 * @return {string} The camelCased version of the string.
 */
export function camelCase(str) {
  return str.replace(/[\-\_]+(\w?)/g, function(match, p1) {
    return p1.toUpperCase();
  });
}


/**
 * Capitalizes the first letter of a string.
 * @param {string} str The input string.
 * @return {string} The capitalized string
 */
export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}


/**
 * Indicates whether the passed variable is a JavaScript object.
 * @param {*} value The input variable to test.
 * @return {boolean} Whether or not the test is an object.
 */
export function isObject(value) {
  return typeof value == 'object' && value !== null;
}


/**
 * Accepts a value that may or may not be an array. If it is not an array,
 * it is returned as the first item in a single-item array.
 * @param {*} value The value to convert to an array if it is not.
 * @return {Array} The array-ified value.
 */
export function toArray(value) {
  return Array.isArray(value) ? value : [value];
}


/**
 * @return {number} The current date timestamp
 */
export function now() {
  return +new Date();
}


/*eslint-disable */
// https://gist.github.com/jed/982883
export const uuid = function b(a){return a?(a^Math.random()*16>>a/4).toString(16):([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,b)};
/*eslint-enable */
