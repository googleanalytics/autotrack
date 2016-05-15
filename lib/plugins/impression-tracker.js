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
var createFieldsObj = require('../utilities').createFieldsObj;
var defaults = require('../utilities').defaults;
var getAttributeFields = require('../utilities').getAttributeFields;


/**
 * Registers declarative event tracking.
 * @constructor
 * @param {Object} tracker Passed internally by analytics.js
 * @param {?Object} opts Passed by the require command.
 */
function ImpressionTracker(tracker, opts) {

  // Feature detects to prevent errors in unsupporting browsers.
  if (!window.IntersectionObserver) return;

  this.opts = defaults(opts, {
    attributePrefix: 'ga-',
    elements: [],
    fieldsObj: {},
    hitFilter: null
  });

  this.tracker = tracker;

  this.handleIntersectionChanges = this.handleIntersectionChanges.bind(this);
  this.unobserveIfUnused = this.unobserveIfUnused.bind(this);

  // Populates the `items`, `elementMap`, and `threshold` properties with
  // data derrived from the list of element in `this.opts`.
  assign(this, this.extractElementData());

  this.observeElements();
}


ImpressionTracker.prototype.extractElementData = function() {

  // The primary list of elements to observe. Each item contains the
  // element ID, threshold, and whether it's currently in-view.
  var items = [];

  // The collection of elements to be observed.
  var elementMap = {};

  // the list of threshold values to observe.
  var threshold = [];

  this.opts.elements.forEach(function(item) {
    // The item can be just a string if it's OK with all the defaults.
    if (typeof item == 'string') item = {id: item};

    items.push(item = assign({
      threshold: .5,
      trackFirstImpressionOnly: true
    }, item));

    var element = document.getElementById(item.id);
    if (element) {
      item.element = element;
      elementMap[item.id] = element;
      threshold.push(item.threshold)
    }
  });

  // Sort the list of thresholds and remove duplicates.
  threshold = threshold.sort().filter(function(thr, i, a) {
    return thr !== a[i - 1];
  });

  return {
    items: items,
    elementMap: elementMap,
    threshold: threshold
  }
};


ImpressionTracker.prototype.observeElements = function() {
  this.observer = new IntersectionObserver(this.handleIntersectionChanges, {
    threshold: this.threshold
  });

  for (var id in this.elementMap) {
    if (this.elementMap.hasOwnProperty(id))
    this.observer.observe(this.elementMap[id]);
  }
}


ImpressionTracker.prototype.handleIntersectionChanges = function(changes) {

  // Items where `trackFirstImpressionOnly` is true get removed after
  // the first intersection.
  var removedItems = [];

  for (var i = 0, change; change = changes[i]; i++) {
    for (var j = 0, item; item = this.items[j]; j++) {
      if (change.target !== item.element) continue;

      var itemWasPreviouslyVisible = item.visible;
      item.visible = change.intersectionRatio > item.threshold ||
          change.intersectionRatio == 1

      if (item.visible && !itemWasPreviouslyVisible) {
        this.handleImpression(item);

        if (item.trackFirstImpressionOnly) {
          this.items.splice(j, 1);
          removedItems.push(item);
          j--;
        }
      }
    }
  }

  removedItems.forEach(this.unobserveIfUnused);
}


ImpressionTracker.prototype.handleImpression = function(item) {
  var defaultFields = {
    transport: 'beacon',
    eventCategory: 'Viewport',
    eventAction: 'impression',
    eventLabel: item.id
  };
  var userFields = assign(this.opts.fieldsObj,
      getAttributeFields(item.element, this.opts.attributePrefix));

  this.tracker.send('event', createFieldsObj(defaultFields,
      userFields, this.tracker, this.opts.hitFilter, item.element));
}


/**
 * Accpets an element ID that should be unobserved unless it still exists
 * in the items list.
 */
ImpressionTracker.prototype.unobserveIfUnused = function(item) {
  var id = item.id;
  var itemsReferencesId = this.items.some(function(item) {
    return id == item.id;
  });

  if (!itemsReferencesId) {
    this.observer.unobserve(this.elementMap[id]);
    delete this.elementMap[id];
  }
}


/**
 * Removes all listeners and observers.
 */
ImpressionTracker.prototype.remove = function() {
  this.observer.disconnect();
};


// Polyfills `IntersectionObserverEntry.prototype.intersectionRatio`
// in Chrome <52.
if ('IntersectionObserverEntry' in window &&
    !('intersectionRatio' in IntersectionObserverEntry.prototype)) {

  Object.defineProperty(IntersectionObserverEntry.prototype, 'intersectionRatio', {
    get: function() {
      var targetRect = this.boundingClientRect;
      var targetArea = targetRect.width * targetRect.height;
      var intersectionRect = this.intersectionRect;
      var intersectionArea = intersectionRect.width * intersectionRect.height;
      return intersectionArea / targetArea;
    }
  });
}


provide('impressionTracker', ImpressionTracker);
