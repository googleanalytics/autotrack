# Autotrack [![Build Status](https://travis-ci.org/googleanalytics/autotrack.svg?branch=master)](https://travis-ci.org/googleanalytics/autotrack)

- [概览](#概览)
- [用法](#用法)
  - [设置配置选项](#设置配置选项)
  - [通过npm加载autotrack](#通过npm加载autotrack)
  - [使用独立插件](#使用独立插件)
- [插件](#插件)
- [配置选项](#配置选项)
- [高级用法](#高级用法)
  - [自定义创建](#自定义创建)
  - [autotrack多个跟踪器使用](#autotrack多个跟踪器使用)
- [浏览器支持](#浏览器支持)
- [翻译](#翻译)

## 概览

默认的谷歌分析的[Javascript跟踪代码](https://developers.google.com/analytics/devguides/collection/analyticsjs/)的运行方式是一旦网页加载的时候就发送一个pageview给谷歌分析。但如果你想跟踪的不仅仅页面浏览（比如： 事件，社交互动行为），你还需要布置一些其他的代码来获取更多的信息。

由于大部分站长关心的用户交互行为的类型都是大同小异，这使得针对新网站（页面）的跟踪有时候就需要遇到一遍又一遍写重复代码的工作。

Autotrack就是为了来解决这个问题的。它除了提供了大部分人所关心的网站行为的标准跟踪以外，还有提供了一些方便跟踪的功能（比如：事件跟踪声明）使得更加容易地理解和分析用户是如何使用你的网站的。

这个`autotrack.js`文件很小（压缩后才3KB），包含了下面列举的插件。所有的插件不仅可以一起使用，还可以单独被调用和配置：

<table>
  <tr>
    <th align="left">插件</th>
    <th align="left">说明</th>
  </tr>
  <tr>
    <td><a href="#eventtracker"><code>eventTracker</code></a></td>
    <td>事件跟踪声明</td>
  </tr>
  <tr>
    <td><a href="#mediaquerytracker"><code>mediaQueryTracker</code></a></td>
    <td>媒体查询和自适应点跟踪</td>
  </tr>
  <tr>
    <td><a href="#outboundformtracker"><code>outboundFormTracker</code></a></td>
    <td>导出表单自动跟踪</td>
  </tr>
  <tr>
    <td><a href="#outboundlinktracker"><code>outboundLinkTracker</code></a></td>
    <td>导出链接自动跟踪</td>
  </tr>
  <tr>
    <td><a href="#socialtracker"><code>socialTracker</code></a></td>
    <td>自动以及加强的社交跟踪声明</td>
  </tr>
  <tr>
    <td><a href="#urlchangetracker"><code>urlChangeTracker</code></a></td>
    <td>单页面应用URL变化的自动跟踪</td>
  </tr>
</table>

**免责声明:** 目前autotrack是由谷歌分析开发的相关部门在维护，主要为开发者服务。这并不是一个谷歌分析官方的产品同时也不具备有谷歌分析企业版的支持。用这个组件的开发者需要负责和确保他们的代码部署可以满足[谷歌分析服务条款](https://www.google.com/analytics/terms/us.html)以及他们所在国家的相应法律义务。

## 用法

添加autotrack到你的网站上，必须先做两件事情：

1. 加载`autotrack.js`脚本文件在你的网页里面。
2. 更新[跟踪代码](https://developers.google.com/analytics/devguides/collection/analyticsjs/tracking-snippet-reference)来[引入](https://developers.google.com/analytics/devguides/collection/analyticsjs/using-plugins) 这个 `autotrack`插件。

如果您的网站已经包含标准的JavaScript跟踪代码，你可以用下面的代码进行替换它（注意添加`require`命令和调用`autotrack.js`这个脚本文件）：

```html
<script>
window.ga=window.ga||function(){(ga.q=ga.q||[]).push(arguments)};ga.l=+new Date;
ga('create', 'UA-XXXXX-Y', 'auto');
ga('require', 'autotrack');
ga('send', 'pageview');
</script>
<script async src='https://www.google-analytics.com/analytics.js'></script>
<script async src='path/to/autotrack.js'></script>
```

这个[analytics.js插件系统](https://developers.google.com/analytics/devguides/collection/analyticsjs/using-plugins)的设计目的就是为了支持异步加载脚本，所以`autotrack.js`和`analytics.js`的加载顺序在前在后是没有影响的。而且`autotrack.js`库单独或者和剩下的JavaScript代码绑在一起加载也是没有影响。

### 设置配置选项

标准的autotrack可以通过[配置选项](#configuration-options)进行自定义。你可以对autotrack设置配置选项，通过调用`require`命令使用第三个可选的参数。

比如，您可以重新对[`attributePrefix`](#attributeprefix)的默认值修改，参考下面方式：

```js
ga('require', 'autotrack', {
  attributePrefix: 'data-ga-'
});
```

### 通过npm加载autotrack

如果你使用npm和模块加载器比如[Browserify](http://browserify.org/), [Webpack](https://webpack.github.io/), 或者[SystemJS](https://github.com/systemjs/systemjs)，你就可以像引入其他的npm模块调用一样将autotrack引入到你的构建（build)中去:

```sh
npm install autotrack
```

```js
// 在你的JavaScript代码中
require('autotrack');
```

请注意上面的代码将会引入autotrack的插件到生成好的JavaScript文件里面，但不代表它们就已经将插件注入到`analytics.js`跟踪器对象。仍然有必要添加`require`命令到跟踪代码里面：

```js
// 在analytics.js跟踪代码中
ga('create', 'UA-XXXXX-Y', 'auto');
ga('require', 'autotrack');
ga('send', 'pageview');
```

### 使用独立插件

这个`autotrack.js`文件里面包含了所有下面准备介绍的插件，但有时候你可能只需要用到其中的一个或几个，并不完全需要一起调用它们。

当你需要引入`autotrack`插件，对每一个插件`require`命令 并且传递一个配置对象复本（如果有的话）。如果仅选择一些插件来使用，你可以独立引入它们而不需要引入整个`autotrack`插件。

举个例子：只需要`eventTracker` 和 `outboundLinkTracker`这两个插件，你就只需编辑好下面的代码片段：

```js
ga('create', 'UA-XXXXX-Y', 'auto');
ga('require', 'eventTracker');
ga('require', 'outboundLinkTracker');
ga('send', 'pageview');
```

单独的插件也可以接受配置选项。不相关的选项传到一个特定插件里面都会被忽略。当需要独立插件的时候使用配置选项，最简单的方法就是传递每一个插件到用一个对象里去。

```js
var opts = { /* 配置选项 */ };

ga('require', 'eventTracker', opts);
ga('require', 'outboundLinkTracker', opts);
```

当仅只要指定的插件引入时，需要认识到`autotrack.js`的源代码文件包含所有插件的代码。若要创建一个自定义版本仅包含指定的插件，参看下面的[自定义创建](#custom-builds) 。

## 插件

### `eventTracker`

这个`eventTracker`插件可以添加事件跟踪声明到点击事件的属性`data-event-category`和`data-event-action` 中。`data-event-label`和`data-event-value`这样的属性也是支持的（属性名字可以自定义）。

#### 选项

* [`attributePrefix`](#attributeprefix)

#### 例子

下面这样的按钮如果点击后将会通过发送一个类别是"video"和动作是"play"的事件触发传递给谷歌分析：

```html
<button data-event-category="video" data-event-action="play">Play</button>
```

### `mediaQueryTracker`

这个`mediaQueryTracker`插件可以让你跟踪当前的媒体查询状态和媒体查询改变的使用情况。

你可以告诉`mediaQueryTracker`媒体查询的数据然后通过这个[`mediaQueryDefinitions`](#mediaquerydefinitions)配置选项来找到。

**重点：不像其他的autotrack插件，用`mediaQueryTracker`插件你必须在你的谷歌分析里面的property设置里做一些调整。这里是需要做的步骤：**

1. 登陆到谷歌分析, 选择对应的 [account and property](https://support.google.com/analytics/answer/1009618) , 并且 [创建一个自定义维度](https://support.google.com/analytics/answer/2709829) 每一组的你想跟踪的媒体查询 (比如断点，分辨率/ DPI ，设备方向)
2. 给每一个维度命名 (比如断点), 选择这个范围 [hit](https://support.google.com/analytics/answer/2709828#example-hit), 并且确保选择"active"这一项。
3. 在 [`mediaQueryDefinitions`](#mediaquerydefinitions) 配置对象中, 将`name` 和 `dimensionIndex`的值设置成展示在谷歌分析里面的名字和索引.

参考[`mediaQueryDefinitions`](#mediaquerydefinitions)配置选项文档里的一个例子关于断点，设备分辨率和设备方向数据的定义介绍。

#### 选项

* [`mediaQueryDefinitions`](#mediaquerydefinitions)

### `outboundFormTracker`

这个`outboundFormTracker`插件可以在当表单提交到不同域名的站点时自动检测并发送一次事件点击。这个事件类别叫做"Outbound Form"，这个事件行为叫做"submit"，这个事件的标签值就是这个表单`action`中的属性。

默认情况下，如果它的action路径不是一相对路径并且不含有当前`location.hostname`的这个值，表单提交都会被算作是导出站点的。注意，这意味指向更高级别的不同子域名（默认情况）依旧会被考虑成导出站点的行为。这个逻辑可以在[`shouldTrackOutboundForm`](#shouldtrackoutboundform)这个配置选项里面做修改。

#### 选项

* [`shouldTrackOutboundForm`](#shouldtrackoutboundform)

### `outboundLinkTracker`

这个`outboundLinkTracker`插件自动检测导出链接点击（链接中`href`属性指向不同域名的站点），并发送一次事件点击。这个事件类别叫做"Outbound Link"，这个事件行为叫做"click"，这个事件的标签值就是这个链接`href`中的属性值。

默认情况下，如果链接的`hostname`属性值不等于`location.hostname`这个值的话，链接点击都会被算作是导出站点的。注意，这意味指向更高级别的不同子域名（默认情况）依旧会被考虑成导出站点的行为。这个逻辑可以在[`shouldTrackOutboundLink`](#shouldtrackoutboundlink)这个配置选项里面做修改。

#### 选项

* [`shouldTrackOutboundLink`](#shouldtrackoutboundlink)

### `socialTracker`

这个`socialTracker`的插件针对点击事件自动添加了社交互动申明，元素包括`data-social-network`，`data-social-action`和 `data-social-target`，类似`eventTracking`插件的用法。

它还可以自定添加社交跟踪到官方Twitter的发微博/加粉（tweet/follow）按钮和Facebook的喜爱（like）按钮。换句话说，只要你将Twitter或者Facebook官方的按钮放在你的网页上，同时你使用了autotrack (设置只需要 `socialTracker`插件即可)，用户对这些按钮的点击互动行为都会被自定跟踪到。

下面的表格被列举了可以跟踪的社交域值（social fields）：

<table>
  <tr>
    <th align="left">小部件</th>
    <th align="left">社交网络</th>
    <th align="left">社交行为</th>
    <th align="left">社交目标</th>
  </tr>
  <tr>
    <td>Like button</td>
    <td><code>Facebook</code></td>
    <td><code>like</code> or <code>unlike</code></td>
    <td>当前页面的URL。</td>
  </tr>
  <tr>
    <td>Tweet button</td>
    <td><code>Twitter</code></td>
    <td><code>tweet</code></td>
    <td>这个小部件<code>data-url</code>属性或者当前页面的URL。</td>
  </tr>
  <tr>
    <td>Follow button</td>
    <td><code>Twitter</code></td>
    <td><code>follow</code></td>
    <td>这个小部件<code>data-screen-name</code>的属性。</td>
  </tr>
</table>

### `urlChangeTracker`

这个`urlChangeTracker`插件通过[History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API)来自定检测URL的变化，同时自动更新跟踪器上并发送额外的页面浏览。这允许[单页面应用](https://en.wikipedia.org/wiki/Single-page_application)可以像传统的站点不需要额外的配置也能被跟踪到。

注意：这个插件不支持跟踪哈希改变，这是由于在跟踪页面浏览（pageviews）时候大部分谷歌分析部署都不能捕获到URL的哈希部分。同时，单页面应用的开发者需要确认他们的框架还没跟踪到URL的改变以此来避免重复数据收集。

#### 选项

* [`shouldTrackUrlChange`](#shouldtrackurlchange)


## 配置选项

下面的选项配置可以传值到`autotrack`插件里面或者独立的插件里面：

### `attributePrefix`

**类型**: `string`

**默认值**: `'data-'`

这个属性前缀是给事件声明和社交跟踪使用的。在前缀后面的这个值就会像串一样将名字串起来，比如：这个`eventCategory`加上前缀`'data-ga-'`后就会变成`data-ga-event-category`。

### `mediaQueryDefinitions`

**类型**: `Object|Array|null`

**默认值**: `null`

这里定义一个媒体查询对象或者一组媒体查询对象。一个媒体查询对象包含下面的几个属性：

  - `name`: 媒体查询改变事件下的唯一命名，将会使用`eventCategory`这个值。
  - `dimensionIndex`: [创建在谷歌分析](https://support.google.com/analytics/answer/2709829)里面自定义维度的索引值。
  - `items`: 一个包含了下面属性的数组对象：
    - `name`: 将设置在自定义维度的值。
    - `media`: 媒体查询匹配到的值。

下面的这个数组例子解释了三个媒体查询对象是如何定义的：

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

如果有多个`media`值同时匹配，后来在`items`数组指定的那个值将会优先考虑。例如，在上面的“断点”例子中，`sm`项会被设置成`all`，所以它总是会匹配上除非`md`或者`lg`匹配。

### `mediaQueryChangeTemplate`

**类型**: `Function`

**默认值**:

```js
function(newValue, oldValue) {
  return oldValue + ' => ' + newValue;
}
```

这个函数用来定义媒体查询改变事件的`eventLabel`格式。例如，如果匹配上的媒体从`lg`变成`md`，默认的记过就会是`lg => md`。

### `mediaQueryChangeTimeout`

**类型**: `number`

**默认值**: `1000`

抖动超时，即在发送改变之前的等待时间数。如果有多个事件改变发生在超时时间内，只有最后一个事件被发送。

### `shouldTrackOutboundForm`

**类型**: `Function`

**默认值**:

```js
function(form) {
  var action = form.getAttribute('action');
  return action &&
      action.indexOf('http') === 0 &&
      action.indexOf(location.hostname) < 0;
};
```

这个函数用来判断一个表单提交是否应该被认为”导出表单”。这个函数调用了 `<form>`标签元素作为其唯一的参数，如果返回真的话，这个表单提交就会被记录上。

这个`shouldTrackOutboundForm`选项将会认为从`blog.example.com`到`store.example.com`的表单提交行为是一个导出表单提交行为。若想要改变这个逻辑，排除表单指向任何这样`*.example.com`的子域名的情况，你可以按照下面的方法来重写跟踪代码：

```js
ga('require', 'autotrack', {
  shouldTrackOutboundForm: function(form) {
    var action = form.getAttribute('action');
    // Checks that the action is set and starts with "http" to exclude relative
    // paths, then checks that it does not contain the string "example.com".
    return action &&
        action.indexOf('http') === 0 &&
        action.indexOf('example.com') < 0;
  }
}
```

### `shouldTrackOutboundLink`

**类型**: `Function`

**默认值**:

```js
function(link) {
  return link.hostname != location.hostname &&
      link.protocol.indexOf('http') === 0;
};
```

这个函数用来判断一个链接点击是否应该被认为”导出链接”。这个函数调用了 `<a>`标签元素作为其唯一的参数，如果返回真的话，这个链接点击就会被记录上。

这个`shouldTrackOutboundLink`选项将会认为从`blog.example.com`到`store.example.com`的链接点击行为是一个导出链接行为。若想要改变这个逻辑，排除链接指向任何这样`*.example.com`的子域名的情况，你可以按照下面的方法来重写跟踪代码：

```js
ga('require', 'autotrack', {
  shouldTrackOutboundLink: function(link) {
    // Checks that the link's hostname does not contain "example.com".
    return link.hostname.indexOf('example.com') < 0 &&
        link.protocol.indexOf('http') === 0;
  }
}
```

这个`shouldTrackOutboundLink`设置仅仅可以检测到具有`http:`或者`https:`协议的链接。如果你还想把`tel:`或者`mailto:`这样协议也作为导出链接的话，跟踪这样的链接你是可以移除这个规定的。

### `shouldTrackUrlChange`

**类型**: `Function`

**默认值**:

```js
function(newPath, oldPath) {
  return newPath && oldPath;
}
```

这个函数用来检测URL的改变跟踪情况。一般的话，所有的变化除了哈希变化都会被捕捉进来。

这个函数被调用的字符串值`newPath`和`oldPath`代表的是路径名称和URL的搜索部分（而不是哈希部分）。

## 高级用法

### 自定义创建

这个autotrack库是模块化创立的，每一个插件都包含了它们自己的依赖，所以你可以创建一个自定义库，使用脚本打包的方式比如[Browserify](http://browserify.org/)。

下面这个例子展示如何创建一个只包含了`eventTracker`和`outboundLinkTracker`插件的build：

```sh
browserify lib/plugins/event-tracker lib/plugins/outbound-link-tracker
```

当进行自定义构建的时候，一定保证更新跟踪代码保证只需要引入插件包含在你的构建中。引入一个没有在创建里面的插件将会防止运行后续`analytics.js`的命令。

如果你已经正在使用模块加载器像[Browserify](http://browserify.org/), [Webpack](https://webpack.github.io/), 或者 [SystemJS](https://github.com/systemjs/systemjs)来建立你的JavaScript，你可以跳过上面的步骤然后只要直接在你的代码文件里面引入你想要的插件:

```js
// 在你的JavaScript代码中
require('autotrack/lib/plugins/event-tracker');
require('autotrack/lib/plugins/outbound-link-tracker');
```

查看[autotrack源代码](https://github.com/philipwalton/autotrack/blob/master/lib/plugins/autotrack.js)来更好理解它的工作原理。

### autotrack多个跟踪器使用

所有的autotrack的插件都支持多个跟踪器的使用，只要通过对`require`命令分别指定跟踪器的名称即可。下面的例子介绍了两个不同的跟踪器但却同时引入`autotrack` 的情况。

```js
ga('create', 'UA-XXXXX-Y', 'auto', 'tracker1');
ga('create', 'UA-XXXXX-Z', 'auto', 'tracker2');
ga('tracker1.require', 'autotrack');
ga('tracker2.require', 'autotrack');
ga('tracker1.send', 'pageview');
ga('tracker2.send', 'pageview');
```

## 浏览器支持

Autotrack在任何浏览器可以没有错误安全地运行，因为特征检测总是与任何潜在不支持的代码一起使用。然而，autotrack将只在跟踪功能支持的浏览器运行。例如，当某个用户使用IE8浏览器时候，媒体查询不会被跟踪到，原因是媒体查询本身就不能支持IE8浏览器。

所有的autotrack插件运行在下面所罗列的浏览器的测试验证结果可以参看[Sauce Labs](https://saucelabs.com/u/autotrack)：

<table>
  <tr>
    <td align="center">
      <img src="https://raw.github.com/alrra/browser-logos/master/chrome/chrome_48x48.png" alt="Chrome"><br>
      ✔
    </td>
    <td align="center">
      <img src="https://raw.github.com/alrra/browser-logos/master/firefox/firefox_48x48.png" alt="Firefox"><br>
      ✔
    </td>
    <td align="center">
      <img src="https://raw.github.com/alrra/browser-logos/master/safari/safari_48x48.png" alt="Safari"><br>
      6+
    </td>
    <td align="center">
      <img src="https://raw.github.com/alrra/browser-logos/master/edge/edge_48x48.png" alt="Edge"><br>
      ✔
    </td>
    <td align="center">
      <img src="https://raw.github.com/alrra/browser-logos/master/internet-explorer/internet-explorer_48x48.png" alt="Internet Explorer"><br>
      9+
    </td>
    <td align="center">
      <img src="https://raw.github.com/alrra/browser-logos/master/opera/opera_48x48.png" alt="Opera"><br>
      ✔
    </td>
  </tr>
</table>

## 翻译

下面的翻译来自这个社区的贡献。请注意下面的翻译不是官方所有而且可能会有一些不精准的地方或者过时：

* [日语](https://github.com/nebosuker/autotrack)
* [汉语](https://github.com/stevezhuang/autotrack/blob/master/README.zh.md)

如果你发现翻译有什么问题，请创建或修改到对应的仓库里面去。按照下面的步骤提交你自己的翻译：

1. 建立这个仓库到你的Github
2. 移除所有的文件只留下`README.md`。
3. 提交一个pull请求到这个仓库并且在上面的翻译列表加一个你的翻译链接。

Translation by Steve Zhuang, translation license follows autotrack's project license.
