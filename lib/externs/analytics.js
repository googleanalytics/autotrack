/**
 * Fields used by analytics.js.
 * @typedef {{
 *   allowAnchor: (boolean|undefined),
 *   allowLinker: (boolean|undefined),
 *   alwaysSendReferrer: (boolean|undefined),
 *   anonymizeIp: (boolean|undefined),
 *   appId: (string|undefined),
 *   appInstallerId: (string|undefined),
 *   appName: (string|undefined),
 *   appVersion: (string|undefined),
 *   buildHitTask: (Function|undefined),
 *   campaignContent: (string|undefined),
 *   campaignId: (string|undefined),
 *   campaignKeyword: (string|undefined),
 *   campaignMedium: (string|undefined),
 *   campaignName: (string|undefined),
 *   campaignSource: (string|undefined),
 *   checkProtocolTask: (Function|undefined),
 *   checkStorageTask: (Function|undefined),
 *   clientId: (string|undefined),
 *   contentGroup: (string|undefined),
 *   cookieDomain: (string|undefined),
 *   cookieExpires: (number|undefined),
 *   cookieName: (string|undefined),
 *   cookiePath: (string|undefined),
 *   currencyCode: (string|undefined),
 *   dataSource: (string|undefined),
 *   devIdTask: (Function|undefined),
 *   displayFeaturesTask: (Function|undefined),
 *   encoding: (string|undefined),
 *   eventAction: (string|undefined),
 *   eventCategory: (string|undefined),
 *   eventLabel: (string|undefined),
 *   eventValue: (number|undefined),
 *   exDescription: (string|undefined),
 *   exFatal: (boolean|undefined),
 *   exp: (string|undefined),
 *   expId: (string|undefined),
 *   expVar: (string|undefined),
 *   flashVersion: (string|undefined),
 *   forceSSL: (boolean|undefined),
 *   historyImportTask: (Function|undefined),
 *   hitCallback: (Function|undefined),
 *   hitPayload: (string|undefined),
 *   hitType: (string|undefined),
 *   hostname: (string|undefined),
 *   javaEnabled: (boolean|undefined),
 *   language: (string|undefined),
 *   legacyCookieDomain: (string|undefined),
 *   legacyHistoryImport: (boolean|undefined),
 *   linkerParam: (string|undefined),
 *   linkid: (string|undefined),
 *   location: (string|undefined),
 *   name: (string|undefined),
 *   nonInteraction: (boolean|undefined),
 *   page: (string|undefined),
 *   previewTask: (Function|undefined),
 *   queueTime: (number|undefined),
 *   referrer: (string|undefined),
 *   sampleRate: (number|undefined),
 *   samplerTask: (Function|undefined),
 *   screenColors: (string|undefined),
 *   screenName: (string|undefined),
 *   screenResolution: (string|undefined),
 *   sendHitTask: (Function|undefined),
 *   sessionControl: (string|undefined),
 *   sessionGroup: (string|undefined),
 *   siteSpeedSampleRate: (number|undefined),
 *   socialAction: (string|undefined),
 *   socialNetwork: (string|undefined),
 *   socialTarget: (string|undefined),
 *   storage: (string|undefined),
 *   timingCategory: (string|undefined),
 *   timingLabel: (string|undefined),
 *   timingTask: (Function|undefined),
 *   timingValue: (number|undefined),
 *   timingVar: (string|undefined),
 *   title: (string|undefined),
 *   trackingId: (string|undefined),
 *   transport: (string|undefined),
 *   transportUrl: (string|undefined),
 *   useBeacon: (boolean|undefined),
 *   userId: (string|undefined),
 *   validationTask: (Function|undefined),
 *   viewportSize: (string|undefined),
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
