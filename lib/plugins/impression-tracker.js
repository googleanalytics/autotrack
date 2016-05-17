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
var getAttributeFields = require('../utilities').getAttributeFields;


/**
 * Registers declarative event tracking.
 * @constructor
 * @param {Object} tracker Passed internally by analytics.js
 * @param {?Object} opts Passed by the require command.
 */
function ImpressionTracker(tracker, opts) {

  // Feature detects to prevent errors in unsupporting browsers.
  if (!(window.IntersectionObserver && window.MutationObserver)) return;

  this.opts = assign({
    attributePrefix: 'ga-',
    elements: [],
    fieldsObj: {},
    hitFilter: null
  }, opts);

  this.tracker = tracker;

  // Binds methods.
  this.handleDomMutations = this.handleDomMutations.bind(this);
  this.handleIntersectionChanges = this.handleIntersectionChanges.bind(this);
  this.observeElement = this.observeElement.bind(this);
  this.unobserveElement = this.unobserveElement.bind(this);

  var data = this.deriveDataFromConfigOptions();

  // The primary list of elements to observe. Each item contains the
  // element ID, threshold, and whether it's currently in-view.
  this.items = data.items;

  // A hash map of elements contained in the items array.
  this.elementMap = data.elementMap;

  // A sorted list of threshold values contained in the items array.
  this.threshold = data.threshold;

  this.intersectionObserver = this.initIntersectionObserver();
  this.mutationObserver = this.initMutationObserver();

  this.startObserving();
}


ImpressionTracker.prototype.deriveDataFromConfigOptions = function() {
  var items = [];
  var elementMap = {};
  var threshold = [];

  this.opts.elements.forEach(function(item) {
    // The item can be just a string if it's OK with all the defaults.
    if (typeof item == 'string') item = {id: item};

    items.push(item = assign({
      threshold: .5,
      trackFirstImpressionOnly: true
    }, item));

    elementMap[item.id] = null;
    threshold.push(item.threshold)
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


ImpressionTracker.prototype.initMutationObserver = function(mutations) {
  return new MutationObserver(this.handleDomMutations);
};


ImpressionTracker.prototype.initIntersectionObserver = function() {
  return new IntersectionObserver(
      this.handleIntersectionChanges, {threshold: this.threshold});
};


ImpressionTracker.prototype.startObserving = function() {
  // Start observing elements for intersections.
  Object.keys(this.elementMap).forEach(this.observeElement);

  // Start observing the DOM for added and removed elements.
  this.mutationObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  // TODO(philipwalton): Remove temporary hack to force a new frame
  // immediately after adding observers.
  // https://bugs.chromium.org/p/chromium/issues/detail?id=612323
  requestAnimationFrame(function() {});
};


ImpressionTracker.prototype.observeElement = function(id) {
  var element = this.elementMap[id] ||
      (this.elementMap[id] = document.getElementById(id));

  if (element) this.intersectionObserver.observe(element);
};


ImpressionTracker.prototype.handleDomMutations = function(mutations) {
  for (var i = 0, mutation; mutation = mutations[i]; i++) {

    // Handles added elements.
    for (var j = 0, element; element = mutation.addedNodes[j]; j++) {
      if (element.nodeType == 1 && element.id in this.elementMap) {
        this.observeElement(element.id);
      }
    }

    // Handles removed elements.
    for (var j = 0, element; element = mutation.removedNodes[j]; j++) {
      if (element.nodeType == 1 && element.id in this.elementMap) {
        this.unobserveElement(element.id);
      }
    }
  }
};


ImpressionTracker.prototype.handleIntersectionChanges = function(changes) {
  for (var i = 0, change; change = changes[i]; i++) {
    for (var j = 0, item; item = this.items[j]; j++) {
      if (change.target.id !== item.id) continue;

      var itemWasPreviouslyVisible = item.visible;
      item.visible = change.intersectionRatio > item.threshold ||
          change.intersectionRatio == 1

      if (item.visible && !itemWasPreviouslyVisible) {
        this.handleImpression(item.id);

        if (item.trackFirstImpressionOnly) {
          this.items.splice(j, 1);
          j--;
          this.unobserveElement(item.id);
        }
      }
    }
  }

  // If all items have been removed, remove the plugin.
  if (this.items.length === 0) this.remove();
}


/**
 * Accpets an element ID that should be unobserved unless it still exists
 * in the items list.
 */
ImpressionTracker.prototype.unobserveElement = function(id) {
  var itemsReferencesId = this.items.some(function(item) {
    return id == item.id;
  });

  if (!itemsReferencesId) {
    this.intersectionObserver.unobserve(this.elementMap[id]);
    delete this.elementMap[id];
  }
}


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
}


/**
 * Removes all listeners and observers.
 */
ImpressionTracker.prototype.remove = function() {
  this.mutationObserver.disconnect();
  this.intersectionObserver.disconnect();
};


// Polyfills `IntersectionObserverEntry.prototype.intersectionRatio`
// in Chrome 51. TODO(philipwalton): this should be added to the polyfill.
if ('IntersectionObserverEntry' in window &&
    !('intersectionRatio' in IntersectionObserverEntry.prototype)) {

  Object.defineProperty(
      IntersectionObserverEntry.prototype, 'intersectionRatio', {

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
