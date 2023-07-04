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


import {NULL_DIMENSION} from '../constants';
import provide from '../provide';
import TrackerQueue from '../tracker-queue';
import {plugins, trackUsage} from '../usage';
import {assign, createFieldsObj,
    debounce, isObject, now, toArray} from '../utilities';


/**
 * Declares the MediaQueryList instance cache.
 */
const mediaMap = {};


/**
 * Class for the `mediaQueryTracker` analytics.js plugin.
 * @implements {MediaQueryTrackerPublicInterface}
 */
class MediaQueryTracker {
  /**
   * Registers media query tracking.
   * @param {!Tracker} tracker Passed internally by analytics.js
   * @param {?Object} opts Passed by the require command.
   */
  constructor(tracker, opts) {
    trackUsage(tracker, plugins.MEDIA_QUERY_TRACKER);

    /** @type {!MediaQueryTrackerOpts} */
    const defaultOpts = {
      // definitions: unefined,
      changeTemplate: this.changeTemplate,
      changeTimeout: 1000,
      fieldsObj: {},
      // hitFilter: undefined,
    };

    this.opts = /** @type {!MediaQueryTrackerOpts} */ (
        assign(defaultOpts, opts));

    // Exits early if media query data doesn't exist.
    if (!isObject(this.opts.definitions)) return;

    this.opts.definitions = toArray(this.opts.definitions);
    this.tracker = tracker;
    this.changeListeners = [];

    this.queue = TrackerQueue.getOrCreate(tracker.get('trackingId'));

    this.processMediaQueries();
  }

  /**
   * Loops through each media query definition, sets the custom dimenion data,
   * and adds the change listeners.
   */
  processMediaQueries() {
    this.opts.definitions.forEach((definition) => {
      // Only processes definitions with a name and index.
      if (definition.name && definition.dimensionIndex) {
        const mediaName = this.getMatchName(definition);
        this.tracker.set('dimension' + definition.dimensionIndex, mediaName);

        this.addChangeListeners(definition);
      }
    });
  }

  /**
   * Takes a definition object and return the name of the matching media item.
   * If no match is found, the NULL_DIMENSION value is returned.
   * @param {!Object} definition A set of named media queries associated
   *     with a single custom dimension.
   * @return {string} The name of the matched media or NULL_DIMENSION.
   */
  getMatchName(definition) {
    let match;

    definition.items.forEach((item) => {
      if (getMediaList(item.media).matches) {
        match = item;
      }
    });
    return match ? match.name : NULL_DIMENSION;
  }

  /**
   * Adds change listeners to each media query in the definition list.
   * Debounces the changes to prevent unnecessary hits from being sent.
   * @param {!Object} definition A set of named media queries associated
   *     with a single custom dimension
   */
  addChangeListeners(definition) {
    definition.items.forEach((item) => {
      const mql = getMediaList(item.media);
      const fn = debounce(() => {
        this.handleChanges(definition);
      }, this.opts.changeTimeout);

      mql.addListener(fn);
      this.changeListeners.push({mql, fn});
    });
  }

  /**
   * Handles changes to the matched media. When the new value differs from
   * the old value, a change event is sent.
   * @param {!Object} definition A set of named media queries associated
   *     with a single custom dimension
   */
  handleChanges(definition) {
    const newValue = this.getMatchName(definition);
    const oldValue = this.tracker.get('dimension' + definition.dimensionIndex);

    if (newValue !== oldValue) {
      this.tracker.set('dimension' + definition.dimensionIndex, newValue);
      this.sendChangeEvent({definition, oldValue, newValue});
    }
  }

  /**
   * Sends a change event.
   * @param {{
   *   definition: (!Object),
   *   oldValue: (string),
   *   newValue: (string),
   * }} param1
   */
  sendChangeEvent({definition, oldValue, newValue}) {
    this.queue.pushTask(({time}) => {
      /** @type {FieldsObj} */
      const defaultFields = {
        transport: 'beacon',
        eventCategory: definition.name,
        eventAction: 'change',
        eventLabel: this.opts.changeTemplate(oldValue, newValue),
        nonInteraction: true,
        queueTime: now() - time,
      };

      this.tracker.send('event', createFieldsObj(defaultFields,
          this.opts.fieldsObj, this.tracker, this.opts.hitFilter));
    });
  }


  /**
   * Removes all event listeners and instance properties.
   */
  remove() {
    this.queue.destroy();
    for (let i = 0, listener; listener = this.changeListeners[i]; i++) {
      listener.mql.removeListener(listener.fn);
    }
  }

  /**
   * Sets the default formatting of the change event label.
   * This can be overridden by setting the `changeTemplate` option.
   * @param {string} oldValue The value of the media query prior to the change.
   * @param {string} newValue The value of the media query after the change.
   * @return {string} The formatted event label.
   */
  changeTemplate(oldValue, newValue) {
    return oldValue + ' => ' + newValue;
  }
}


provide('mediaQueryTracker', MediaQueryTracker);


/**
 * Accepts a media query and returns a MediaQueryList object.
 * Caches the values to avoid multiple unnecessary instances.
 * @param {string} media A media query value.
 * @return {MediaQueryList} The matched media.
 */
function getMediaList(media) {
  return mediaMap[media] || (mediaMap[media] = window.matchMedia(media));
}
