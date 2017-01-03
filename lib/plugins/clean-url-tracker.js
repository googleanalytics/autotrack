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
   * It also helps to prevent tracking similar URLs, e.g. sometimes ending a URL
   * with a slash and sometimes not.
   * @param {!Tracker} tracker Passed internally by analytics.js
   * @param {?CleanUrlTrackerOpts} opts Passed by the require command.
   */
  constructor(tracker, opts) {
    trackUsage(tracker, plugins.CLEAN_URL_TRACKER);

    /** @type {CleanUrlTrackerOpts} */
    const defaultOpts = {
      // stripQuery: undefined,
      // queryDimensionIndex: undefined,
      // indexFilename: undefined,
      // trailingSlash: undefined
    };
    this.opts = /** @type {CleanUrlTrackerOpts} */ (assign(defaultOpts, opts));

    this.tracker = tracker;

    /** @type {Function} */
    this.originalTrackerBuildHitTask = null;

    this.overrideTrackerBuildHitTask();
  }

  /**
   * Cleans the URL based on the preferences set in the configuration options.
   * @param {!Model} model An analytics.js Model object.
   */
  cleanUrlTask(model) {
    const location = model.get('location');
    const page = model.get('page');
    const url = parseUrl(page || location);

    const oldPath = url.pathname;
    let newPath = oldPath;

    // If an index filename was provided, remove it if it appears at the end
    // of the URL.
    if (this.opts.indexFilename) {
      const parts = newPath.split('/');
      if (this.opts.indexFilename == parts[parts.length - 1]) {
        parts[parts.length - 1] = '';
        newPath = parts.join('/');
      }
    }

    // Ensure the URL ends with or doesn't end with slash based on the
    // `trailingSlash` option. Note that filename URLs should never contain
    // a trailing slash.
    if (this.opts.trailingSlash == 'remove') {
        newPath = newPath.replace(/\/+$/, '');
    } else if (this.opts.trailingSlash == 'add') {
      const isFilename = /\.\w+$/.test(newPath);
      if (!isFilename && newPath.substr(-1) != '/') {
        newPath = newPath + '/';
      }
    }

    // If a query dimensions index was provided, set the query string portion
    // of the URL on that dimension. If no query string exists on the URL use
    // the NULL_DIMENSION.
    if (this.opts.stripQuery && this.opts.queryDimensionIndex) {
      model.set('dimension' + this.opts.queryDimensionIndex,
          url.query || NULL_DIMENSION, true);
    }

    model.set('page',
        newPath + (!this.opts.stripQuery ? url.search : ''),
        true);
  }

  /**
   * Overrides the tracker's `buildHitTask` to check for proper URL formatting
   * on every hit (not just the initial pageview).
   */
  overrideTrackerBuildHitTask() {
    this.originalTrackerBuildHitTask = this.tracker.get('buildHitTask');

    this.tracker.set('buildHitTask', (model) => {
      this.cleanUrlTask(model);
      this.originalTrackerBuildHitTask(model);
    });
  }

  /**
   * Restores all overridden tasks and methods.
   */
  remove() {
    this.tracker.set('buildHitTask', this.originalTrackerBuildHitTask);
  }
}


provide('cleanUrlTracker', CleanUrlTracker);
