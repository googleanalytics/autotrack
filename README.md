Autotrack
=========

Autotrack is an [analytics.js](https://developers.google.com/analytics/devguides/collection/analyticsjs/) plugin that bundles a set of sub-plugins, each responsible for tracking a set of user interactions common to most websites and applications.

[![Sauce Test Status](https://saucelabs.com/browser-matrix/autotrack.svg)](https://saucelabs.com/u/autotrack)

Autotrack includes the following sub-plugins:

- `eventTracker`: Declarative event tracking
- `mediaQueryTracker`: Media query and breakpoint tracking
- `outboundFormTracker`: Automatic outbound form tracking
- `outboundLinkTracker`: Automatic outbound link tracking
- `sessionDurationTracker`: Enhanced session duration tracking
- `socialTracker`: Automatic and enhanced declarative social tracking
- `urlChangeTracker`: Automatic URL change tracking for single page applications

## Usage

The simplest way to get started using autotrack...

### Configuration options

The following options can be passed to the `autotrack` plugin or individual sub-plugins:

#### `attributePrefix`

**Type**: `string`

**Default**: `'data-'`

The attribute prefix for declarative event and social tracking. The value used after the prefix is kebab-case version of the field name, for example: the field `eventCategory` with the prefix `'data-ga-'` would be `data-ga-event-category`.

#### `mediaQueryDefinitions`

**Type**: `Object|Array|null`

**Default**: `null`

A media query definitions object or a list of media query definition objects.

A media query definitions object contains the following properties:

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
      {name: '1x', media: 'all'},
      {name: '1.5x', media: '(-webkit-min-device-pixel-ratio: 1.5), ' +
                            '(min-resolution: 144dpi)'},
      {name: '2x', media: '(-webkit-min-device-pixel-ratio: 2), ' +
                          '(min-resolution: 192dpi)'},
    ]
  },
  {
    name: 'Orientation',
    dimensionIndex: 3,
    items: [
      {name: 'landscape', media: 'handheld and (orientation: landscape)'},
      {name: 'portrait', media: '(orientation: portrait)'}
    ]
  }
]
```

#### `mediaQueryChangeTemplate`

**Type**: `Function`

**Default**:

```js
function(newValue, oldValue) {
  return oldValue + ' => ' + newValue;
}
```

A function used to format the `eventLabel` of media query change events. For example, if the matched media changes for the named media query `lg` to `md`, by default the result will be `lg => md`.

#### `mediaQueryChangeTimeout`

**Type**: `number`

**Default**: `1000`

The debounce timeout, i.e., the amount of time to wait before sending the change hit. If multiple change events occur within the timeout period, only the last one is sent.
