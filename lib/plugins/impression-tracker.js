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


import provide from '../provide';
import TrackerQueue from '../tracker-queue';
import {plugins, trackUsage} from '../usage';
import {assign, createFieldsObj,
    domReady, getAttributeFields, now} from '../utilities';


/**
 * Class for the `impressionTracker` analytics.js plugin.
 * @implements {ImpressionTrackerPublicInterface}
 */
class ImpressionTracker {
  /**
   * Registers impression tracking.
   * @param {!Tracker} tracker Passed internally by analytics.js
   * @param {?ImpressionTrackerOpts} opts Passed by the require command.
   */
  constructor(tracker, opts) {
    trackUsage(tracker, plugins.IMPRESSION_TRACKER);

    // Feature detects to prevent errors in unsupporting browsers.
    if (!(window.IntersectionObserver && window.MutationObserver)) return;

    /** type {ImpressionTrackerOpts} */
    const defaultOptions = {
      // elements: undefined,
      rootMargin: '0px',
      fieldsObj: {},
      attributePrefix: 'ga-',
      // hitFilter: undefined,
    };

    this.opts = /** type {ImpressionTrackerOpts} */ (
        assign(defaultOptions, opts));

    this.tracker = tracker;

    // Binds methods.
    this.handleDomMutations = this.handleDomMutations.bind(this);
    this.handleIntersectionChanges = this.handleIntersectionChanges.bind(this);
    this.handleDomElementAdded = this.handleDomElementAdded.bind(this);
    this.handleDomElementRemoved = this.handleDomElementRemoved.bind(this);

    /** @type {MutationObserver} */
    this.mutationObserver = null;

    // The primary list of elements to observe. Each item contains the
    // element ID, threshold, and whether it's currently in-view.
    this.items = [];

    // A map of element IDs in the `items` array to DOM elements in the
    // document. The presence of a key indicates that the element ID is in the
    // `items` array, and the presence of an element value indicates that the
    // element is in the DOM.
    this.elementMap = {};

    // A map of threshold values. Each threshold is mapped to an
    // IntersectionObserver instance specific to that threshold.
    this.thresholdMap = {};

    this.queue = TrackerQueue.getOrCreate(tracker.get('trackingId'));

    // Once the DOM is ready, start observing for changes (if present).
    domReady(() => {
      if (this.opts.elements) {
        this.observeElements(this.opts.elements);
      }
    });
  }

  /**
   * Starts observing the passed elements for impressions.
   * @param {Array<!ImpressionTrackerElementsItem|string>} elements
   */
  observeElements(elements) {
    this.queue.pushTask(() => {
      const data = this.deriveDataFromElements(elements);

      // Merge the new data with the data already on the plugin instance.
      this.items = this.items.concat(data.items);
      this.elementMap = assign({}, data.elementMap, this.elementMap);
      this.thresholdMap = assign({}, data.thresholdMap, this.thresholdMap);

      // Observe each new item.
      data.items.forEach((item) => {
        const observer = this.thresholdMap[item.threshold] =
            (this.thresholdMap[item.threshold] || new IntersectionObserver(
                this.handleIntersectionChanges, {
                  rootMargin: this.opts.rootMargin,
                  threshold: [+item.threshold],
                }));

        const element = this.elementMap[item.id] ||
            (this.elementMap[item.id] = document.getElementById(item.id));

        if (element) {
          observer.observe(element);
        }
      });

      if (!this.mutationObserver) {
        this.mutationObserver = new MutationObserver(this.handleDomMutations);
        this.mutationObserver.observe(document.body, {
          childList: true,
          subtree: true,
        });
      }
    });
  }

