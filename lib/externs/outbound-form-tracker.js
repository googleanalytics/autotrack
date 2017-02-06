/**
 * Public options for the OutboundFormTracker.
 * @typedef {{
 *   formSelector: (string),
 *   shouldTrackOutboundForm: (!Function),
 *   fieldsObj: (!Object),
 *   attributePrefix: (string),
 *   hitFilter: (Function|undefined),
 * }}
 */
var OutboundFormTrackerOpts;


/**
 * @interface
 */
class OutboundFormTrackerPublicInterface {
  remove() {}
}
