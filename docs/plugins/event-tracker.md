# `eventTracker`

This guide explains what the `eventTracker` plugin is and how to integrate it into your `analytics.js` tracking implementation.

## Overview

Many website development tools and content management systems will give page authors access to modify the HTML templates and page content but not give them access to the site's JavaScript. In such cases, it's very difficult to add event listeners to track user interactions with elements on the page.

The `eventTracker` plugin solves this problem by providing declarative event binding to attributes in the HTML, making it possible to track user interactions with DOM elements without writing any JavaScript.

## Usage

To enable the `eventTracker` plugin, run the [`require`](https://developers.google.com/analytics/devguides/collection/analyticsjs/using-plugins) command, specify the plugin name `'eventTracker'`, and pass in the configuration options (if any) you want to set:

```js
ga('require', 'eventTracker', options);
```

### Modifying the HTML

To add declarative interaction tracking to a DOM element, you start by adding a `ga-on` attribute (assuming the default `'ga-'` attribute prefix) and setting its value to a comma-separated list of DOM events you want to track (note: all events specified in the attribute must also be present in the [`events`](#options) configuration option). When any of the specified events is detected, a hit is sent to Google Analytics with the corresponding attribute values present on the element.

Any valid [analytics.js field](https://developers.google.com/analytics/devguides/collection/analyticsjs/field-reference) can be set declaratively as an attribute. The attribute name can be determined by combining the [`attributePrefix`](#options) option with the [kebab-cased](https://en.wikipedia.org/wiki/Letter_case#Special_case_styles) version of the field name. For example, if you want to set the [`eventCategory`](https://developers.google.com/analytics/devguides/collection/analyticsjs/field-reference#eventCategory) field and you're using the default `attributePrefix` of `'ga-'`, you would use the attribute name `ga-event-category`.

Refer to the [examples](#examples) section to see what the code looks like. For a complete list of possible fields to send, refer to the [field reference](https://developers.google.com/analytics/devguides/collection/analyticsjs/field-reference) in the `analytics.js` documentation.

## Options

The following table outlines all possible configuration options for the `eventTracker` plugin. If any of the options has a default value, the default is explicitly stated:

<table>
  <tr valign="top">
    <th align="left">Name</th>
    <th align="left">Type</th>
    <th align="left">Description</th>
  </tr>
  <tr valign="top">
    <td><code>events</code></td>
    <td><code>Array</code></td>
    <td>
      A list of DOM events to listen for. Note that in order for an event set in the HTML via the <code>*-on</code> attribute to work, it must be listed in this array.<br>
      <strong>Default:</strong> <code>['click']</code>
    </td>
  </tr>
  <tr valign="top">
    <td><code>fieldsObj</code></td>
    <td><code>Object</code></td>
    <td>See the <a href="/docs/common-options.md#fieldsobj">common options guide</a> for the <code>fieldsObj</code> description.</td>
  </tr>
  <tr valign="top">
    <td><code>attributePrefix</code></td>
    <td><code>string</code></td>
    <td>
      See the <a href="/docs/common-options.md#attributeprefix">common options guide</a> for the <code>attributePrefix</code> description.<br>
      <strong>Default:</strong> <code>'ga-'</code>
    </td>
  </tr>
  <tr valign="top">
    <td><code>hitFilter</code></td>
    <td><code>Function</code></td>
    <td>See the <a href="/docs/common-options.md#hitfilter">common options guide</a> for the <code>hitFilter</code> description.</td>
  </tr>
</table>

## Default field values

The `eventTracker` plugin sets the following default field values on all hits it sends. To customize these values, use one of the [options](#options) described above, or set the field value declaratively as an attribute in the HTML.

<table>
  <tr valign="top">
    <th align="left">Field</th>
    <th align="left">Value</th>
  </tr>
  <tr valign="top">
    <td><a href="https://developers.google.com/analytics/devguides/collection/analyticsjs/field-reference#hitType"><code>hitType</code></a></td>
    <td><code>'event'</code></td>
  </tr>
</table>

## Methods

The following table lists all methods for the `eventTracker` plugin:

<table>
  <tr valign="top">
    <th align="left">Name</th>
    <th align="left">Description</th>
  </tr>
  <tr valign="top">
    <td><code>remove</code></td>
    <td>Removes the <code>eventTracker</code> plugin from the specified tracker, removes all event listeners from the DOM, and restores all modified tasks to their original state prior to the plugin being required.</td>
  </tr>
</table>

For details on how `analytics.js` plugin methods work and how to invoke them, see [calling plugin methods](https://developers.google.com/analytics/devguides/collection/analyticsjs/using-plugins#calling_plugin_methods) in the `analytics.js` documentation.

## Examples

### Basic usage

This example shows how to write the markup when not setting any configuration options:

```js
ga('require', 'eventTracker');
```

```html
<button
  ga-on="click"
  ga-event-category="Video"
  ga-event-action="play">
  Play video
</button>
```

### Customizing the `attributePrefix` options

This example customizes the `eventTracker` plugin to use `'data-'` as the attribute prefix rather than the default `ga-`:

```js
ga('require', 'eventTracker', {
  attributePrefix: 'data-'
});
```

The follow HTML will track clicks given the above configuration:

```html
<button
  data-on="click"
  data-event-category="Info Button"
  data-event-action="click">
  Info
</button>
```

### Tracking multiple events on the same element

You can track multiple events on the same DOM element by passing a list of comma-separated event names to the `ga-on` attribute (assuming the default `attributePrefix` option).

A common use case for this is to track multiple click types on link elements. For example, users don't always click on links with their primary mouse button: sometimes they middle-click to open the link in a background tab or right-click to copy the link address and share it.

To track all three of these click types on a single element, specify the `click`, [`auxclick`](https://wicg.github.io/auxclick/), and [`contextmenu`](https://developer.mozilla.org/en-US/docs/Web/Events/contextmenu) events.

```html
<a href="/help"
  ga-on="click,auxclick,contextmenu"
  ga-event-category="Help Link">
  Get Help
</a>
```

The plugin must also know what events to listen for when it's required (by default it only listens to `click` events), so to track these three events you'll have to specify them via the [`events`](#options) option:

```js
ga('require', 'eventTracker', {
  events: ['click', 'auxclick', 'contextmenu']
});
```

And since the `eventTracker` plugin (by default) only sends the fields specified declaratively as attributes on the element, if you want to report on what DOM event triggered the event you send to Google Analytics, you'll have to use the [`hitFilter`](#options) option to inspect the event object itself.

This example sets the [`eventAction`](https://developers.google.com/analytics/devguides/collection/analyticsjs/field-reference#eventAction) field to the value of `event.type` for the current hit.

```js
ga('require', 'eventTracker', {
  events: ['click', 'auxclick', 'contextmenu'],
  hitFilter: function(model, element, event) {
    model.set('eventAction', event.type, true);
  }
});
```

### Tracking non-event hit types

The default `hitType` for all hits sent by the `eventTracker` plugin is `'event'`, but this can be customized either with the [`fieldsObj`](#options) or [`hitFilter`](#options) options, or setting the `ga-hit-type` attribute on the element itself (assuming the default `ga-` attribute prefix).

For example, to send a [social interaction hit](https://developers.google.com/analytics/devguides/collection/analyticsjs/social-interactions) instead of an event, you could use the following HTML:

```html
<button
  ga-on="click"
  ga-hit-type="social"
  ga-social-network="Facebook"
  ga-social-action="like">
  Like us on Facebook
</button>
```
