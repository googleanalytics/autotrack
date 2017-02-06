/**
 * Public options for the EventTracker.
 * @typedef {{
 *   events: (!Array<string>),
 *   fieldsObj: (!FieldsObj),
 *   attributePrefix: (string),
 *   hitFilter: (Function|undefined),
 * }}
 */
var EventTrackerOpts;


/**
 * @interface
 */
class EventTrackerPublicInterface {
  remove() {}
}
