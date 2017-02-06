/**
 * Public options for the UrlChangeTracker.
 * @typedef {{
 *   shouldTrackUrlChange: (!Function),
 *   trackReplaceState: (boolean),
 *   fieldsObj: (!Object),
 *   hitFilter: (Function|undefined),
 * }}
 */
var UrlChangeTrackerOpts;


/**
 * @interface
 */
class UrlChangeTrackerPublicInterface {
  remove() {}
}
