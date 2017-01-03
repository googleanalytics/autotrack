/**
 * Public options for the OutboundLinkTracker.
 * @typedef {{
 *   events: (!Array),
 *   linkSelector: (string),
 *   shouldTrackOutboundLink: (!Function),
 *   fieldsObj: (!Object),
 *   attributePrefix: (string),
 *   hitFilter: (Function|undefined),
 * }}
 */
let OutboundLinkTrackerOpts;


/**
 * @interface
 */
class OutboundLinkTrackerPublicInterface {
  remove() {}
}
