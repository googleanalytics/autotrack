Autotrack
=========

[![Sauce Test Status](https://saucelabs.com/browser-matrix/autotrack.svg)](https://saucelabs.com/u/autotrack)

## Overview

The default [JavaScript tracking snippet](https://developers.google.com/analytics/devguides/collection/analyticsjs/) for Google Analytics is powerful and collects important information about the pages users are visiting on your website. But as sites today are becoming increasingly complex, there's a lot more going on that the default snippet is not capturing.

The `autotrack` library attempts to solve this problem. It's a small (3.1K gzipped) collection of [analytics.js](https://developers.google.com/analytics/devguides/collection/analyticsjs/) plugins built for today's modern web. It's goal is to provide a new baseline for web tracking and to make it easier to build your own custom implementations.

The following plugins are included with `autotrack.js`:

<table>
  <tr>
    <th align="left">Plugin</th>
    <th align="left">Description</th>
  </tr>
  <tr>
    <td><a href="#eventTracker"><code>eventTracker</code></a></td>
    <td>Declarative event tracking</td>
  </tr>
  <tr>
    <td><a href="#mediaQueryTracker"><code>mediaQueryTracker</code></a></td>
    <td>Media query and breakpoint tracking</td>
  </tr>
  <tr>
    <td><a href="#outboundFormTracker"><code>outboundFormTracker</code></a></td>
    <td>Automatic outbound form tracking</td>
  </tr>
  <tr>
    <td><a href="#outboundLinkTracker"><code>outboundLinkTracker</code></a></td>
    <td>Automatic outbound link tracking</td>
  </tr>
  <tr>
    <td><a href="#sessionDurationTracker"><code>sessionDurationTracker</code></a></td>
    <td>Enhanced session duration tracking</td>
  </tr>
  <tr>
    <td><a href="#socialTracker"><code>socialTracker</code></a></td>
    <td>Automatic and enhanced declarative social tracking</td>
  </tr>
  <tr>
    <td><a href="#urlChangeTracker"><code>urlChangeTracker</code></a></td>
    <td>Automatic URL change tracking for single page applications</td>
  </tr>
</table>

## Usage

To add `autotrack` to your site, you have to do two things:

1. Load the JavaScript file on your page.
2. Update the [tracking snippet](https://developers.google.com/analytics/devguides/collection/analyticsjs/tracking-snippet-reference) to [require](https://developers.google.com/analytics/devguides/collection/analyticsjs/using-plugins) the `autotrack` plugin.

If your site already includes the default JavaScript tracking snippet, you can replace it with the following modified snippet (note the added `require` command as well as the additional `autotrack.js` script):

```html
<script>
window.ga=window.ga||function(){(ga.q=ga.q||[]).push(arguments)};ga.l=+new Date;
ga('create', 'UA-XXXXX-Y', 'auto');
ga('require', 'autotrack');
ga('send', 'pageview');
</script>
<script async src='//www.google-analytics.com/analytics.js'></script>
<script async src='path/to/autotrack.js'></script>
```

The [analytics.js plugin system](https://developers.google.com/analytics/devguides/collection/analyticsjs/using-plugins) is designed to support asynchronously loaded scripts, so it doesn't matter if the `autotrack.js` is loaded before or after `analytics.js`. It also doesn't matter if the `autotrack` library is loaded individually or bundled with the rest of your JavaScript code.

### Loading `autotrack` via npm

If you use npm and a module loader like [Browserify](http://browserify.org/), [Webpack](https://webpack.github.io/), or [SystemJS](https://github.com/systemjs/systemjs), you can include `autotrack` in your build by requiring it as you would any other npm module:

```sh
npm install autotrack
```

```js
// In your JavaScript code
require('autotrack');
```

Note that the above code will include the `autotrack` plugins in your build, but it won't register the plugin for use on an analytics.js tracker object. Adding the `require` command to the tracking snippet is still necessary:

```js
// In the analytics.js snippet
ga('create', 'UA-XXXXX-Y', 'auto');
ga('require', 'autotrack');
ga('send', 'pageview');
```

### Using individual plugins

The `autotrack.js` source file includes all the plugins described below, but in some cases you might not want to use all of them.

When you require the `autotrack` plugin, it runs the require command for each of the bundled plugins and passes them a copy of the configuration object it received (if any). To only use select plugins, you can require them individually instead of requiring the `autotrack` plugin.

For example, to only use the `outboundLinkTracker` and `sessionDurationTracker` plugins, you can modify the snippet as follows:

```js
ga('create', 'UA-XXXXX-Y', 'auto');
ga('require', 'outboundLinkTracker');
ga('require', 'sessionDurationTracker');
ga('send', 'pageview');
```

Note that the `autotrack` source file still includes the code for all plugins. To build a custom version of the script with only the desired plugins, see the [custom builds](#custom builds) section below.

## Plugins

### `eventTracker`

The `eventTracker` plugin adds declarative event tracking for click events on any element with the `data-event-category` and `data-event-action` attributes. The attributes `data-event-label` and `data-event-value` are also supported (attribute names are customizable).

#### Options

* [`attributePrefix`](#attributePrefix)

#### Example

The following element would send an event hit to Google Analytics with the category "video" and the action "play":

```html
<button data-event-category="video" data-event-action="play">Play</button>
```

### `mediaQueryTracker`

The `mediaQueryTracker` plugin allows you to track what media query is currently active as well as how often the matching media query changes.

You can tell the `mediaQueryTracker` plugin what media query data to look for via the [`mediaQueryDefinitions`](#mediaQueryDefinitions) configuration option.

Note, Google Analytics does not have built in fields for media query data, but you can set up one or more [custom dimensions](https://support.google.com/analytics/answer/2709828) to capture this data. You must set up your custom dimensions in Google Analytics before you can use this plugin, as each of the `mediaQueryDefinitions` objects requires a `dimensionIndex` value, which is specific to your individual setup.

To create a custom dimension, refer to the support article: [Create and edit custom dimensions and metrics](https://support.google.com/analytics/answer/2709829). You can choose any name you want (if can be changed later), and you should select a scope of "hit".

#### Options

* [`mediaQueryDefinitions`](#mediaQueryDefinitions)

#### Example

The following configuration will track breakpoint, device resolution, and device orientation data:

```js
ga('require', 'autotrack', {
  mediaQueryDefinitions: [
    {
      name: 'Breakpoint',
      dimensionIndex: 1,
      items: [
        {name: 'sm', media: 'all'},
        {name: 'md', media: '(min-width: 30em)'},
        {name: 'lg', media: '(min-width: 48em)'}
      ]
    },
    {
      name: 'Resolution',
      dimensionIndex: 2,
      items: [
        {name: '1x',   media: 'all'},
        {name: '1.5x', media: '(min-resolution: 144dpi)'},
        {name: '2x',   media: '(min-resolution: 192dpi)'}
      ]
    },
    {
      name: 'Orientation',
      dimensionIndex: 3,
      items: [
        {name: 'landscape', media: '(orientation: landscape)'},
        {name: 'portrait',  media: '(orientation: portrait)'}
      ]
    }
  ]
});
```

See the [`mediaQueryDefinitions`](#mediaQueryDefinitions) option documentation for more details.

### `outboundFormTracker`

The `outboundFormTracker` plugin automatically detects when forms are submitted to sites on different domains and sends and event hit. The event category is "Outbound Form", the event action is "submit", and the event label is the value of the form's `action` attribute.

### `outboundLinkTracker`

The `outboundLinkTracker` plugin automatically detects when links are clicked with `href` attributes pointing to sites on different domains and sends and event hit. The event category is "Outbound Link", the event action is "click", and the event label is the value of the link's `href` attribute.

### `sessionDurationTracker`

Session duration in Google Analytics is defined as the amount of time between the first and last hit of a session. For session where a user visits just one page and then leaves, the session duration is zero, even if the user stayed on the page for several minutes. Even for sessions with multiple pageviews, it can still be a problem because the duration of the last pageview is usually not considered.

The `sessionDurationTracker` plugin solves this problem by sending an event hit to Google Analytics when the document is being unloaded. The event category is "Window" and the action is "unload". For browsers that support the [`performance.timing` API](https://developer.mozilla.org/en-US/docs/Web/API/Performance), the event value is the time since the `navigationStart` event.

### `socialTracker`

The `sessionDurationTracker` plugin adds declarative social interaction tracking for click events on any element with the `data-social-network`, `data-social-action`, and `data-social-target` attributes, similar to the `eventTracking` plugin.

In addition, pages that include the official Twitter tweet and follow buttons, as well as the Facebook like buttons will have those interactions tracked as well.

The following table outlines the social fields used for each:

<table>
  <tr>
    <th align="left">Widget</th>
    <th align="left">Social Network</th>
    <th align="left">Social Action</th>
    <th align="left">Social Target</th>
  </tr>
  <tr>
    <td>Like button</td>
    <td><code>Facebook</code></td>
    <td><code>like</code> or <code>unlike</code></td>
    <td>The URL of the current page.</td>
  </tr>
  <tr>
    <td>Tweet button</td>
    <td><code>Twitter</code></td>
    <td><code>tweet</code></td>
    <td>The widget's <code>data-url</code> attribute or the URL of the current page.</td>
  </tr>
  <tr>
    <td>Follow button</td>
    <td><code>Twitter</code></td>
    <td><code>follow</code></td>
    <td>The widget's <code>data-screen-name</code> attribute.</td>
  </tr>
</table>

### `urlChangeTracker`

The `urlChangeTracker` plugin detects changes to the URL via the [History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API) and automatically updates the tracker and sends additional pageviews.

The plugin does not support tracking hash changes as most Google Analytics implementations do not capture the hash portion of the URL when tracking pageviews.

#### Options

* [`shouldTrackUrlChange`](#shouldTrackUrlChange)


## Configuration options

The following options can be passed to the `autotrack` plugin or individual sub-plugins:

### `attributePrefix`

**Type**: `string`

**Default**: `'data-'`

The attribute prefix for declarative event and social tracking. The value used after the prefix is a kebab-case version of the field name, for example: the field `eventCategory` with the prefix `'data-ga-'` would be `data-ga-event-category`.

### `mediaQueryDefinitions`

**Type**: `Object|Array|null`

**Default**: `null`

A media query definitions object or a list of media query definition objects. A media query definitions object contains the following properties:

  - `name`: a unique name that will be used as the `eventCategory` value for media query change events.
  - `dimensionIndex`: the index of the custom dimension created in Google Analytics.
  - `items`: An array of objects with the following properties:
    - `name`: The value that will be set on the custom dimension.
    - `media`: The media query value to test for a match.

The following array is an example of three media query object defintions:

```js
[
  {
    name: 'Breakpoint',
    dimensionIndex: 1,
    items: [
      {name: 'sm', media: 'all'},
      {name: 'md', media: '(min-width: 30em)'},
      {name: 'lg', media: '(min-width: 48em)'}
    ]
  },
  {
    name: 'Resolution',
    dimensionIndex: 2,
    items: [
      {name: '1x',   media: 'all'},
      {name: '1.5x', media: '(min-resolution: 144dpi)'},
      {name: '2x',   media: '(min-resolution: 192dpi)'}
    ]
  },
  {
    name: 'Orientation',
    dimensionIndex: 3,
    items: [
      {name: 'landscape', media: '(orientation: landscape)'},
      {name: 'portrait',  media: '(orientation: portrait)'}
    ]
  }
]
```

If multiple `media` values match at the same time, the one specified later in the `items` array will take precedence. For example, in the "Breakpoint" example above, the item `sm` is set to `all`, so it will always match unless `md` or `lg` matches.

### `mediaQueryChangeTemplate`

**Type**: `Function`

**Default**:

```js
function(newValue, oldValue) {
  return oldValue + ' => ' + newValue;
}
```

A function used to format the `eventLabel` of media query change events. For example, if the matched media changes from `lg` to `md`, by default the result will be `lg => md`.

### `mediaQueryChangeTimeout`

**Type**: `number`

**Default**: `1000`

The debounce timeout, i.e., the amount of time to wait before sending the change hit. If multiple change events occur within the timeout period, only the last one is sent.

### `shouldTrackUrlChange`

**Type**: `Function`

**Default**:

```js
function(newPath, oldPath) {
  return true;
}
```

A function used to determine if a URL change should be tracked. By default, all changes other than hash changes are captured.

The function is invoked with the string values `newPath` and `oldPath` which represent the pathname and search portion of the URL (not the hash portion).

## Advanced Usage

### Custom builds

The `autotrack` library is built modularly and each plugin includes its own dependencies, so you can create a custom build of the library using a script bundler such as Browserify.

The following example shows how to create a build that only includes the `outboundLinkTracker` and `sessionDurationTracker` plugins:

```sh
browserify lib/plugins/outbound-link-tracker lib/plugins/session-duration-tracker
```

When making a custom build, be sure to update the tracking snippet to only require plugins included in your build. Requiring a plugin that's not included in the build will prevent subsequent `analytics.js` commands from running.

If you're already using a module loader like Browserify, Webpack, or SystemJS to build your JavaScript, you can skip the above step and just require the plugins you want directly in your source files:

```js
// In your JavaScript code
require('autotrack/lib/plugins/outbound-link-tracker');
require('autotrack/lib/plugins/session-duration-tracker');
```

Check out the [`autotrack` source code](https://github.com/philipwalton/autotrack/blob/master/lib/plugins/autotrack.js) to get a better idea how this works.

### Using `autotrack` with multiple trackers

All `autotrack` plugins support multiple trackers and work by specifying the tracker name in the `require` command. The following example creates two trackers and requires `autotrack` on both.

```js
ga('create', 'UA-XXXXX-Y', 'auto', 'tracker1');
ga('create', 'UA-XXXXX-Z', 'auto', 'tracker2');
ga('tracker1.require', 'autotrack');
ga('tracker2.require', 'autotrack');
ga('tracker1.send', 'pageview');
ga('tracker2.send', 'pageview');
```
