# Upgrade Guide

## From `1.x.x` to `2.x.x`

### Breaking changes

- Autotrack source code now uses [ES2015 module](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import) syntax to enable tree shaking, which generates a smaller build. This may cause problems with some bundlers like [Browserify](http://browserify.org/) that don't natively support this syntax.

#### [`cleanUrlTracker`](/docs/plugins/clean-url-tracker.md)

- When the `cleanUrlTracker` plugin is used, calls to `tracker.get('page')` will return the "cleaned" version of the page.

#### [`impressionTracker`](/docs/plugins/impression-tracker.md)

- Events sent by `impressionTracker` are now [`nonInteraction`](https://support.google.com/analytics/answer/1033068#NonInteractionEvents) be default.

#### [`pageVisibilityTracker`](/docs/plugins/page-visibility-tracker.md)

- The `change` event action is no longer used; instead, events with a `track` action are sent after a page is transitioning out of the visible state to record the amount of time the page was visible.
- The `changeTemplate` option has been removed since `change` events are no longer tracked.
- The `hiddenMetricIndex` option has been removed since time in the hidden state is not a particularly useful metric.

### New plugins

A `maxScrollTracker` plugin has been added. See its [documentation page](/docs/plugins/max-scroll-tracker.md) for usage details.

### Updates and bug fixes

#### [`outboundFormTracker`](/docs/plugins/outbound-form-tracker.md)

- A bug where the `formSelector` option was ignored has been fixed.

#### [`outboundLinkTracker`](/docs/plugins/outbound-link-tracker.md)

- The use of `target="_blank"` was removed (for browsers that don't support the `beacon` transport mechanism) in favor of a manual redirect.

#### [`pageVisibilityTracker`](/docs/plugins/page-visibility-tracker.md)

- A `timeZone` option has been added to help better detect session boundaries.


## From `0.x.x` to `1.x.x`

### Breaking changes

In versions prior to 1.0.0, you could include all autotrack functionality with the single command `ga('require', 'autotrack')`. This was a convenient shorthand that would individually require all other plugins. You can reference the [original usage instructions](https://github.com/googleanalytics/autotrack/blob/0.6.5/README.md#usage) to see an example.

In versions 1.0.0+, you can no longer require all sub-plugins with this one command. Instead, you have explicitly require each plugin you want to use and pass it its own configuration options (if necessary). This change was made to avoid users accidentally enabling plugin behavior they didn't want.

The follow example shows how to require all autotrack plugins in versions 1.0.0+ *(note: the configuration options are omitted for simplicity)*:

```html
<script>
window.ga=window.ga||function(){(ga.q=ga.q||[]).push(arguments)};ga.l=+new Date;
ga('create', 'UA-XXXXX-Y', 'auto');

// Plugins must be required individually.
ga('require', 'cleanUrlTracker', {...});
ga('require', 'eventTracker', {...});
ga('require', 'impressionTracker', {...});
ga('require', 'mediaQueryTracker', {...});
ga('require', 'outboundFormTracker', {...});
ga('require', 'outboundLinkTracker', {...});
ga('require', 'pageVisibilityTracker', {...});
ga('require', 'socialWidgetTracker', {...});
ga('require', 'urlChangeTracker', {...});
// ...

ga('send', 'pageview');
</script>
<script async src="https://www.google-analytics.com/analytics.js"></script>
<script async src="path/to/autotrack.js"></script>
```

In all 1.x.x versions, requiring the `autotrack` plugin will do nothing but log a warning to the console. In version 2.0.0, this warning will go away, and calls to require autotrack may prevent [subsequent commands from running](https://devsite.googleplex.com/analytics/devguides/collection/analyticsjs/using-plugins#waiting_for_plugins_to_load).

#### [`mediaQueryTracker`](/docs/plugins/media-query-tracker.md)

- The `mediaQueryDefinitions` option has been renamed to `definitions`.
- The `mediaQueryChangeTemplate` option has been renamed to `changeTemplate`.
- The `mediaQueryChangeTimeout` option has been renamed to `changeTimeout`.

#### `socialTracker`

- The `socialTracker` plugin has been renamed to [`socialWidgetTracker`](/docs/plugins/social-widget-tracker.md) and no longer supports declarative social interaction tracking (since that can now be handled entirely via the [`eventTracker`](/docs/plugins/event-tracker.md) plugin).

### Updates and bug fixes

- All plugins that send hits accept both [`fieldsObj`](/docs/common-options.md#fieldsobj) and [`hitFilter`](/docs/common-options.md#hitfilter) options. These options can be used to set or change any valid analytics.js field prior to the hit being sent.
- All plugins that send hits as a result of user interaction with a DOM element support [setting field values declaratively](/docs/common-options.md#attributeprefix).

#### [`eventTracker`](/docs/plugins/event-tracker.md)

- Added support for declarative tracking of any DOM event, not just click events (e.g. `submit`, `contextmenu`, etc.)

#### [`outboundFormTracker`](/docs/plugins/outbound-form-tracker.md)

- Added support for tracking forms within shadow DOM subtrees.
- Added the ability to customize the selector used to identify forms.
- Added a `parseUrl` utility function to the `shouldTrackOutboundForm` method to more easily identify or exclude outbound forms.

#### [`outboundLinkTracker`](/docs/plugins/outbound-link-tracker.md)

- Added support for DOM events other than `click` (e.g. `contextmenu`, `touchend`, etc.)
- Added support for tracking links within shadow DOM subtrees.
- Added the ability to customize the selector used to identify links.
- Added a `parseUrl` utility function to the `shouldTrackOutboundLink` method to more easily identify or exclude outbound links.

### New plugins

The following new plugins have been added. See their individual documentation pages for usage details.

- [`cleanUrlTracker`](/docs/plugins/clean-url-tracker.md)
- [`impressionTracker`](/docs/plugins/impression-tracker.md)
- [`pageVisibilityTracker`](/docs/plugins/page-visibility-tracker.md)
