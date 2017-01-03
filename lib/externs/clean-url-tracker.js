/**
 * Public options for the CleanUrlTracker.
 * @typedef {{
 *   stripQuery: (boolean|undefined),
 *   queryDimensionIndex: (number|undefined),
 *   indexFilename: (string|undefined),
 *   trailingSlash: (string|undefined),
 * }}
 */
let CleanUrlTrackerOpts;


/**
 * @interface
 */
class CleanUrlTrackerPublicInterface {
  remove() {}
}
