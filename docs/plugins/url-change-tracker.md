# `urlChangeTracker`

This guide explains what the `urlChangeTracker` plugin is and how to integrate it into your `analytics.js` tracking implementation.

## Overview

The `urlChangeTracker` plugin detects changes to the URL via the [History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API) and automatically updates the tracker and sends additional pageviews. This allows [single page applications](https://en.wikipedia.org/wiki/Single-page_application) to be tracked like traditional sites without any extra configuration.

**Note:** this plugin does not support tracking hash changes as most Google Analytics implementations do not capture the hash portion of the URL when tracking pageviews. Also, developers of single page applications should make sure their framework isn't already tracking URL changes to avoid collecting duplicate data.

## Usage

To enable the `urlChangeTracker` plugin, run the [`require`](https://developers.google.com/analytics/devguides/collection/analyticsjs/using-plugins) command, specify the plugin name `'urlChangeTracker'`, and pass in the configuration options you want to set:

```js
ga('require', 'urlChangeTracker', options);
```

## Options

The following tables outlines all possible configuration options for the `urlChangeTracker` plugin. If any of the options has a default value, the default is explicitly stated:

<table>
  <tr valign="top">
    <th align="left">Name</th>
    <th align="left">Type</th>
    <th align="left">Description</th>
  </tr>
  <tr valign="top">
    <td><code>shouldTrackUrlChange</code></a></td>
    <td><code>Function</code></a></td>
    <td>
      A function used to determine if a URL change should be tracked. The function is invoked with the string values `newPath` and `oldPath` which represent the pathname and search portion of the URL (not the hash portion). Note, the function is only invoked if both a new and old path are differ from each other.<br>
      <strong>Default:</strong>
<pre>function shouldTrackUrlChange(newPath, oldPath) {
  return newPath &amp;&amp;
};</pre>
    </td>
  <tr valign="top">
    <td><code>fieldsObj</code></a></td>
    <td><code>Object</code></a></td>
    <td>See the <a href="/googleanalytics/autotrack/blob/master/docs/common-options.md#fieldsobj">common options guide</a> for <code>fieldsObj</code> description.</td>
  </tr>
  <tr valign="top">
    <td><code>hitFilter</code></a></td>
    <td><code>Function</code></a></td>
    <td>See the <a href="/googleanalytics/autotrack/blob/master/docs/common-options.md#hitfilter">common options guide</a> for <code>hitFilter</code> description.</td>
  </tr>
</table>

## Default field values

The `urlChangeTracker` plugin sets the following default field values on all hits it sends. To customize these values, use one of the [options](#options) described above.

<table>
  <tr valign="top">
    <th align="left">Field</th>
    <th align="left">Value</th>
  </tr>
  <tr valign="top">
    <td><a href="https://developers.google.com/analytics/devguides/collection/analyticsjs/field-reference#hitType"><code>hitType</code></a></td>
    <td><code>'pageview'</code></td>
  </tr>
  <tr valign="top">
    <td><a href="https://developers.google.com/analytics/devguides/collection/analyticsjs/field-reference#page"><code>page</code></a></td>
    <td><code>newPath</code></a></td>
  </tr>
  <tr valign="top">
    <td><a href="https://developers.google.com/analytics/devguides/collection/analyticsjs/field-reference#title"><code>title</code></a></td>
    <td><code>document.title</code></a></td>
  </tr>
</table>

Note: the reference to `newPath` in the table above refers to the same value passed to the [`shouldTrackUrlChange`](#options) function in the configuration options.

## Example

### Basic usage

In most cases, this plugin needs no customization, and should work with all modern web frameworks:

```js
ga('require', 'urlChangeTracker');
```

### Customizing what is considered a URL change

This code updates the `shouldTrackUrlChange` configuration option to not track path changes that only modify the query string portion of the URL:

```js
ga('require', 'urlChangeTracker', {
  shouldTrackUrlChange: function(newPath, oldPath) {
    // Strips the query string from the path values.
    newPath = newPath.split('?')[0];
    oldPath = oldPath.split('?')[0];

    return newPath != oldPath;
  }
});
```

### Differentiating between virtual pageviews and the initial pageview

If you want to be able to report on pageviews sent by the `urlChangeTracker` separately from pageviews sent in the initial pageload, you can use a [custom dimension](https://support.google.com/analytics/answer/2709828) to add additional metadata to the pageview hit.

The following code uses the `fieldsObj` option to set a custom dimension at index 1 for all pageview hits sent by the `urlChangeTracker` plugin:

```js
ga('require', 'urlChangeTracker', {
  fieldsObj: {
    dimension1: 'virtual pageview'
  }
});
```
