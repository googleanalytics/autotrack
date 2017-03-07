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


import EventEmitter from './event-emitter';
import {assign} from './utilities';


const AUTOTRACK_PREFIX = 'autotrack';
const instances = {};
let isListening = false;


/** @type {boolean|undefined} */
let browserSupportsLocalStorage;


/**
 * A storage object to simplify interacting with localStorage.
 */
export default class Store extends EventEmitter {
  /**
   * Gets an existing instance for the passed arguements or creates a new
   * instance if one doesn't exist.
   * @param {string} trackingId The tracking ID for the GA property.
   * @param {string} namespace A namespace unique to this store.
   * @param {Object=} defaults An optional object of key/value defaults.
   * @return {Store} The Store instance.
   */
  static getOrCreate(trackingId, namespace, defaults) {
    const key = [AUTOTRACK_PREFIX, trackingId, namespace].join(':');

    // Don't create multiple instances for the same tracking Id and namespace.
    if (!instances[key]) {
      instances[key] = new Store(key, defaults);
      if (!isListening) initStorageListener();
    }
    return instances[key];
  }

  /**
   * Returns true if the browser supports and can successfully write to
   * localStorage. The results is cached so this method can be invoked many
   * times with no extra performance cost.
   * @private
   * @return {boolean}
   */
  static isSupported_() {
    if (browserSupportsLocalStorage != null) {
      return browserSupportsLocalStorage;
    }

    try {
      window.localStorage.setItem(AUTOTRACK_PREFIX, AUTOTRACK_PREFIX);
      window.localStorage.removeItem(AUTOTRACK_PREFIX);
      browserSupportsLocalStorage = true;
    } catch (err) {
      browserSupportsLocalStorage = false;
    }
    return browserSupportsLocalStorage;
  }

  /**
   * Wraps the native localStorage method for each stubbing in tests.
   * @private
   * @param {string} key The store key.
   * @return {string|null} The stored value.
   */
  static get_(key) {
    return window.localStorage.getItem(key);
  }

  /**
   * Wraps the native localStorage method for each stubbing in tests.
   * @private
   * @param {string} key The store key.
   * @param {string} value The value to store.
   */
  static set_(key, value) {
    window.localStorage.setItem(key, value);
  }

  /**
   * Wraps the native localStorage method for each stubbing in tests.
   * @private
   * @param {string} key The store key.
   */
  static clear_(key) {
    window.localStorage.removeItem(key);
  }

  /**
   * @param {string} key A key unique to this store.
   * @param {Object=} defaults An optional object of key/value defaults.
   */
  constructor(key, defaults = {}) {
    super();
    this.key_ = key;
    this.defaults_ = defaults;

    /** @type {?Object} */
    this.cache_ = null; // Will be set after the first get.
  }

  /**
   * Gets the data stored in localStorage for this store. If the cache is
   * already populated, return it as is (since it's always kept up-to-date
   * and in sync with activity in other windows via the `storage` event).
   * TODO(philipwalton): Implement schema migrations if/when a new
   * schema version is introduced.
   * @return {!Object} The stored data merged with the defaults.
   */
  get() {
    if (this.cache_) {
      return this.cache_;
    } else {
      if (Store.isSupported_()) {
        try {
          this.cache_ = parse(Store.get_(this.key_));
        } catch(err) {
          // Do nothing.
        }
      }
      return this.cache_ = assign({}, this.defaults_, this.cache_);
    }
  }

  /**
   * Saves the passed data object to localStorage,
   * merging it with the existing data.
   * @param {Object} newData The data to save.
   */
  set(newData) {
    this.cache_ = assign({}, this.defaults_, this.cache_, newData);

    if (Store.isSupported_()) {
      try {
        Store.set_(this.key_, JSON.stringify(this.cache_));
      } catch(err) {
        // Do nothing.
      }
    }
  }

  /**
   * Clears the data in localStorage for the current store.
   */
  clear() {
    this.cache_ = {};
    if (Store.isSupported_()) {
      try {
        Store.clear_(this.key_);
      } catch(err) {
        // Do nothing.
      }
    }
  }

  /**
   * Removes the store instance for the global instances map. If this is the
   * last store instance, the storage listener is also removed.
   * Note: this does not erase the stored data. Use `clear()` for that.
   */
  destroy() {
    delete instances[this.key_];
    if (!Object.keys(instances).length) {
      removeStorageListener();
    }
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
 * @param {!Event} event The DOM event.
 */
function storageListener(event) {
  const store = instances[event.key];
  if (store) {
    const oldData = assign({}, store.defaults_, parse(event.oldValue));
    const newData = assign({}, store.defaults_, parse(event.newValue));

    store.cache_ = newData;
    store.emit('externalSet', newData, oldData);
  }
}


/**
 * Parses a source string as JSON
 * @param {string|null} source
 * @return {!Object} The JSON object.
 */
function parse(source) {
  let data = {};
  if (source) {
    try {
      data = /** @type {!Object} */ (JSON.parse(source));
    } catch(err) {
      // Do nothing.
    }
  }
  return data;
}