  /**
   * Stops observing the passed elements for impressions.
   * @param {Array<!ImpressionTrackerElementsItem|string>} elements
   * @return {undefined}
   */
  unobserveElements(elements) {
    // Since observing elements is queued, unobserving must be queued also or
    // we risk this running before the observing.
    this.queue.pushTask(() => {
      const itemsToKeep = [];
      const itemsToRemove = [];

      this.items.forEach((item) => {
        const itemInItems = elements.some((element) => {
          const itemToRemove = getItemFromElement(element);
          return itemToRemove.id === item.id &&
              itemToRemove.threshold === item.threshold &&
              itemToRemove.trackFirstImpressionOnly ===
                  item.trackFirstImpressionOnly;
        });
        if (itemInItems) {
          itemsToRemove.push(item);
        } else {
          itemsToKeep.push(item);
        }
      });

      // If there are no items to keep, run the `unobserveAllElements` logic.
      if (!itemsToKeep.length) {
        this.unobserveAllElements();
      } else {
        const dataToKeep = this.deriveDataFromElements(itemsToKeep);
        const dataToRemove = this.deriveDataFromElements(itemsToRemove);

        this.items = dataToKeep.items;
        this.elementMap = dataToKeep.elementMap;
        this.thresholdMap = dataToKeep.thresholdMap;

        // Unobserve removed elements.
        itemsToRemove.forEach((item) => {
          if (!dataToKeep.elementMap[item.id]) {
            const observer = dataToRemove.thresholdMap[item.threshold];
            const element = dataToRemove.elementMap[item.id];

            if (element) {
              observer.unobserve(element);
            }

            // Disconnect unneeded threshold observers.
            if (!dataToKeep.thresholdMap[item.threshold]) {
              dataToRemove.thresholdMap[item.threshold].disconnect();
            }
          }
        });
      }
    });
  }

  /**
   * Stops observing all currently observed elements.
   */
  unobserveAllElements() {
    // Since observing elements is queued, unobserving must be queued also or
    // we risk this running before the observing.
    this.queue.pushTask(() => {
      Object.keys(this.thresholdMap).forEach((key) => {
        this.thresholdMap[key].disconnect();
      });

      if (this.mutationObserver) {
        this.mutationObserver.disconnect();
        this.mutationObserver = null;
      }

      this.items = [];
      this.elementMap = {};
      this.thresholdMap = {};
    });
  }

  /**
   * Loops through each of the passed elements and creates a map of element IDs,
   * threshold values, and a list of "items" (which contains each element's
   * `threshold` and `trackFirstImpressionOnly` property).
   * @param {Array} elements A list of elements to derive item data from.
   * @return {Object} An object with the properties `items`, `elementMap`
   *     and `threshold`.
   */
  deriveDataFromElements(elements) {
    const items = [];
    const thresholdMap = {};
    const elementMap = {};

    if (elements.length) {
      elements.forEach((element) => {
        const item = getItemFromElement(element);

        items.push(item);
        elementMap[item.id] = this.elementMap[item.id] || null;
        thresholdMap[item.threshold] =
            this.thresholdMap[item.threshold] || null;
      });
    }

    return {items, elementMap, thresholdMap};
  }

  /**
   * Handles nodes being added or removed from the DOM. This function is passed
   * as the callback to `this.mutationObserver`.
   * @param {Array} mutations A list of `MutationRecord` instances
   */
  handleDomMutations(mutations) {
    for (let i = 0, mutation; mutation = mutations[i]; i++) {
      // Handles removed elements.
      for (let k = 0, removedEl; removedEl = mutation.removedNodes[k]; k++) {
        this.walkNodeTree(removedEl, this.handleDomElementRemoved);
      }
      // Handles added elements.
      for (let j = 0, addedEl; addedEl = mutation.addedNodes[j]; j++) {
        this.walkNodeTree(addedEl, this.handleDomElementAdded);
      }
    }
  }

  /**
   * Iterates through all descendents of a DOM node and invokes the passed
   * callback if any of them match an elememt in `elementMap`.
   * @param {Node} node The DOM node to walk.
   * @param {Function} callback A function to be invoked if a match is found.
   */
  walkNodeTree(node, callback) {
    if (node.nodeType == 1 && node.id in this.elementMap) {
      callback(node.id);
    }
    for (let i = 0, child; child = node.childNodes[i]; i++) {
      this.walkNodeTree(child, callback);
    }
  }

