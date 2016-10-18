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
var provide = require('../provide');
var usage = require('../usage');
var createFieldsObj = require('../utilities').createFieldsObj;
var domReady = require('../utilities').domReady;
var getAttributeFields = require('../utilities').getAttributeFields;


/**
 * Registers impression tracking.
 * @constructor
 * @param {Object} tracker Passed internally by analytics.js
 * @param {?Object} opts Passed by the require command.
 */
function ImpressionTracker(tracker, opts) {

  usage.track(tracker, usage.plugins.IMPRESSION_TRACKER);

  // Feature detects to prevent errors in unsupporting browsers.
  if (!(window.IntersectionObserver && window.MutationObserver)) return;

  this.opts = assign({
    elements: null,
    rootMargin: '0px',
    fieldsObj: {},
    attributePrefix: 'ga-',
    hitFilter: null
  }, opts);

  this.tracker = tracker;

  // Binds methods.
  this.handleDomMutations = this.handleDomMutations.bind(this);
  this.handleIntersectionChanges = this.handleIntersectionChanges.bind(this);
  this.handleDomElementAdded = this.handleDomElementAdded.bind(this);
  this.handleDomElementRemoved = this.handleDomElementRemoved.bind(this);

  // The primary list of elements to observe. Each item contains the
  // element ID, threshold, and whether it's currently in-view.
  this.items = [];

  // A map of element IDs in the `items` array to DOM elements in the document.
  // The presence of a key indicates that the element ID is in the `items`
  // array, and the presence of an element value indicates that the element
  // is in the DOM.
  this.elementMap = {};

  // A map of threshold values. Each threshold is mapped to an
  // IntersectionObserver instance specific to that threshold.
  this.thresholdMap = {};

  // Once the DOM is ready, start observing for changes.
  domReady(function() {
    this.observeElements(this.opts.elements);
  }.bind(this));
}


