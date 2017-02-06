window.twttr;
window.twttr.ready;
window.twttr.events;
window.twttr.events.bind;
window.twttr.events.unbind;

/**
 * Public options for the SocialWidgetTracker.
 * @typedef {{
 *   region: (!Object),
 *   data: ({
 *     url: (string),
 *     screen_name: (string),
 *   }),
 *   target: (Element),
 * }}
 */
var TwttrEvent;


window.FB;
window.FB.Events;
window.FB.Event.subscribe;
window.FB.Event.unsubscribe;

/**
 * Public options for the SocialWidgetTracker.
 * @typedef {{
 *   fieldsObj: (!Object),
 *   hitFilter: (Function|undefined),
 * }}
 */
var FBEvent;



/**
 * Public options for the SocialWidgetTracker.
 * @typedef {{
 *   fieldsObj: (!Object),
 *   hitFilter: (Function|undefined),
 * }}
 */
var SocialWidgetTrackerOpts;


/**
 * @interface
 */
class SocialWidgetTrackerPublicInterface {
  remove() {}
}