  /**
   * Handles intersection changes. This function is passed as the callback to
   * `this.intersectionObserver`
   * @param {Array} records A list of `IntersectionObserverEntry` records.
   */
  handleIntersectionChanges(records) {
    this.queue.pushTask(({time}) => {
      const itemsToRemove = [];
      for (let i = 0, record; record = records[i]; i++) {
        for (let j = 0, item; item = this.items[j]; j++) {
          if (record.target.id !== item.id) continue;

          if (isTargetVisible(item.threshold, record)) {
            this.handleImpression({id: item.id, impressionTime: time});

            if (item.trackFirstImpressionOnly) {
              itemsToRemove.push(item);
            }
          }
        }
      }
      if (itemsToRemove.length) {
        this.unobserveElements(itemsToRemove);
      }
    });
  }

  /**
   * Sends a hit to Google Analytics with the impression data.
   * @param {{id: (string), impressionTime: (number)}} param1
   */
  handleImpression({id, impressionTime}) {
    this.queue.pushTask(() => {
      const element = document.getElementById(id);

      /** @type {FieldsObj} */
      const defaultFields = {
        transport: 'beacon',
        eventCategory: 'Viewport',
        eventAction: 'impression',
        eventLabel: id,
        nonInteraction: true,
        queueTime: now() - impressionTime,
      };

      /** @type {FieldsObj} */
      const userFields = assign({}, this.opts.fieldsObj,
          getAttributeFields(element, this.opts.attributePrefix));

      this.tracker.send('event', createFieldsObj(defaultFields,
          userFields, this.tracker, this.opts.hitFilter, element));
    });
  }

  /**
   * Handles an element in the items array being added to the DOM.
   * @param {string} id The ID of the element that was added.
   */
  handleDomElementAdded(id) {
    const element = this.elementMap[id] = document.getElementById(id);
    this.items.forEach((item) => {
      if (id == item.id) {
        this.thresholdMap[item.threshold].observe(element);
      }
    });
  }

  /**
   * Handles an element currently being observed for intersections being
   * removed from the DOM.
   * @param {string} id The ID of the element that was removed.
   */
  handleDomElementRemoved(id) {
    const element = this.elementMap[id];
    this.items.forEach((item) => {
      if (id == item.id) {
        this.thresholdMap[item.threshold].unobserve(element);
      }
    });

    this.elementMap[id] = null;
  }

  /**
   * Removes all listeners and observers.
   * @private
   */
  remove() {
    this.queue.destroy();
    this.unobserveAllElements();
  }
}


provide('impressionTracker', ImpressionTracker);


/**
 * Detects whether or not an intersection record represents a visible target
 * given a particular threshold.
 * @param {number} threshold The threshold the target is visible above.
 * @param {IntersectionObserverEntry} record The most recent record entry.
 * @return {boolean} True if the target is visible.
 */
function isTargetVisible(threshold, record) {
  if (threshold === 0) {
    const i = record.intersectionRect;
    return i.top > 0 || i.bottom > 0 || i.left > 0 || i.right > 0;
  } else {
    return record.intersectionRatio >= threshold;
  }
}


/**
 * Creates an item by merging the passed element with the item defaults.
 * If the passed element is just a string, that string is treated as
 * the item ID.
 * @param {!ImpressionTrackerElementsItem|string} element The element to
 *     convert to an item.
 * @return {!ImpressionTrackerElementsItem} The item object.
 */
function getItemFromElement(element) {
  /** @type {ImpressionTrackerElementsItem} */
  const defaultOpts = {
    threshold: 0,
    trackFirstImpressionOnly: true,
  };

  if (typeof element == 'string') {
    element = /** @type {!ImpressionTrackerElementsItem} */ ({id: element});
  }

  return assign(defaultOpts, element);
}
