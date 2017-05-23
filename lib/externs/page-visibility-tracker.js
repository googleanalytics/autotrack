/**
 * Public options for the PageVisibilityTracker.
 * @typedef {{
 *   sessionTimeout: (number),
 *   visibleThreshold: (number),
 *   timeZone: (string|undefined),
 *   sendInitialPageview: (boolean),
 *   pageLoadsMetricIndex: (number|undefined),
 *   visibleMetricIndex: (number|undefined),
 *   fieldsObj: (!Object),
 *   hitFilter: (Function|undefined),
 * }}
 */
var PageVisibilityTrackerOpts;


/**
 * PageVisibilityTracker change store data schema.
 * @typedef {{
 *   time: (number|undefined),
 *   state: (string|undefined),
 *   pageId: (string|undefined),
 *   sessionId: (string|undefined),
 * }}
 */
var PageVisibilityStoreData;


/**
 * @interface
 */
class PageVisibilityTrackerPublicInterface {
  remove() {}
}