ImpressionTracker.prototype.observeElements = function(elements) {
  var data = this.deriveDataFromElements(elements);

  // Merge the new data with the data already on the plugin instance.
  this.items = this.items.concat(data.items);
  this.elementMap = assign({}, data.elementMap, this.elementMap);
  this.thresholdMap = assign({}, data.thresholdMap, this.thresholdMap);

  // Observe each new item.
  data.items.forEach(function(item) {
    var observer = this.thresholdMap[item.threshold] =
        (this.thresholdMap[item.threshold] || new IntersectionObserver(
            this.handleIntersectionChanges, {
              rootMargin: this.opts.rootMargin,
              threshold: [+item.threshold]
            }));

    var element = this.elementMap[item.id] ||
        (this.elementMap[item.id] = document.getElementById(item.id));

    if (element) {
      observer.observe(element);
    }
  }.bind(this));

  if (!this.mutationObserver) {
    this.mutationObserver = new MutationObserver(this.handleDomMutations);
    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // TODO(philipwalton): Remove temporary hack to force a new frame
  // immediately after adding observers.
  // https://bugs.chromium.org/p/chromium/issues/detail?id=612323
  requestAnimationFrame(function() {});
};


ImpressionTracker.prototype.unobserveElements = function(elements) {
  var itemsToKeep = [];
  var itemsToRemove = [];

  this.items.forEach(function(item) {
    var itemInItems = elements.some(function(element) {
      var itemToRemove = getItemFromElement(element);
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

  // If there are no items to keep, exit early by running the
  // `unobserveAllElements` logic.
  if (!itemsToKeep.length) {
    return this.unobserveAllElements();
  }

  var dataToKeep = this.deriveDataFromElements(itemsToKeep);
  var dataToRemove = this.deriveDataFromElements(itemsToRemove);

  this.items = dataToKeep.items;
  this.elementMap = dataToKeep.elementMap;
  this.thresholdMap = dataToKeep.thresholdMap;

  // Unobserve removed elements.
  itemsToRemove.forEach(function(item) {
    if (!dataToKeep.elementMap[item.id]) {
      var observer = dataToRemove.thresholdMap[item.threshold];
      var element = dataToRemove.elementMap[item.id];

      if (element) {
        observer.unobserve(element);
      }

      // Disconnect unneeded threshold observers.
      if (!dataToKeep.thresholdMap[item.threshold]) {
        dataToRemove.thresholdMap[item.threshold].disconnect();
      }
    }
  });
};


ImpressionTracker.prototype.unobserveAllElements = function() {
  Object.keys(this.thresholdMap).forEach(function(key) {
    this.thresholdMap[key].disconnect();
  }.bind(this));

  this.mutationObserver.disconnect();
  this.mutationObserver = null;

  this.items = [];
  this.elementMap = {};
  this.thresholdMap = {};
};


/**
 * Loops through each of the passed elements and creates a map of element IDs,
 * threshold values, and a list of "items" (which contains each element's
 * `threshold` and `trackFirstImpressionOnly` property).
 * @param {Array} elements A list of elements to derive item data from.
 * @return {Object} An object with the properties `items`, `elementMap`
 *     and `threshold`.
 */
ImpressionTracker.prototype.deriveDataFromElements = function(elements) {
  var items = [];
  var thresholdMap = {};
  var elementMap = {};

  if (elements.length) {
    elements.forEach(function(element) {
      var item = getItemFromElement(element);

      items.push(item);
      elementMap[item.id] = this.elementMap[item.id] || null;
      thresholdMap[item.threshold] = this.thresholdMap[item.threshold] || null;
    }.bind(this));
  }

  return {
    items: items,
    elementMap: elementMap,
    thresholdMap: thresholdMap
  };
};


/**
 * Adds an element to the `elementMap` map and registers it for observation
 * on `this.intersectionObserver`.
 * @param {string} id The ID of the element to observe.
 */
ImpressionTracker.prototype.observeElement = function(id) {
  var element = this.elementMap[id] ||
      (this.elementMap[id] = document.getElementById(id));

  if (element) this.intersectionObserver.observe(element);
};


/**
 * Handles nodes being added or removed from the DOM. This function is passed
 * as the callback to `this.mutationObserver`.
 * @param {Array} mutations A list of `MutationRecord` instances
 */
ImpressionTracker.prototype.handleDomMutations = function(mutations) {
  for (var i = 0, mutation; mutation = mutations[i]; i++) {
    // Handles removed elements.
    for (var k = 0, removedEl; removedEl = mutation.removedNodes[k]; k++) {
      this.walkNodeTree(removedEl, this.handleDomElementRemoved);
    }
    // Handles added elements.
    for (var j = 0, addedEl; addedEl = mutation.addedNodes[j]; j++) {
      this.walkNodeTree(addedEl, this.handleDomElementAdded);
    }
  }
};


/**
 * Iterates through all descendents of a DOM node and invokes the passed
 * callback if any of them match an elememt in `elementMap`.
 * @param {Node} node The DOM node to walk.
 * @param {Function} callback A function to be invoked if a match is found.
 */
ImpressionTracker.prototype.walkNodeTree = function(node, callback) {
  if (node.nodeType == 1 && node.id in this.elementMap) {
    callback(node.id);
  }
  for (var i = 0, child; child = node.childNodes[i]; i++) {
    this.walkNodeTree(child, callback);
  }
};


/**
 * Handles intersection changes. This function is passed as the callback to
 * `this.intersectionObserver`
 * @param {Array} records A list of `IntersectionObserverEntry` records.
 */
ImpressionTracker.prototype.handleIntersectionChanges = function(records) {
  var itemsToRemove = [];
  for (var i = 0, record; record = records[i]; i++) {
    for (var j = 0, item; item = this.items[j]; j++) {
      if (record.target.id !== item.id) continue;

      if (isTargetVisible(item.threshold, record)) {
        this.handleImpression(item.id);

        if (item.trackFirstImpressionOnly) {
          itemsToRemove.push(item);
        }
      }
    }
  }
  if (itemsToRemove.length) {
    this.unobserveElements(itemsToRemove);
  }
};


/**
 * Sends a hit to Google Analytics with the impression data.
 * @param {string} id The ID of the element making the impression.
 */
ImpressionTracker.prototype.handleImpression = function(id) {
  var element = document.getElementById(id);

  var defaultFields = {
    transport: 'beacon',
    eventCategory: 'Viewport',
    eventAction: 'impression',
    eventLabel: id
  };

  var userFields = assign({}, this.opts.fieldsObj,
      getAttributeFields(element, this.opts.attributePrefix));

  this.tracker.send('event', createFieldsObj(defaultFields,
      userFields, this.tracker, this.opts.hitFilter, element));
};


/**
 * Handles an element in the items array being added to the DOM.
 * @param {string} id The ID of the element that was added.
 */
ImpressionTracker.prototype.handleDomElementAdded = function(id) {
  var element = this.elementMap[id] = document.getElementById(id);
  this.items.forEach(function(item) {
    if (id == item.id) {
      this.thresholdMap[item.threshold].observe(element);
    }
  }.bind(this));
};


/**
 * Handles an element currently being observed for intersections being removed
 * from the DOM.
 * @param {string} id The ID of the element that was removed.
 */
ImpressionTracker.prototype.handleDomElementRemoved = function(id) {
  var element = this.elementMap[id];
  this.items.forEach(function(item) {
    if (id == item.id) {
      this.thresholdMap[item.threshold].unobserve(element);
    }
  }.bind(this));

  this.elementMap[id] = null;
};


/**
 * Removes all listeners and observers.
 */
ImpressionTracker.prototype.remove = function() {
  this.unobserveAllElements();
};


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
    var i = record.intersectionRect;
    return i.top > 0 || i.bottom > 0 || i.left > 0 || i.right > 0;
  }
  else {
    return record.intersectionRatio >= threshold;
  }
}

/**
 * Creates an item by merging the passed element with the item defaults.
 * If the passed element is just a string, that string is treated as
 * the item ID.
 * @param {Object|string} element The element to convert to an item.
 * @return {Object} The item object.
 */
function getItemFromElement(element) {
  return assign({threshold: 0, trackFirstImpressionOnly: true},
      typeof element == 'string' ? {id: element} : element);

}


