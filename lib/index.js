import OutBoundLinkTracker from './links';

/*
TODO(philipwalton):
Add logic to figure out whether or not to use the default tracker.
Possible choices:
  - if there's only a single tracker, assume it and just go ahead
  - if there's more than one tracker, wait for initialization
*/


/**
 * Provides a plugin for use with analytics.js
 */
function providePlugin(pluginName, pluginConstructor) {
  let ga = window[window['GoogleAnalyticsObject'] || 'ga'];
  if (typeof ga == 'function') {
    ga('provide', pluginName, pluginConstructor);
  }
}


providePlugin('outboundLinkTracker', OutBoundLinkTracker);

// Set the default transport mechanism to beacon.
// ga('set', 'transport', 'beacon');





