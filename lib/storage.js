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


var assign = require('object-assign');


var AUTOTRACK_LOCAL_STORAGE_KEY = 'autotrack';
var SCHEMA_VERSION = 1;


// Schema:
// ---------------------
// {
//   version: SCHEMA_VERSION,
//   properties: {
//     [trackingId]: {...}
//   }
// }


/**
 * Gets a value stored in localStorage for the passed tracking ID and
 * optionally the passed namespace.
 * @param {string} trackingId The tracking ID for the GA property.
 * @param {string=} namespace An optional key namespace of values to get. Only
 *     keys prefixed with the namespace followed by a colon are returned (e.g.
 *     key `foo` with namespace `ns` would be `ns:foo`).
 * @return {Object} The values found for the passed tracking ID and namespace.
 */
function get(trackingId, namespace) {
  var allData = getStoredData();
  var propertyData = allData.properties[trackingId] || {};
  if (namespace) {
    var data = {};
    Object.keys(propertyData).forEach(function(key) {
      if (key.indexOf(namespace + ':') === 0) {
        data[key.slice(namespace.length + 1)] = propertyData[key];
      }
    });
    return data;
  } else {
    return propertyData;
  }
}


/**
 * Saves data to localStorage for the passed tracking ID and optionally the
 * passed namespace.
 * @param {string} trackingId The tracking ID for the GA property.
 * @param {string=} namespace An optional key namespace to set. Each key in the
 *     passed data object will be set on the storage object with a key
 *     prepended with the namespace prefix followed by a colon, (e.g. key `foo`
 *     with namespace `ns` would be `ns:foo`).
 * @param {Object} data The data to store.
 */
function set(trackingId, namespace, data) {
  if (typeof namespace == 'object') {
    data = namespace;
    namespace = undefined;
  }

  var allData = getStoredData();
  var propertyData = allData.properties[trackingId] ||
      (allData.properties[trackingId] = {});

  if (namespace) {
    var newPropertyData = {};
    Object.keys(data).forEach(function(key) {
      newPropertyData[namespace + ':' + key] = data[key];
    });
    assign(propertyData, newPropertyData);
  } else {
    assign(propertyData, data);
  }
  setStoredData(allData);
}


/**
 * Clears the data in localStorage for the passed tracking ID an optionally
 * the passed namespace.
 * @param {string} trackingId The tracking ID for the GA property.
 * @param {string=} namespace An optional key namespace to clear. Each key in
 *     the stored data object that begins with the namespace will be cleared
 *     (e.g. key `foo` with namespace `ns` would be `ns:foo`).
 */
function clear(trackingId, namespace) {
  var allData = getStoredData();
  var propertyData = allData.properties[trackingId] ||
      (allData.properties[trackingId] = {});

  if (namespace) {
    Object.keys(propertyData).forEach(function(key) {
      if (key.indexOf(namespace) === 0) {
        delete propertyData[key];
      }
    });
  } else {
    delete allData.properties[trackingId];
  }
  setStoredData(allData);
}


module.exports = {
  get: get,
  set: set,
  clear: clear,
  /**
   * Binds the existing public methods to the tracking ID and namespace.
   * @param {string} trackingId The tracking ID for the GA property.
   * @param {string=} namespace An optional key namespace to bind. See
   *     individual methods for details.
   * @return {Object} The bound methods.
   */
  bindAccessors: function(trackingId, namespace) {
    return {
      get: get.bind(null, trackingId, namespace),
      set: set.bind(null, trackingId, namespace),
      clear: clear.bind(null, trackingId, namespace),
    };
  }
};


/**
 * Gets and parses the JSON data stored in localStorage.
 * @return {Object} The parsed JSON data.
 */
function getStoredData() {
  var data;
  try {
    data = JSON.parse(window.localStorage.getItem(AUTOTRACK_LOCAL_STORAGE_KEY));
  } catch (err) {
    // Do nothing...
  }
  data = data || {version: SCHEMA_VERSION};
  data.properties = data.properties || {};
  return data;
}


/**
 * Writes (as JSON) the passed data object to localStorage.
 * @param {Object} data The data to store.
 */
function setStoredData(data) {
  try {
    window.localStorage && window.localStorage.setItem(
        AUTOTRACK_LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch(err) {
    // Do nothing...
  }
}
