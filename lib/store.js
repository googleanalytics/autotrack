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


import {IdleValue} from 'idlize/IdleValue.mjs';
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
   * @param {StoreOpts=} opts
   * @return {Store} The Store instance.
   */
  static getOrCreate(trackingId, namespace, opts = {}) {
    const key = [AUTOTRACK_PREFIX, trackingId, namespace].join(':');

    // Don't create multiple instances for the same tracking Id and namespace.
    if (!(key in instances)) {
      instances[key] = {
        references: 0,
        value: new Store(key, opts),
      };
    }

    // Only add a single storage listener.
    if (!isListening) {
      initStorageListener();
    }

    ++instances[key].references;
    return instances[key].value;
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
   * @param {StoreOpts=} opts
   */
  constructor(key, opts = {}) {
    super();
    this.key_ = key;
    this.defaults_ = opts.defaults || {};
    this.timestampKey_ = opts.timestampKey;

    this.cache_ = new IdleValue(() => this.read_());
  }

  /**
   * Gets the data stored in localStorage for this store. If the cache is
   * already populated, return it as is (since it's always kept up-to-date
   * and in sync with activity in other windows via the `storage` event).
   * TODO(philipwalton): Implement schema migrations if/when a new
   * schema version is introduced.
   * @return {!Object} The stored data merged with the defaults.
   */
  get data() {
    return assign({}, this.defaults_, this.cache_.getValue());
  }

  /**
   * Saves the passed data object to localStorage,
   * merging it with the existing data.
   * @param {!Object} newData The data to save.
   */
  update(newData) {
    const timestampKey = this.timestampKey_;

    // When using a timestamp key, we need to ensure that the stored data
    // isn't newer than the data we're about to update.
    // This can happen if plugins are using an IdleQueue and tasks in
    // one tab get queue before but run after tasks in another tab.
    let oldData;
    if (timestampKey && typeof newData[timestampKey] === 'number') {
      oldData = this.read_() || {};
      if (typeof oldData[timestampKey] === 'number' &&
          oldData[timestampKey] > newData[timestampKey]) {
        return;
      }
    } else {
      oldData = this.data;
    }

    const newCache = assign(oldData, newData);
    this.cache_.setValue(newCache);
    if (Store.isSupported_()) {
      try {
        Store.set_(this.key_, JSON.stringify(newCache));
      } catch (err) {
        // Do nothing.
      }
    }
  }

  /**
   * Clears the data in localStorage for the current store.
   */
  clear() {
    this.cache_.setValue({});

    if (Store.isSupported_()) {
      try {
        Store.clear_(this.key_);
      } catch (err) {
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
    --instances[this.key_].references;

    if (instances[this.key_].references === 0) {
      this.clear();
      delete instances[this.key_];
    }

    if (Object.keys(instances).length === 0) {
      removeStorageListener();
    }
  }

  /**
   * Reads the data stored in localStorage for this store. This method ignores
   * the cache.
   * @return {Object|undefined}
   */
  read_() {
    if (Store.isSupported_()) {
      try {
        return parse(Store.get_(this.key_));
      } catch (err) {
        // Do nothing.
      }
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
  // Only care about storage events for keys matching stores in instances.
  if (event.key in instances) {
    const store = instances[event.key].value;
    const oldData = assign({}, store.defaults_, parse(event.oldValue));
    const newData = assign({}, store.defaults_, parse(event.newValue));

    store.cache_.setValue(newData);
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
    } catch (err) {
      // Do nothing.
    }
  }
  return data;
}
