/**
 * Public options for the MaxScrollTracker.
 * @typedef {{
 *   increaseThreshold: (number),
 *   sessionTimeout: (number),
 *   timeZone: (string|undefined),
 *   maxScrollMetricIndex: (number|undefined),
 *   fieldsObj: (!Object),
 *   hitFilter: (Function|undefined),
 * }}
 */
var MaxScrollTrackerOpts;


/**
 * @interface
 */
class MaxScrollTrackerPublicInterface {
  remove() {}
}
