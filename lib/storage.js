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
 * Gets a value stored in localStorage (or the source data string) for the
 * passed key and tracking ID.
 * @param {string} trackingId The tracking ID for the GA property.
 * @param {string} key A key to retrieve a specific value.
 * @param {string} sourceData An optional string of source data.
 * @return {Object} The value found on the passed tracking ID and key.
 */
function get(trackingId, key, sourceData) {
  var allData = parseSourceData(sourceData || getStoredData());
  var propertyData = allData.properties[trackingId] || {};
  return propertyData[key];
}


/**
 * Saves data to localStorage for the specified tracking ID.
 * @param {string} trackingId The tracking ID for the GA property.
 * @param {Object} data The data to store.
 */
function set(trackingId, data) {
  var allData = parseSourceData(getStoredData());
  var oldPropertyData = allData.properties[trackingId] || {};
  var newPropertyData = assign(oldPropertyData, data);
  allData.properties[trackingId] = newPropertyData;
  setStoredData(allData);
}


module.exports = {
  get: get,
  set: set,
};


/**
 * Gets the JSON data stored in localStorage.
 * @return {string} The JSON data.
 */
function getStoredData() {
  return window.localStorage &&
      window.localStorage.getItem(AUTOTRACK_LOCAL_STORAGE_KEY);
}


/**
 * Writes the passed data object to localStorage.
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


/**
 * Parses a string of JSON data and returns an object according to the schema
 * defined in the comments above. If the source string cannot be parsed, a
 * default object is returned.
 * @param {string} sourceData A JSON string of data to parse.
 * @return {Object} The parsed data.
 */
function parseSourceData(sourceData) {
  var data;
  try {
    data = JSON.parse(sourceData);
  } catch (err) {
    // Do nothing...
  }
  data = data || {version: SCHEMA_VERSION};
  data.properties = data.properties || {};
  return data;
}
