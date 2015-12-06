/**
 * Provides a plugin for use with analytics.js, accounting for the possibility
 * that the global command queue has been renamed.
 * @param {string} pluginName The plugin name identifier.
 * @param {Function} pluginContrustor The plugin constructor function.
 */
export default function providePlugin(pluginName, pluginConstructor) {
  let ga = window[window['GoogleAnalyticsObject'] || 'ga'];
  if (typeof ga == 'function') {
    ga('provide', pluginName, pluginConstructor);
  }
}
