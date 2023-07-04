/**
 * Public options for the CleanUrlTracker.
 * @typedef {{
 *   stripQuery: (boolean|undefined),
 *   queryParamsWhitelist: (Array|undefined),
 *   queryDimensionIndex: (number|undefined),
 *   indexFilename: (string|undefined),
 *   trailingSlash: (string|undefined),
 *   urlFieldsFilter:
 *       (function(!FieldsObj, function(string):!Object):!FieldsObj|undefined),
 * }}
 */
var CleanUrlTrackerOpts;


/**
 * @interface
 */
class CleanUrlTrackerPublicInterface {
  remove() {}
}
