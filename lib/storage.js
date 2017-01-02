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


import {assign} from './utilities';


const AUTOTRACK_PREFIX = 'autotrack';
const stores = {};
let isListening = false;


export default class Store {
  /**
   * A storage object to simplify interacting with localStorage.
   * @param {string} trackingId The tracking ID for the GA property.
   * @param {string} namespace A namespace unique to this store.
   * @param {Object=} defaults An optional object of key/value defaults.
   * @return {Store} The Store instance.
   */
  constructor(trackingId, namespace, defaults) {
    const key = [AUTOTRACK_PREFIX, trackingId, namespace].join(':');

    // Don't create multiple instances for the same property.
    if (stores[key]) {
      return stores[key];
    } else {
      stores[key] = this;
      if (!isListening) initStorageListener();
    }

    this.key = key;
    this.defaults = defaults || {};
  }

  /**
   * Gets the data stored in localStorage for this store.
   * @return {Object} The stored data merged with the defaults.
   */
  get() {
    // TODO(philipwalton): Implementation schema migrations if/when a new
    // schema version is introduced.
    return parse(
        window.localStorage && window.localStorage.getItem(this.key),
        this.defaults);
  }

  /**
   * Saves the passed data object to localStorage,
   * merging it with the existing data.
   * @param {Object} newData The data to save.
   */
  set(newData) {
    const oldData = this.get();
    const mergedData = assign(oldData, newData);
    window.localStorage &&
        window.localStorage.setItem(this.key, JSON.stringify(mergedData));
  }

  /**
   * Clears the data in localStorage for the current store.
   */
  clear() {
    window.localStorage && window.localStorage.removeItem(this.key);
  }

  /**
   * Removes the store instance for the global stores map. If this is the last
   * store instance, the storage listener is also removed.
   * Note: this does not erase the stored data. Use `clear()` for that.
   */
  destroy() {
    delete stores[this.key];
    if (!Object.keys(stores).length) {
      removeStorageListener();
    }
  }

  /**
   * A function to be invoked whenever the storage event fires for this
   * storage key.
   * The function is passed two objects: (newData, oldData).
   */
  storageDidChangeInAnotherWindow() {
    // Set on instance.
    // TODO(philipwalton): consider allowing multiple callbacks here.
    // As it stands, if another plugin creates an instance for the same
    // tracker, these methods will be overridden.
  }
}


/**
 * Adds a single storage event listener and flips the global `isListening`
 * flag so multiple events aren't added.
 */
function initStorageListener() {
  window.addEventListener('storage', storageListener);
  isListening = true;
}


/**
 * Removes the storage event listener and flips the global `isListening`
 * flag so it can be re-added later.
 */
function removeStorageListener() {
  window.removeEventListener('storage', storageListener);
  isListening = false;
}


/**
 * The global storage event listener.
 * @param {StorageEvent} event The DOM event.
 */
function storageListener(event) {
  const store = stores[event.key];
  if (store) {
    const oldData = parse(event.oldValue, store.defaults);
    const newData = parse(event.newValue, store.defaults);
    store.storageDidChangeInAnotherWindow(newData, oldData);
  }
}


/**
 * Parses a source string as JSON and merges the result with the passed
 * defaults object. If an error occurs while
 * @param {string} source A JSON string of data.
 * @param {Object} defaults An object of key/value defaults.
 * @return {Object} The parsed data object merged with the passed defaults.
 */
function parse(source, defaults) {
  let data;
  try {
    data = JSON.parse(source);
  } catch(err) {
    data = {};
  }
  return assign({}, defaults, data);
}
