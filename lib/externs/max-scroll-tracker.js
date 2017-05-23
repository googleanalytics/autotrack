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
 * MaxScrollTracker store data schema.
 * @typedef {{
 *   sessionId: (string|undefined),
 * }}
 */
var MaxScrollStoreData;

/**
 * @interface
 */
class MaxScrollTrackerPublicInterface {
  remove() {}
}
