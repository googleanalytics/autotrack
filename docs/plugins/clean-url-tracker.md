# `cleanUrlTracker`

This guide explains what the `cleanUrlTracker` plugin is and how to integrate it into your `analytics.js` tracking implementation.

## Overview

When viewing your most visited pages in Google Analytics, it's not uncommon to see multiple different URL paths that reference the same page on your site. The following report table is a good example of this and the frustrating situation many users find themselves in today:

<table>
  <tr valign="top">
    <th align="left">Page</th>
    <th align="left">Pageviews</th>
  </tr>
  <tr valign="top">
    <td>/contact</td>
    <td>967</td>
  </tr>
  <tr valign="top">
    <td>/contact/</td>
    <td>431</td>
  </tr>
  <tr valign="top">
    <td>/contact?hl=en</td>
    <td>67</td>
  </tr>
  <tr valign="top">
    <td>/contact/index.html</td>
    <td>32</td>
  </tr>
</table>

To prevent this problem, it's best to settle on a single, canonical URL path for each page you want to track, and only ever send the canonical version to Google Analytics.

The `cleanUrlTracker` plugin helps you do this. It lets you specify a preference for whether or not to include extraneous parts of the URL path, and updates all URLs accordingly.

### How it works

The `cleanUrlPlugin` works by intercepting each hit as it's being sent and modifying the [`page`](https://developers.google.com/analytics/devguides/collection/analyticsjs/field-reference#page) field based on the rules specified by the configuration [options](#options). The plugin also intercepts calls to [`tracker.get()`] that reference the `page` field, so other plugins that use `page` data get the cleaned versions instead of the original versions.

