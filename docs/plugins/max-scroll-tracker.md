# `maxScrollTracker`

This guide explains what the `maxScrollTracker` plugin is and how to integrate it into your `analytics.js` tracking implementation.

## Overview

For each page on your site, the `maxScrollTracker` plugin tracks how far down the page a user has scrolled, as a percentage of the total scrollable height of the page. For example, if a user scrolls all the way to the bottom of the page, the max scroll percentage tracked is 100%. If they only scroll a third of the way down, 33% is tracked, etc.

The max scroll percentage amounts are calculated on a per-session basis, which means that once a user has scrolled to 100% for a particular page, tracking for that page stops and will only resume when a new session starts.

The following example reports show how you can use the `maxScrollTracker` plugin to more accurately measure user engagement with your content:

**Top pages by scroll depth:**

![max-scroll-page](https://cloud.githubusercontent.com/assets/326742/22574480/e630a590-e963-11e6-9c3d-a201d44aa177.png)

**Traffic origins (source/medium) resulting in the highest scroll engagement:**

![max-scroll-source-medium](https://cloud.githubusercontent.com/assets/326742/22574481/e634ef24-e963-11e6-8017-5f6df1d6c55c.png)

### How it works

The `maxScrollTracker` plugin listens for [`scroll`](https://developer.mozilla.org/en-US/docs/Web/Events/scroll) events on the current page. Once the user starts to scroll, the plugin waits until the user stops scrolling for at least one second (to ensure it doesn't affect scroll performance) and then calculates the percentage the user has scrolled. This value is then compared to the previously calculated value (if one exists), and if there's an increase, an event is sent to Google Analytics with the event value set to the increased amount (and optionally a custom metric) and the event label set to the current scroll percentage.

Tracking the scroll depth as a metric allows you can do calculations and report on things like *Avg. Max Scroll Percentage* along with any dimension (e.g. *Campaign Source*, *Referrer*, *Device Category*, etc.), not just page-level dimensions.

**Important:** the `maxScrollTracker` plugin works best on pages whose height doesn't change once the page has loaded. It is not recommended to use `maxScrollTracker` on pages that use techniques like infinite scroll.

## Usage

To enable the `maxScrollTracker` plugin, run the [`require`](https://developers.google.com/analytics/devguides/collection/analyticsjs/using-plugins) command, specify the plugin name `'maxScrollTracker'`, and pass in any configuration options (if any) you wish to set:

```js
ga('require', 'maxScrollTracker', options);
```

### Using a custom metric

The easiest way to track max scroll percentage is to create a [custom metric](https://support.google.com/analytics/answer/2709828) called *Max Scroll Percentage* that you set in your plugin configuration options, and then to create a [calculated metric](https://support.google.com/analytics/answer/6121409) *Avg. Max Scroll Percentage* that you use in your reports.

Since the max scroll tracker plugin only reports a single max scroll percentage per unique page path per session, you can calculate the average max scroll percentage for any dimension by dividing the value of your *Max Scroll Percentage* custom metric by the *Unique Pageviews* metrics. Here's what the formula looks like:

```
{{Max Scroll Percentage}} / ( 100 * {{Unique Pageviews}} )
```

The screenshot in the [overview](#overview) shows some examples of what reports with these custom and calculated metrics look like.

## Options

The following table outlines all possible configuration options for the `maxScrollTracker` plugin. If any of the options has a default value, the default is explicitly stated:

<table>
  <tr valign="top">
    <th align="left">Name</th>
    <th align="left">Type</th>
    <th align="left">Description</th>
  </tr>
  <tr valign="top">
    <td><code>increaseThreshold</code></td>
    <td><code>number</code></td>
    <td>
      The minimum increase in max scroll percentage that must occur before an event is sent. For example, if the current, stored max scroll percentage for a particular page is <code>45</code> and the <code>increaseThreshold</code> is <code>10</code>, no max scroll increase events will be sent until the user scrolls to at least 55% down the current page.
      .<br>
      <strong>Default:</strong> <code>20</code>
  </td>
  <tr valign="top">
    <td><code>sessionTimeout</code></td>
    <td><code>number</code></td>
    <td>
      The <a href="https://support.google.com/analytics/answer/2795871">session timeout</a> amount (in minutes) of the Google Analytics property. By default this value is 30 minutes, which is the same default used for new Google Analytics properties. The value set for this plugin should always be the same as the property setting in Google Analytics.<br>
      <strong>Default:</strong> <code>30</code>
    </td>
  </tr>
  <tr valign="top">
    <td><code>timeZone</code></td>
    <td><code>string</code></td>
    <td>
      A time zone to pass to the <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat"><code>Int.DateTimeFormat</code></a> instance. Since sessions in Google Analytics are limited to a single date in the time zone of the view, this setting can be used to more accurately predict session boundaries. (Note: if your property contains views in several different time zones, do not use this setting).
    </td>
  </tr>
  <tr valign="top">
    <td><code>maxScrollMetricIndex</code></td>
    <td><code>number</code></td>
    <td>If set, a <a href="https://support.google.com/analytics/answer/2709828">custom metric</a> at the index provided is sent with all increase events. The metric value is set to the same value as the event value (the max scroll percentage increase amount).</td>
  </tr>
  <tr valign="top">
    <td><code>fieldsObj</code></td>
    <td><code>Object</code></td>
    <td>See the <a href="/docs/common-options.md#fieldsobj">common options guide</a> for the <code>fieldsObj</code> description.</td>
  </tr>
  <tr valign="top">
    <td><code>hitFilter</code></td>
    <td><code>Function</code></td>
    <td>See the <a href="/docs/common-options.md#hitfilter">common options guide</a> for the <code>hitFilter</code> description.</td>
  </tr>
</table>

## Default field values

The `maxScrollTracker` plugin sets the following default field values on event hits it sends. To customize these values, use one of the [options](#options) described above.

<table>
  <tr valign="top">
    <th align="left">Field</th>
    <th align="left">Value</th>
  </tr>
  <tr valign="top">
    <td><a href="https://developers.google.com/analytics/devguides/collection/analyticsjs/field-reference#hitType"><code>hitType</code></a></td>
    <td><code>'event'</code></td>
  </tr>
  <tr valign="top">
    <td><a href="https://developers.google.com/analytics/devguides/collection/analyticsjs/field-reference#eventCategory"><code>eventCategory</code></a></td>
    <td><code>'Max Scroll'</code></td>
  </tr>
  <tr valign="top">
    <td><a href="https://developers.google.com/analytics/devguides/collection/analyticsjs/field-reference#eventAction"><code>eventAction</code></a></td>
    <td><code>'increase'</code></td>
  </tr>
  <tr valign="top">
    <td><a href="https://developers.google.com/analytics/devguides/collection/analyticsjs/field-reference#eventLabel"><code>eventLabel</code></a></td>
    <td><code>scrollPercentage</code></td>
  </tr>
  <tr valign="top">
    <td><a href="https://developers.google.com/analytics/devguides/collection/analyticsjs/field-reference#eventValue"><code>eventValue</code></a></td>
    <td><code>increaseAmount</code></td>
  </tr>
  <tr valign="top">
    <td><a href="https://developers.google.com/analytics/devguides/collection/analyticsjs/field-reference#nonInteraction"><code>nonInteraction</code></a></td>
    <td><code>true</code></td>
  </tr>
</table>

**Note:** the reference to `increaseAmount` refers to the amount the max scroll percentage has increased since the previous event. The reference to `scrollPercentage` refers to the current scroll percentage for the page.

## Methods

The following table lists all methods for the `maxScrollTracker` plugin:

<table>
  <tr valign="top">
    <th align="left">Name</th>
    <th align="left">Description</th>
  </tr>
  <tr valign="top">
    <td><code>remove</code></td>
    <td>Removes the <code>maxScrollTracker</code> plugin from the specified tracker, removes all event listeners from the DOM, and restores all modified tasks to their original state prior to the plugin being required.</td>
  </tr>
</table>

For details on how `analytics.js` plugin methods work and how to invoke them, see [calling plugin methods](https://developers.google.com/analytics/devguides/collection/analyticsjs/using-plugins#calling_plugin_methods) in the `analytics.js` documentation.

## Examples

### Setting a session timeout and time zone

If you've set the default session timeout in your Google Analytics property to 4 hours and the timezone of all your views to Pacific Time, you can ensure the `maxScrollTracker` plugin knows about these settings with the following configuration options:

```js
ga('require', 'maxScrollTracker', {
  sessionTimeout: 4 * 60,
  timeZone: 'America/Los_Angeles',
});
```

### Making scroll events interactive beyond 50%

By default, all events sent by this plugin are [non-interaction events](https://support.google.com/analytics/answer/1033068#NonInteractionEvents), which means they won't affect your bounce rate. However, in some cases you may want to consider scrolling beyond a specific point an engagement and not a bounce.

This example shows how to use the [`hitFilter`](#options) option to send max scroll events as interactive once the user has scrolled more than 50%.

```js
ga('require', 'maxScrollTracker', {
  hitFilter: function(model) {
    var scrollPercentage = model.get('eventLabel');
    if (scrollPercentage > 50) {
      // Sets the nonInteractive field to `true` for the current hit.
      model.set('nonInteraction', true, true);
    }
  },
});
```

### Setting a custom metric

If you want to create a [calculated metric](https://support.google.com/analytics/answer/6121409) to more easily report on max scroll events, you'll need to also create a [custom metric](https://support.google.com/analytics/answer/2709828) and set the index of that custom metric when requiring the `maxScrollTracker` plugin:

```js
ga('require', 'maxScrollTracker', {
  maxScrollMetricIndex: 1,
});
```

**Note:** this requires [creating a custom metric](https://support.google.com/analytics/answer/2709829) in your Google Analytics property settings and [creating a calculated metric](https://support.google.com/analytics/answer/6121409?ref_topic=2709827#creating-calculated-metrics) in your Google Analytics view settings.
