/**
 * Fields used by analytics.js.
 * This is not an extensive list of all anlaytics.js fields, just the ones
 * referenced by autotrack plugins.
 * @typedef {{
 *   buildHitTask: (Function|undefined),
 *   eventAction: (string|undefined),
 *   eventCategory: (string|undefined),
 *   eventLabel: (string|undefined),
 *   eventValue: (number|undefined),
 *   hitType: (string|undefined),
 *   hitCallback: (Function|undefined),
 *   location: (string|undefined),
 *   nonInteraction: (boolean|undefined),
 *   page: (string|undefined),
 *   sendHitTask: (Function|undefined),
 *   socialAction: (string|undefined),
 *   socialNetwork: (string|undefined),
 *   socialTarget: (string|undefined),
 *   transport: (string|undefined),
 * }}
 */
var FieldsObj;


/**
 * @typedef {{
 *   get: (!Function),
 *   set: (!Function),
 *   send: (!Function),
 * }}
 */
var Tracker;


/**
 * @typedef {{
 *   get: (!Function),
 *   set: (!Function),
 * }}
 */
var Model;


var gaDevIds;
var gaplugins;
var GoogleAnalyticsObject;


var ga;
ga.q;

/**
 * @param {string} name
 * @return {Tracker}
 */
ga.getByName = function(name) {};

/**
 * @return {Array<Tracker>}
 */
ga.getAll = function() {};
