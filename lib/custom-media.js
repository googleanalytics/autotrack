var debounce = require('debounce');
var defaults = require('./utilities').defaults;
var provide = require('./provide');


/**
 * Sets the string to use when no custom dimension value is available.
 */
var NULL_DIMENSION = '(not set)';


/**
 * Declares the MediaQueryListener instance cache.
 */
var mediaMap = {};


/**
 * Registers custom media tracking.
 * @constructor
 * @param {Object} tracker Passed internally by analytics.js
 * @param {?Object} opts Passed by the require command.
 */
function CustomMediaTracker(tracker, opts) {

  this.opts = defaults(opts);

  // Ensures custom media options are set.
  if (!this.opts.customMedia) return;

  this.tracker = tracker;
  this.timeouts = {};
  this.changeTemplate = this.opts.customMediaChangeTemplate ||
      this.changeTemplate;
  this.customMedia = this.opts.customMedia.length ?
      this.opts.customMedia : [this.opts.customMedia];

  this.customMedia.forEach(function(dimension) {
    var name = this.getMatchName(dimension);
    ga('set', 'dimension' + dimension.dimensionIndex, name);

    this.addChangeListeners(dimension);
  });
}


/**
 * Takes a dimension object and return the name of the matching media item.
 * If no match is found, the NULL_DIMENSION value is returned.
 * @param {Object} dimension A set of named media queries associated
 *     with a single custom dimension.
 * @return {string} The name of the matched media or NULL_DIMENSION.
 */
CustomMediaTracker.prototype.getMatchName = function(dimension) {
  var match;
  dimension.items.forEach(function(item) {
    if (getMediaListener(item.media).matches) {
      match = item;
    }
  });
  return match ? match.name : NULL_DIMENSION;
};


/**
 * Adds change listeners to each media query in the dimension list.
 * Debounces the changes to prevent unnecessary hits from being sent.
 * @param {Object} dimension A set of named media queries associated
 *     with a single custom dimension
 */
CustomMediaTracker.prototype.addChangeListeners = function(dimension) {
  dimension.items.forEach(function(item) {
    var mql = getMediaListener(item.media);
    mql.addListener(debounce(function() {
      this.handleChanges(dimension);
    }, 1000));
  });
};


/**
 * Handles changes to the matched media. When the new value differs from
 * the old value, a change event is sent.
 * @param {Object} dimension A set of named media queries associated
 *     with a single custom dimension
 */
CustomMediaTracker.prototype.handleChanges = function(dimension) {
  var newValue = this.getMatchName(dimension);
  var oldValue = this.tracker.get('dimension' + dimension.dimensionIndex);

  if (newValue !== oldValue) {
    ga('set', 'dimension' + dimension.dimensionIndex, newValue);
    ga('send', 'event', dimension.name, 'change',
        this.changeTemplate(oldValue, newValue));
  }
};


/**
 * Sets the default formatting of the change event label.
 * This can be overridden by setting the `customMediaChangeTemplate` option.
 * @param {string} oldValue
 * @param {string} newValue
 * @return {string} The formatted event label.
 */
CustomMediaTracker.prototype.changeTemplate = function(oldValue, newValue) {
  return oldValue + ' => ' + newValue;
};



/**
 * Accepts a media query and returns a MediaQueryListener object.
 * Caches the values to avoid multiple unnecessary instances.
 * @param {string} media A media query value.
 * @return {MediaQueryListener}
 */
function getMediaListener(media) {
  // Returns early if the media is cached.
  if (mediaMap[media]) return mediaMap[media];

  mediaMap[media] = window.matchMedia(media);
  return mediaMap[media];
}


// Feature detects matchMedia before providing the plugin
// to prevent errors in unsupporting browsers.
if (window.matchMedia) {
  provide('customMediaTracker', CustomMediaTracker);
}

