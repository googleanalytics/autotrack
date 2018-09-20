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


import {delegate} from 'dom-utils';
import provide from '../provide';
import TrackerQueue from '../tracker-queue';
import {plugins, trackUsage} from '../usage';
import {assign, createFieldsObj, getAttributeFields, now} from '../utilities';


/**
 * Class for the `eventTracker` analytics.js plugin.
 * @implements {EventTrackerPublicInterface}
 */
class EventTracker {
  /**
   * Registers declarative event tracking.
   * @param {!Tracker} tracker Passed internally by analytics.js
   * @param {?EventTrackerOpts} opts Passed by the require command.
   */
  constructor(tracker, opts) {
    trackUsage(tracker, plugins.EVENT_TRACKER);

    /** @type {EventTrackerOpts} */
    const defaultOpts = {
      events: ['click'],
      fieldsObj: {},
      attributePrefix: 'ga-',
      // hitFilter: undefined,
    };

    this.opts = /** @type {EventTrackerOpts} */ (assign(defaultOpts, opts));
    this.tracker = tracker;

    // Binds methods.
    this.handleEvents = this.handleEvents.bind(this);

    const selector = '[' + this.opts.attributePrefix + 'on]';
    this.delegates = {};
    this.opts.events.forEach((event) => {
      this.delegates[event] = delegate(document, event, selector,
          this.handleEvents, {composed: true, useCapture: true});
    });

    this.queue = TrackerQueue.getOrCreate(tracker.get('trackingId'));
  }

  /**
   * Handles all events on elements with event attributes.
   * @param {Event} event The DOM click event.
   * @param {Element} element The delegated DOM element target.
   */
  handleEvents(event, element) {
    this.queue.pushTask(({time}) => {
      const prefix = this.opts.attributePrefix;
      const events = element.getAttribute(prefix + 'on').split(/\s*,\s*/);

      // Ensures the type matches one of the events specified on the element.
      if (events.indexOf(event.type) < 0) return;

      /** @type {FieldsObj} */
      const defaultFields = {
        transport: 'beacon',
        queueTime: now() - time,
      };

      const attributeFields = getAttributeFields(element, prefix);
      const userFields = assign({}, this.opts.fieldsObj, attributeFields);
      const hitType = attributeFields.hitType || 'event';

      this.tracker.send(hitType, createFieldsObj(defaultFields,
          userFields, this.tracker, this.opts.hitFilter, element, event));
    });
  }

  /**
   * Removes all event listeners and instance properties.
   */
  remove() {
    this.queue.destroy();
    Object.keys(this.delegates).forEach((key) => {
      this.delegates[key].destroy();
    });
  }
}


provide('eventTracker', EventTracker);
