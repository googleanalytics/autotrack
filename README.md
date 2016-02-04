Autotrack
=========

[![Sauce Test Status](https://saucelabs.com/browser-matrix/autotrack.svg)](https://saucelabs.com/u/autotrack)

## Overview

The default [JavaScript tracking snippet](https://developers.google.com/analytics/devguides/collection/analyticsjs/) for Google Analytics runs when a web page is first loaded and sends a pageview hit to Google Analytics. If you want to know about more than just pageviews (e.g. events, social interactions), you have to write code to capture that information yourself.

Since most website owners care about most of the same types of user interactions, web developers end up writing the same code over and over again for every new site they build.

Autotrack was created to solve this problem. It provides default tracking for the interactions most people care about, and it provides several convenience features (e.g. declarative event tracking) to make it easier than ever to understand how people are using your site.

The `autotrack.js` library is small (3K gzipped), and includes the following plugins. By default all plugin are bundled together, but they can be included and configured separately as well:

<table>
  <tr>
    <th align="left">Plugin</th>
    <th align="left">Description</th>
  </tr>
  <tr>
    <td><a href="#eventtracker"><code>eventTracker</code></a></td>
    <td>Declarative event tracking</td>
  </tr>
  <tr>
    <td><a href="#mediaquerytracker"><code>mediaQueryTracker</code></a></td>
    <td>Media query and breakpoint tracking</td>
  </tr>
  <tr>
    <td><a href="#outboundformtracker"><code>outboundFormTracker</code></a></td>
    <td>Automatic outbound form tracking</td>
  </tr>
  <tr>
    <td><a href="#outboundlinktracker"><code>outboundLinkTracker</code></a></td>
    <td>Automatic outbound link tracking</td>
  </tr>
  <tr>
    <td><a href="#sessiondurationtracker"><code>sessionDurationTracker</code></a></td>
    <td>Enhanced session duration tracking</td>
  </tr>
  <tr>
    <td><a href="#socialtracker"><code>socialTracker</code></a></td>
    <td>Automatic and enhanced declarative social tracking</td>
  </tr>
  <tr>
    <td><a href="#urlchangetracker"><code>urlChangeTracker</code></a></td>
    <td>Automatic URL change tracking for single page applications</td>
  </tr>
</table>

## Usage

To add autotrack to your site, you have to do two things:

1. Load the `autotrack.js` script file on your page.
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

The [analytics.js plugin system](https://developers.google.com/analytics/devguides/collection/analyticsjs/using-plugins) is designed to support asynchronously loaded scripts, so it doesn't matter if `autotrack.js` is loaded before or after `analytics.js`. It also doesn't matter if the `autotrack.js` library is loaded individually or bundled with the rest of your JavaScript code.

### Loading autotrack via npm

If you use npm and a module loader like [Browserify](http://browserify.org/), [Webpack](https://webpack.github.io/), or [SystemJS](https://github.com/systemjs/systemjs), you can include autotrack in your build by requiring it as you would any other npm module:

```sh
npm install autotrack
```

```js
// In your JavaScript code
require('autotrack');
```

Note that the above code will include the autotrack plugins in the generated JavaScript file, but it won't register the plugin for use on an `analytics.js` tracker object. Adding the `require` command to the tracking snippet is still necessary:

```js
// In the analytics.js tracking snippet
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

Note that the `autotrack.js` source file still includes the code for all plugins. To build a custom version of the script with only the desired plugins, see the [custom builds](#custom-builds) section below.

## Plugins

### `eventTracker`

The `eventTracker` plugin adds declarative event tracking for click events on any element with the `data-event-category` and `data-event-action` attributes. The attributes `data-event-label` and `data-event-value` are also supported (attribute names are customizable).

#### Options

* [`attributePrefix`](#attributeprefix)

#### Example

The following element would send an event hit to Google Analytics with the category "video" and the action "play":

```html
<button data-event-category="video" data-event-action="play">Play</button>
```

### `mediaQueryTracker`

The `mediaQueryTracker` plugin allows you to track what media query is active as well as how often the matching media query changes.

You can tell the `mediaQueryTracker` plugin what media query data to look for via the [`mediaQueryDefinitions`](#mediaquerydefinitions) configuration option.

**Important: unlike the other autotrack plugins, to use the `mediaQueryTracker` plugin you have to first make a few changes to your property settings in Google Analytics. Here's what needs to be done:**

1. Log in to Google Analytics, choose the [account and property](https://support.google.com/analytics/answer/1009618) you're sending data too, and [create a custom dimension](https://support.google.com/analytics/answer/2709829) for each set of media queries you want to track (e.g. Breakpoints, Resolution/DPI, Device Orientation)
2. Give each dimension a name (e.g. Breakpoints), select a scope of [hit](https://support.google.com/analytics/answer/2709828#example-hit), and make sure the "active" checkbox is checked.
3. In the [`mediaQueryDefinitions`](#mediaquerydefinitions) config object, set the `name` and `dimensionIndex` values to be the same as the name and index shown in Google Analytics.

#### Options

* [`mediaQueryDefinitions`](#mediaquerydefinitions)

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

See the [`mediaQueryDefinitions`](#mediaquerydefinitions) option documentation for more details.

### `outboundFormTracker`

The `outboundFormTracker` plugin automatically detects when forms are submitted to sites on different domains and sends an event hit. The event category is "Outbound Form", the event action is "submit", and the event label is the value of the form's `action` attribute.

### `outboundLinkTracker`

The `outboundLinkTracker` plugin automatically detects when links are clicked with `href` attributes pointing to sites on different domains and sends an event hit. The event category is "Outbound Link", the event action is "click", and the event label is the value of the link's `href` attribute.

### `sessionDurationTracker`

Session duration in Google Analytics is defined as the amount of time between the first and last hit of a session. For a session where a user visits just one page and then leaves, the session duration is zero, even if the user stayed on the page for several minutes. Even for sessions with multiple pageviews, it can still be a problem because the duration of the last pageview is usually not considered.

The `sessionDurationTracker` plugin partially solves this problem by sending an event hit to Google Analytics (in browsers that support [`navigator.sendBeacon`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon)) when the document is being unloaded. The event category is "Window" and the action is "unload". For browsers that support the [`performance.timing` API](https://developer.mozilla.org/en-US/docs/Web/API/Performance), the event value is the time since the `navigationStart` event.

### `socialTracker`

The `socialTracker` plugin adds declarative social interaction tracking for click events on any element with the `data-social-network`, `data-social-action`, and `data-social-target` attributes, similar to the `eventTracking` plugin.

It also automatically adds social tracking for the offical Twitter tweet/follow buttons and the Facebook like button. In other words, if you include offical Twitter or Facebook buttons on your page and you're using autotrack (or even just the `socialTracker` plugin), user interactions with those buttons will be automatically tracked.

The following table outlines the social fields captured:

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

The `urlChangeTracker` plugin detects changes to the URL via the [History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API) and automatically updates the tracker and sends additional pageviews. This allows [single page applications](https://en.wikipedia.org/wiki/Single-page_application) to be tracked like traditional sites without any extra configuration.

Note, this plugin does not support tracking hash changes as most Google Analytics implementations do not capture the hash portion of the URL when tracking pageviews. Also, developers of single page applications should make sure their framework isn't already tracking URL changes to avoid collecting duplicate data.

#### Options

* [`shouldTrackUrlChange`](#shouldtrackurlchange)


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
  - `dimensionIndex`: the index of the custom dimension [created in Google Analytics](https://support.google.com/analytics/answer/2709829).
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

The autotrack library is built modularly and each plugin includes its own dependencies, so you can create a custom build of the library using a script bundler such as [Browserify](http://browserify.org/).

The following example shows how to create a build that only includes the `outboundLinkTracker` and `sessionDurationTracker` plugins:

```sh
browserify lib/plugins/outbound-link-tracker lib/plugins/session-duration-tracker
```

When making a custom build, be sure to update the tracking snippet to only require plugins included in your build. Requiring a plugin that's not included in the build will prevent any subsequent `analytics.js` commands from running.

If you're already using a module loader like [Browserify](http://browserify.org/), [Webpack](https://webpack.github.io/), or [SystemJS](https://github.com/systemjs/systemjs) to build your JavaScript, you can skip the above step and just require the plugins you want directly in your source files:

```js
// In your JavaScript code
require('autotrack/lib/plugins/outbound-link-tracker');
require('autotrack/lib/plugins/session-duration-tracker');
```

Check out the [autotrack source code](https://github.com/philipwalton/autotrack/blob/master/lib/plugins/autotrack.js) to get a better idea how this works.

### Using autotrack with multiple trackers

All autotrack plugins support multiple trackers and work by specifying the tracker name in the `require` command. The following example creates two trackers and requires `autotrack` on both.

```js
ga('create', 'UA-XXXXX-Y', 'auto', 'tracker1');
ga('create', 'UA-XXXXX-Z', 'auto', 'tracker2');
ga('tracker1.require', 'autotrack');
ga('tracker2.require', 'autotrack');
ga('tracker1.send', 'pageview');
ga('tracker2.send', 'pageview');
```


## Disclaimer

The autotrack library is not an official Google Analytics product and is not covered by Google Analytics Premium support. Developers that choose to use this library are responsible for ensuring that their implementation meets the requirements of the [Google Analytics Terms of Service](https://www.google.com/analytics/terms/us.html) and the legal obligations of their respective country.

