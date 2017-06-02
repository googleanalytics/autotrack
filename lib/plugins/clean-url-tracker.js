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


import {parseUrl} from 'dom-utils';
import {NULL_DIMENSION} from '../constants';
import MethodChain from '../method-chain';
import provide from '../provide';
import {plugins, trackUsage} from '../usage';
import {assign} from '../utilities';


/**
 * Class for the `cleanUrlTracker` analytics.js plugin.
 * @implements {CleanUrlTrackerPublicInterface}
 */
class CleanUrlTracker {
  /**
   * Registers clean URL tracking on a tracker object. The clean URL tracker
   * removes query parameters from the page value reported to Google Analytics.
   * It also helps to prevent tracking similar URLs, e.g. sometimes ending a
   * URL with a slash and sometimes not.
   * @param {!Tracker} tracker Passed internally by analytics.js
   * @param {?CleanUrlTrackerOpts} opts Passed by the require command.
   */
  constructor(tracker, opts) {
    trackUsage(tracker, plugins.CLEAN_URL_TRACKER);

    /** @type {CleanUrlTrackerOpts} */
    const defaultOpts = {
      // stripQuery: undefined,
      // queryParamsWhitelist: undefined,
      // queryDimensionIndex: undefined,
      // indexFilename: undefined,
      // trailingSlash: undefined,
      // urlFilter: undefined,
    };
    this.opts = /** @type {CleanUrlTrackerOpts} */ (assign(defaultOpts, opts));

    this.tracker = tracker;

    /** @type {string|null} */
    this.queryDimension = this.opts.stripQuery &&
        this.opts.queryDimensionIndex ?
            `dimension${this.opts.queryDimensionIndex}` : null;

    // Binds methods to `this`.
    this.trackerGetOverride = this.trackerGetOverride.bind(this);
    this.buildHitTaskOverride = this.buildHitTaskOverride.bind(this);

    // Override built-in tracker method to watch for changes.
    MethodChain.add(tracker, 'get', this.trackerGetOverride);
    MethodChain.add(tracker, 'buildHitTask', this.buildHitTaskOverride);
  }

  /**
   * Ensures reads of the tracker object by other plugins always see the
   * "cleaned" versions of all URL fields.
   * @param {function(string):*} originalMethod A reference to the overridden
   *     method.
   * @return {function(string):*}
   */
  trackerGetOverride(originalMethod) {
    return (field) => {
      if (field == 'page' || field == this.queryDimension) {
        const fieldsObj = /** @type {!FieldsObj} */ ({
          location: originalMethod('location'),
          page: originalMethod('page'),
        });
        const cleanedFieldsObj = this.cleanUrlFields(fieldsObj);
        return cleanedFieldsObj[field];
      } else {
        return originalMethod(field);
      }
    };
  }

  /**
   * Cleans URL fields passed in a send command.
   * @param {function(!Model)} originalMethod A reference to the
   *     overridden method.
   * @return {function(!Model)}
   */
  buildHitTaskOverride(originalMethod) {
    return (model) => {
      const cleanedFieldsObj = this.cleanUrlFields({
        location: model.get('location'),
        page: model.get('page'),
      });
      model.set(cleanedFieldsObj, null, true);
      originalMethod(model);
    };
  }

  /**
   * Accepts of fields object containing URL fields and returns a new
   * fields object with the URLs "cleaned" according to the tracker options.
   * @param {!FieldsObj} fieldsObj
   * @return {!FieldsObj}
   */
  cleanUrlFields(fieldsObj) {
    const url = parseUrl(
        /** @type {string} */ (fieldsObj.page || fieldsObj.location));

    let pathname = url.pathname;

    // If an index filename was provided, remove it if it appears at the end
    // of the URL.
    if (this.opts.indexFilename) {
      const parts = pathname.split('/');
      if (this.opts.indexFilename == parts[parts.length - 1]) {
        parts[parts.length - 1] = '';
        pathname = parts.join('/');
      }
    }

    // Ensure the URL ends with or doesn't end with slash based on the
    // `trailingSlash` option. Note that filename URLs should never contain
    // a trailing slash.
    if (this.opts.trailingSlash == 'remove') {
        pathname = pathname.replace(/\/+$/, '');
    } else if (this.opts.trailingSlash == 'add') {
      const isFilename = /\.\w+$/.test(pathname);
      if (!isFilename && pathname.substr(-1) != '/') {
        pathname = pathname + '/';
      }
    }

    /** @type {!FieldsObj} */
    const cleanedFieldsObj = {
      page: pathname + (this.opts.stripQuery ?
          this.stripNonWhitelistedQueryParams(url.search) : url.search),
    };
    if (fieldsObj.location) {
      cleanedFieldsObj.location = fieldsObj.location;
    }
    if (this.queryDimension) {
      cleanedFieldsObj[this.queryDimension] =
          url.search.slice(1) || NULL_DIMENSION;
    }

    // Apply the `urlFieldsFilter()` option if passed.
    if (typeof this.opts.urlFieldsFilter == 'function') {
      /** @type {!FieldsObj} */
      const userCleanedFieldsObj =
          this.opts.urlFieldsFilter(cleanedFieldsObj, parseUrl);

      // Ensure only the URL fields are returned.
      const returnValue = {
        page: userCleanedFieldsObj.page,
        location: userCleanedFieldsObj.location,
      };
      if (this.queryDimension) {
        returnValue[this.queryDimension] =
            userCleanedFieldsObj[this.queryDimension];
      }
      return returnValue;
    } else {
      return cleanedFieldsObj;
    }
  }

  /**
   * Accpets a raw URL search string and returns a new search string containing
   * only the site search params (if they exist).
   * @param {string} searchString The URL search string (starting with '?').
   * @return {string} The query string
   */
  stripNonWhitelistedQueryParams(searchString) {
    if (Array.isArray(this.opts.queryParamsWhitelist)) {
      const foundParams = [];
      searchString.slice(1).split('&').forEach((kv) => {
        const [key, value] = kv.split('=');
        if (this.opts.queryParamsWhitelist.indexOf(key) > -1 && value) {
          foundParams.push([key, value]);
        }
      });

      return foundParams.length ?
          '?' + foundParams.map((kv) => kv.join('=')).join('&') : '';
    } else {
      return '';
    }
  }

  /**
   * Restores all overridden tasks and methods.
   */
  remove() {
    MethodChain.remove(this.tracker, 'get', this.trackerGetOverride);
    MethodChain.remove(this.tracker, 'buildHitTask', this.buildHitTaskOverride);
  }
}


provide('cleanUrlTracker', CleanUrlTracker);
