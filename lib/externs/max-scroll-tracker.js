/**
 * Public options for the MaxScrollTracker.
 * @typedef {{
 *   increaseThreshold: (number),
 *   ignoreUrlQuery: (boolean),
 *   sessionTimeout: (number),
 *   timeZone: (string|undefined),
 *   maxScrollMetricIndex: (number|undefined),
 *   fieldsObj: (!Object),
 *   hitFilter: (Function|undefined),
 * }}
 */
let MaxScrollTrackerOpts;


/**
 * @interface
 */
class MaxScrollTrackerPublicInterface {
  remove() {}
}
