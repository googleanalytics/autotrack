# Autotrack [![Build Status](https://travis-ci.org/googleanalytics/autotrack.svg?branch=master)](https://travis-ci.org/googleanalytics/autotrack)

- [Overview](#overview)
- [Plugins](#plugins)
- [Installation and usage](#installation-and-usage)
  - [Loading autotrack via npm](#loading-autotrack-via-npm)
  - [Passing configuration options](#passing-configuration-options)
- [Advanced configuration](#advanced-configuration)
  - [Custom builds](#custom-builds)
  - [Using autotrack with multiple trackers](#using-autotrack-with-multiple-trackers)
- [Browser Support](#browser-support)
- [Translations](#translations)

## Overview

The default [JavaScript tracking snippet](https://developers.google.com/analytics/devguides/collection/analyticsjs/) for Google Analytics runs when a web page is first loaded and sends a pageview hit to Google Analytics. If you want to know about more than just pageviews (e.g. where the user clicked, how far they scroll, did they see certain elements, etc.), you have to write code to capture that information yourself.

Since most website owners care about a lot of the same types of user interactions, web developers end up writing the same code over and over again for every new site they build.

Autotrack was created to solve this problem. It provides default tracking for the interactions most people care about, and it provides several convenience features (e.g. declarative event tracking) to make it easier than ever to understand how people are interacting with your site.

## Plugins

The `autotrack.js` file in this repository is small (8K gzipped) and comes with all plugins included. You can use it as is, or you can create a [custom build](#custom-builds) that only includes the plugins you want to make it even smaller.

The following table briefly explains what each plugin does; you can click on the plugin name to see the full documentation and usage instructions:

<table>
  <tr>
    <th align="left">Plugin</th>
    <th align="left">Description</th>
  </tr>
  <tr>
    <td><a href="/docs/plugins/clean-url-tracker.md"><code>cleanUrlTracker</code></a></td>
    <td>Ensures consistency in the URL paths that get reported to Google Analytics; avoiding the problem where separate rows in your pages reports actually point to the same page.</td>
  </tr>
  <tr>
    <td><a href="/docs/plugins/event-tracker.md"><code>eventTracker</code></a></td>
    <td>Enables declarative event tracking, via HTML attributes in the markup.</td>
  </tr>
  <tr>
    <td><a href="/docs/plugins/impression-tracker.md"><code>impressionTracker</code></a></td>
    <td>Allows you to track when elements are visible within the viewport.</td>
  </tr>
  <tr>
    <td><a href="/docs/plugins/max-scroll-tracker.md"><code>maxScrollTracker</code></a></td>
    <td>Automatically tracks how far down the page a user scrolls.</td>
  </tr>
  <tr>
    <td><a href="/docs/plugins/media-query-tracker.md"><code>mediaQueryTracker</code></a></td>
    <td>Enables tracking media query matching and media query changes.</td>
  </tr>
  <tr>
    <td><a href="/docs/plugins/outbound-form-tracker.md"><code>outboundFormTracker</code></a></td>
    <td>Automatically tracks form submits to external domains.</td>
  </tr>
  <tr>
    <td><a href="/docs/plugins/outbound-link-tracker.md"><code>outboundLinkTracker</code></a></td>
    <td>Automatically tracks link clicks to external domains.</td>
  </tr>
  <tr>
    <td><a href="/docs/plugins/page-visibility-tracker.md"><code>pageVisibilityTracker</code></a></td>
    <td>Automatically tracks how long pages are in the visible state (as opposed to in a background tab)</td>
  </tr>
  <tr>
    <td><a href="/docs/plugins/social-widget-tracker.md"><code>socialWidgetTracker</code></a></td>
    <td>Automatically tracks user interactions with the official Facebook and Twitter widgets.</td>
  </tr>
  <tr>
    <td><a href="/docs/plugins/url-change-tracker.md"><code>urlChangeTracker</code></a></td>
    <td>Automatically tracks URL changes for single page applications.</td>
  </tr>
</table>

**Disclaimer:** autotrack is maintained by members of the Google Analytics developer platform team and is primarily intended for a developer audience. It is not an official Google Analytics product and does not qualify for Google Analytics 360 support. Developers who choose to use this library are responsible for ensuring that their implementation meets the requirements of the [Google Analytics Terms of Service](https://marketingplatform.google.com/about/analytics/terms/us/) and the legal obligations of their respective country.

## Installation and usage

To add autotrack to your site, you have to do two things:

1. Load the `autotrack.js` script file included in this repo (or a [custom build](#custom-builds)) on your page.
2. Update your [tracking snippet](https://developers.google.com/analytics/devguides/collection/analyticsjs/tracking-snippet-reference) to [require](https://developers.google.com/analytics/devguides/collection/analyticsjs/using-plugins) the various autotrack plugins you want to use on the [tracker](https://developers.google.com/analytics/devguides/collection/analyticsjs/creating-trackers).

If your site is currently using the [default JavaScript tracking snippet](https://developers.google.com/analytics/devguides/collection/analyticsjs/tracking-snippet-reference), you can modify it to something like this:

```html
<script>
window.ga=window.ga||function(){(ga.q=ga.q||[]).push(arguments)};ga.l=+new Date;
ga('create', 'UA-XXXXX-Y', 'auto');

// Replace the following lines with the plugins you want to use.
ga('require', 'eventTracker');
ga('require', 'outboundLinkTracker');
ga('require', 'urlChangeTracker');
// ...

ga('send', 'pageview');
</script>
<script async src="https://www.google-analytics.com/analytics.js"></script>
<script async src="path/to/autotrack.js"></script>
```

Of course, you'll have to make the following modifications to the above code to customize autotrack to your needs:

- Replace `UA-XXXXX-Y` with your [tracking ID](https://support.google.com/analytics/answer/1032385)
- Replace the sample list of plugin `require` statements with the plugins you want to use.
- Replace `path/to/autotrack.js` with the actual location of the `autotrack.js` file hosted on your server.

**Note:** the [analytics.js plugin system](https://developers.google.com/analytics/devguides/collection/analyticsjs/using-plugins) is designed to support asynchronously loaded scripts, so it doesn't matter if `autotrack.js` is loaded before or after `analytics.js`. It also doesn't matter if the `autotrack.js` library is loaded individually or bundled with the rest of your JavaScript code.

### Loading autotrack via npm

If you use npm and a module loader that understands [ES2015 imports](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import) (e.g. [Webpack](https://webpack.js.org/), [Rollup](https://rollupjs.org/), or [SystemJS](https://github.com/systemjs/systemjs)), you can include autotrack in your build by importing it as you would any other npm module:

```sh
npm install autotrack
```

```js
// In your JavaScript code
import 'autotrack';
```
**Note:** autotrack's source is published as ES2015, and you will need to make sure you're not excluding it from compilation. See [#137](https://github.com/googleanalytics/autotrack/issues/137) for more details.

The above `import` statement will include all autotrack plugins in your generated source file. If you only want to include a specific set of plugins, you can import them individually:

```js
// In your JavaScript code
import 'autotrack/lib/plugins/event-tracker';
import 'autotrack/lib/plugins/outbound-link-tracker';
import 'autotrack/lib/plugins/url-change-tracker';
```

The above examples show how to include the autotrack plugin source in your site's main JavaScript bundle, which accomplishes the first step of the [two-step installation process](#installation-and-usage). However, you still have to update your tracking snippet and require the plugins you want to use on the tracker.

```js
// Import just the plugins you want to use.
import 'autotrack/lib/plugins/event-tracker';
import 'autotrack/lib/plugins/outbound-link-tracker';
import 'autotrack/lib/plugins/url-change-tracker';

ga('create', 'UA-XXXXX-Y', 'auto');

// Only require the plugins you've imported above.
ga('require', 'eventTracker');
ga('require', 'outboundLinkTracker');
ga('require', 'urlChangeTracker');

ga('send', 'pageview');
```

#### Code splitting

Note that it's generally not a good idea to include any analytics as part of your site's main JavaScript bundle since analytics are not usually critical application functionality.

If you're using a bundler that supports code splitting (via something like `System.import()`), it's best to load autotrack plugins lazily and delay their initialization until after your site's critical functionality has loaded:

```js
window.addEventListener('load', () => {
  const autotrackPlugins = [
    'autotrack/lib/plugins/event-tracker',
    'autotrack/lib/plugins/outbound-link-tracker',
    'autotrack/lib/plugins/url-change-tracker',
    // List additional plugins as needed.
  ];

  Promise.all(autotrackPlugins.map((x) => System.import(x))).then(() => {
    ga('create', 'UA-XXXXX-Y', 'auto');

    ga('require', 'eventTracker', {...});
    ga('require', 'outboundLinkTracker', {...});
    ga('require', 'urlChangeTracker', {...});
    // Require additional plugins imported above.

    ga('send', 'pageview');
  });
})
```

If you're not sure how do use code splitting with your build setup, see the [custom builds](#custom-builds) section to learn how to manually generate a custom version of autotrack with just the plugins you need.

### Passing configuration options

All autotrack plugins accept a configuration object as the third parameter to the `require` command.

Some of the plugins (e.g. `outboundLinkTracker`, `socialWidgetTracker`, `urlChangeTracker`) have a default behavior that works for most people without specifying any configuration options. Other plugins (e.g. `cleanUrlTracker`, `impressionTracker`, `mediaQueryTracker`) require certain configuration options to be set in order to work.

See the individual plugin documentation to reference what options each plugin accepts (and what the default value is, if any).

## Advanced configuration

### Custom builds

Autotrack comes with its own build system, so you can create autotrack bundles containing just the plugins you need. Once you've [installed autotrack via npm](#loading-autotrack-via-npm), you can create custom builds by running the `autotrack` command.

For example, the following command generates an `autotrack.js` bundle and source map for just the `eventTracker`, `outboundLinkTracker`, and `urlChangeTracker` plugins:

```sh
autotrack -o path/to/autotrack.custom.js -p eventTracker,outboundLinkTracker,urlChangeTracker
```

Once this file is generated, you can include it in your HTML templates where you load `analytics.js`. Note the use of the `async` attribute on both script tags. This prevents `analytics.js` and `autotrack.custom.js` from interfering with the loading of the rest of your site.

```html
<script async src="https://www.google-analytics.com/analytics.js"></script>
<script async src="path/to/autotrack.custom.js"></script>
```

### Using autotrack with multiple trackers

All autotrack plugins support [multiple trackers](https://developers.google.com/analytics/devguides/collection/analyticsjs/creating-trackers#working_with_multiple_trackers) and work by specifying the tracker name in the `require` command. The following example creates two trackers and requires various autotrack plugins on each.

```js
// Creates two trackers, one named `tracker1` and one named `tracker2`.
ga('create', 'UA-XXXXX-Y', 'auto', 'tracker1');
ga('create', 'UA-XXXXX-Z', 'auto', 'tracker2');

// Requires plugins on tracker1.
ga('tracker1.require', 'eventTracker');
ga('tracker1.require', 'socialWidgetTracker');

// Requires plugins on tracker2.
ga('tracker2.require', 'eventTracker');
ga('tracker2.require', 'outboundLinkTracker');
ga('tracker2.require', 'pageVisibilityTracker');

// Sends the initial pageview for each tracker.
ga('tracker1.send', 'pageview');
ga('tracker2.send', 'pageview');
```

## Browser Support

Autotrack will safely run in any browser without errors, as feature detection is always used with any potentially unsupported code. However, autotrack will only track features supported in the browser running it. For example, a user running Internet Explorer 8 will not be able to track media query usage, as media queries themselves aren't supported in Internet Explorer 8.

All autotrack plugins are tested in the following browsers:

<table>
  <tr>
    <td align="center">
      <img src="https://raw.githubusercontent.com/alrra/browser-logos/39.2.2/src/chrome/chrome_48x48.png" alt="Chrome"><br>
      ✔
    </td>
    <td align="center">
      <img src="https://raw.githubusercontent.com/alrra/browser-logos/39.2.2/src/firefox/firefox_48x48.png" alt="Firefox"><br>
      ✔
    </td>
    <td align="center">
      <img src="https://raw.githubusercontent.com/alrra/browser-logos/39.2.2/src/safari/safari_48x48.png" alt="Safari"><br>
      6+
    </td>
    <td align="center">
      <img src="https://raw.githubusercontent.com/alrra/browser-logos/39.2.2/src/edge/edge_48x48.png" alt="Edge"><br>
      ✔
    </td>
    <td align="center">
      <img src="https://raw.githubusercontent.com/alrra/browser-logos/39.2.2/src/archive/internet-explorer_9-11/internet-explorer_9-11_48x48.png" alt="Internet Explorer"><br>
      9+
    </td>
    <td align="center">
      <img src="https://raw.githubusercontent.com/alrra/browser-logos/39.2.2/src/opera/opera_48x48.png" alt="Opera"><br>
      ✔
    </td>
  </tr>
</table>

## Translations

The following translations have been graciously provided by the community. Please note that these translations are unofficial and may be inaccurate or out of date:

* [Chinese](https://github.com/stevezhuang/autotrack/blob/master/README.zh.md)
* [French](https://github.com/DirtyF/autotrack/tree/french-translation)
* [Japanese](https://github.com/nebosuker/autotrack)
* [Korean](https://github.com/youngilcho/autotrack/tree/korean-translation)
* [Polish](https://github.com/krisu7/autotrack)

If you discover issues with a particular translation, please file them with the appropriate repository. To submit your own translation, follow these steps:

1. Fork this repository.
2. Update the settings of your fork to [allow issues](https://softwareengineering.stackexchange.com/questions/179468/forking-a-repo-on-github-but-allowing-new-issues-on-the-fork).
3. Remove all non-documentation files.
4. Update the documentation files with your translated versions.
5. Submit a pull request to this repository that adds a link to your fork to the above list.
