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


var AUTOTRACK_LOCAL_STORAGE_KEY = '_autotrack';
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
 * Gets the ga metadata stored in localStorage.
 * @return {Object} The ga metadata.
 */
function getStoredData() {
  var data;
  try {
    data = JSON.parse(
        window.localStorage.getItem(AUTOTRACK_LOCAL_STORAGE_KEY));
  } catch (err) {
    // Do nothing...
  }
  data = data || {version: SCHEMA_VERSION};
  data.properties = data.properties || {};
  return data;
}


/**
 * Writes the passed data object to localStorage.
 * @param {Object} data The data to store.
 */
function setStoredData(data) {
  try {
    window.localStorage.setItem(
        AUTOTRACK_LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch(err) {
    // Do nothing...
  }
}


module.exports = {
  /**
   * Gets a value stored in localStorage for the passed key and tracking ID.
   * @param {string} trackingId The tracking ID for the GA property.
   * @param {string} key The key of the stored value.
   * @return {*} The stored value.
   */
  get: function(trackingId, key) {
    var allData = getStoredData();
    var propertyData = allData.properties[trackingId] || {};
    return propertyData[key];
  },

  /**
   * Saves data to localStorage for the specified tracking ID.
   * @param {string} trackingId The tracking ID for the GA property.
   * @param {Object} data The data to store.
   */
  set: function(trackingId, data) {
    var allData = getStoredData();
    var oldPropertyData = allData.properties[trackingId] || {};
    var newPropertyData = assign(oldPropertyData, data);
    allData.properties[trackingId] = newPropertyData;
    setStoredData(allData);
  }
};