**Note:** while the `cleanUrlTracker` plugin does modify the `page` field value for each hit, it never modifies the [`location`](https://developers.google.com/analytics/devguides/collection/analyticsjs/field-reference#location) field. This allows campaign (e.g. `utm` params) and adwords (e.g. `glclid`) data encoded in the full URL to be preserved.

## Usage

To enable the `cleanUrlTracker` plugin, run the [`require`](https://developers.google.com/analytics/devguides/collection/analyticsjs/using-plugins) command, specify the plugin name `'cleanUrlTracker'`, and pass in the configuration options you want to set:

```js
ga('require', 'cleanUrlTracker', options);
```

## Options

The following table outlines all possible configuration options for the `cleanUrlTracker` plugin. If any of the options has a default value, the default is explicitly stated:

<table>
  <tr valign="top">
    <th align="left">Name</th>
    <th align="left">Type</th>
    <th align="left">Default</th>
  </tr>
  <tr valign="top">
    <td><code>stripQuery</code></td>
    <td><code>boolean</code></td>
    <td>
      When <code>true</code>, the query string portion of the URL will be removed.<br>
      <strong>Default:</strong> <code>false</code>
    </td>
  </tr>
  <tr valign="top">
    <td><code>queryParamsWhitelist</code></td>
    <td><code>Array</code></td>
    <td>
      An array of query params not to strip. This is most commonly used in conjunction with site search, as shown in the <a href=""><code>queryParamsWhitelist</code> example</a> below.
    </td>
  </tr>
  <tr valign="top">
    <td><code>queryDimensionIndex</code></td>
    <td><code>number</code></td>
    <td>
      There are cases where you want to strip the query string from the URL, but you still want to record what query string was originally there, so you can report on those values separately. You can do this by creating a new <a href="https://support.google.com/analytics/answer/2709829">custom dimension</a> in Google Analytics. Set the dimension's <a href="https://support.google.com/analytics/answer/2709828#example-hit">scope</a> to "hit", and then set the index of the newly created dimension as the <code>queryDimensionIndex</code> option. Once set, the stripped query string will be set on the custom dimension at the specified index.
    </td>
  </tr>
  <tr valign="top">
    <td><code>indexFilename</code></td>
    <td><code>string</code></td>
    <td>
      When set, the <code>indexFilename</code> value will be stripped from the end of a URL. If your server supports automatically serving index files, you should set this to whatever value your server uses (usually <code>'index.html'</code>).
    </td>
  </tr>
  <tr valign="top">
    <td><code>trailingSlash</code></td>
    <td><code>string</code></td>
    <td>
      When set to <code>'add'</code>, a trailing slash is appended to the end of all URLs (if not already present). When set to <code>'remove'</code>, a trailing slash is removed from the end of all URLs. No action is taken if any other value is used. Note: when using the <code>indexFilename</code> option, index filenames are stripped prior to the trailing slash being added or removed.
    </td>
  </tr>
  <tr valign="top">
    <td><code>urlFieldsFilter</code></td>
    <td><code>Function</code></td>
    <td>
      <p>A function that is passed a <a href="/docs/common-options.md#fieldsobj"><code>fieldsObj</code></a> (containing the <code>location</code> and <code>page</code> fields and optionally the custom dimension field set via <code>queryDimensionIndex</code>) as its first argument and a <code>parseUrl</code> utility function (which returns a <a href="https://developer.mozilla.org/en-US/docs/Web/API/Location"><code>Location</code></a>-like object) as its second argument.</p>
      <p>The <code>urlFieldsFilter</code> function must return a <code>fieldsObj</code> (either the passed one or a new one), and the returned fields will be sent with all hits. Non-URL fields set on the <code>fieldsObj</code> are ignored.</p>
      <p><strong>Warning:</strong> be careful when modifying the <code>location</code> field as it's used to determine many session-level dimensions in Google Analytics (e.g. utm campaign data, adwords identifiers, hostname, etc.). Unless you need to update the hostname, it's usually better to only modify the <code>page</code> field.</p>
    </td>
  </tr>
</table>

## Methods

The following table lists all methods for the `cleanUrlTracker` plugin:

<table>
  <tr valign="top">
    <th align="left">Name</th>
    <th align="left">Description</th>
  </tr>
  <tr valign="top">
    <td><code>remove</code></td>
    <td>Removes the <code>cleanUrlTracker</code> plugin from the specified tracker and restores all modified tasks to their original state prior to the plugin being required.</td>
  </tr>
</table>

For details on how `analytics.js` plugin methods work and how to invoke them, see [calling plugin methods](https://developers.google.com/analytics/devguides/collection/analyticsjs/using-plugins#calling_plugin_methods) in the `analytics.js` documentation.

## Example

### Basic usage

Given the four URL paths shown in the table at the beginning of this guide, the following `cleanUrlTracker` configuration would ensure that only the URL path `/contact` ever appears in your reports (assumes you've created a custom dimension for the query at index 1):

```js
ga('require', 'cleanUrlTracker', {
  stripQuery: true,
  queryDimensionIndex: 1,
  indexFilename: 'index.html',
  trailingSlash: 'remove'
});
```

And given those four URLs, the following fields would be sent to Google Analytics for each respective hit:

```
[1] {
      "location": "/contact",
      "page": "/contact"
    }

[2] {
      "location": "/contact/",
      "page": "/contact"
    }

[3] {
      "location": "/contact?hl=en",
      "page": "/contact"
      "dimension1": "hl=en"
    }

[4] {
      "location": "/contact/index.html",
      "page": "/contact"
    }
```

### Using the `queryParamsWhitelist` option

Unlike campaign (e.g. `utm` params) and adwords (e.g. `glclid`) data, [Site Search](https://support.google.com/analytics/answer/1012264) data is not inferred by Google Analytics from the `location` field when the `page` field is present, so any site search query params *must not* be stripped from the `page` field.

You can preserve individual query params via the `queryParamsWhitelist` option:

```js
ga('require', 'cleanUrlTracker', {
  stripQuery: true,
  queryParamsWhitelist: ['q'],
});
```

Note that *not* stripping site search params from your URLs means those params will still show up in your page reports. If you don't want this to happen you can update your view's [Site Search setup](https://support.google.com/analytics/answer/1012264) as follows:

1. Specify the same parameter(s) you set in the `queryParamsWhitelist` option.
2. Check the "Strip query parameters out of URL" box.

These options combined will allow you to keep all unwanted query params out of your page reports and still use site search.

### Using the `urlFieldsFilter` option

If the available configuration options are not sufficient for your needs, you can use the `urlFieldsFilter` option to arbirarily modify the URL fields sent to Google Analytics.

The following example passes the same options as the basic example above, but in addition it removes user-specific IDs from the page path, e.g. `/users/18542823` becomes `/users/<user-id>`:

```js
ga('require', 'cleanUrlTracker', {
  stripQuery: true,
  queryDimensionIndex: 1,
  indexFilename: 'index.html',
  trailingSlash: 'remove',
  urlFieldsFilter: function(fieldsObj, parseUrl) {
    fieldsObj.page = parseUrl(fieldsObj.page).pathname
        .replace(/^\/users\/(\d+)/, '/users/<user-id>')

    return fieldsObj;
  },
});
```
