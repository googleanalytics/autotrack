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
let FieldsObj;


/**
 * @typedef {{
 *   get: (!Function),
 *   set: (!Function),
 *   send: (!Function),
 * }}
 */
let Tracker;


/**
 * @typedef {{
 *   get: (!Function),
 *   set: (!Function),
 * }}
 */
let Model;


window.gaDevIds;
window.gaplugins;
window.GoogleAnalyticsObject;

window.ga;
window.ga.q;
