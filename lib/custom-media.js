import debounce from 'debounce';
import provide from './provide';


/**
 * Sets the string to use when no custom dimension value is available.
 */
const NULL_DIMENSION = '(not set)';


/**
 * Declares the MediaQueryListener instance cache.
 */
let mediaMap = {};


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


class customMediaTracker {

  /**
   * Registers custom media tracking.
   *
   * @constructor
   * @param {Object} tracker Passed internally by analytics.js
   * @param {Object} opts Passed to the require command.
   */
  constructor(tracker, opts = {}) {

    this.tracker = tracker;
    this.timeouts = {};
    this.customMedia = opts.customMedia;
    this.changeTemplate = opts.customMediaChangeTemplate || this.changeTemplate;

    for (let dimension of this.customMedia) {
      let name = this.getMatchName(dimension);
      ga('set', 'dimension' + dimension.dimensionIndex, name);

      this.addChangeListeners(dimension);
    }
  }


  /**
   * Takes a dimension object and return the name of the matching media item.
   * If no match is found, the NULL_DIMENSION value is returned.
   * @param {Object} dimension A set of named media queries associated
   *     with a single custom dimension.
   * @return {string} The name of the matched media or NULL_DIMENSION.
   */
  getMatchName(dimension) {
    let match;
    for (let item of dimension.items) {
      if (getMediaListener(item.media).matches) {
        match = item;
      }
    }
    return match ? match.name : NULL_DIMENSION;
  }


  /**
   * Adds change listeners to each media query in the dimension list.
   * Debounces the changes to prevent unnecessary hits from being sent.
   * @param {Object} dimension A set of named media queries associated
   *     with a single custom dimension
   */
  addChangeListeners(dimension) {
    for (let item of dimension.items) {
      let mql = getMediaListener(item.media);
      mql.addListener(debounce(() => this.handleChanges(dimension), 1000));
    }
  }


  /**
   * Handles changes to the matched media. When the new value differs from
   * the old value, a change event is sent.
   * @param {Object} dimension A set of named media queries associated
   *     with a single custom dimension
   */
  handleChanges(dimension) {
    let newValue = this.getMatchName(dimension);
    let oldValue = this.tracker.get('dimension' + dimension.dimensionIndex);

    if (newValue !== oldValue) {
      ga('set', 'dimension' + dimension.dimensionIndex, newValue);
      ga('send', 'event', dimension.name, 'change',
          this.changeTemplate(oldValue, newValue));
    }
  }


  /**
   * Sets the default formatting of the change event label.
   * This can be overridden by setting the `customMediaChangeTemplate` option.
   * @param {string} oldValue
   * @param {string} newValue
   * @return {string} The formatted event label.
   */
  changeTemplate(oldValue, newValue) {
    return `${oldValue} => ${newValue}`
  }
}


provide('customMediaTracker', customMediaTracker);
