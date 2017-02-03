/**
 * Public options for the PageVisibilityTracker.
 * @typedef {{
 *   sessionTimeout: (number),
 *   timeZone: (string|undefined),
 *   visibleMetricIndex: (number|undefined),
 *   fieldsObj: (!Object),
 *   hitFilter: (Function|undefined),
 * }}
 */
let PageVisibilityTrackerOpts;


/**
 * PageVisibilityTracker change store data schema.
 * @typedef {{
 *   time: (number|undefined),
 *   state: (string|undefined),
 *   pageId: (string|undefined),
 * }}
 */
let PageVisibilityStoreData;


/**
 * @interface
 */
class PageVisibilityTrackerPublicInterface {
  remove() {}
}
