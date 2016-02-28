# Autotrack [![Build Status](https://travis-ci.org/googleanalytics/autotrack.svg?branch=master)](https://travis-ci.org/googleanalytics/autotrack)

- [概要](#概要)
- [使用方法](#使用方法)
  - [設定オプションを渡す](#設定オプションを渡す)
  - [autotrack を npm 経由で読み込む](#autotrack を npm 経由で読み込む)
  - [プラグインを個別に使う](#プラグインを個別に使う)
- [プラグイン](#プラグイン)
- [設定オプション](#設定オプション)
- [高度な使用方法](#高度な使用方法)
  - [カスタムビルド](#カスタムビルド)
  - [autotrack を複数のトラッカーで使う](#autotrack を複数のトラッカーで使う)
- [ブラウザサポート](#ブラウザサポート)

## 概要

Google アナリティクスの標準の [JavaScript トラッキング スニペット](https://developers.google.com/analytics/devguides/collection/analyticsjs/) は、Web ページの最初の読み込み時に動作し、ページビュー ヒットを Google アナリティクスに送信します。ページビュー以外のことを知りたい場合（例：イベントやソーシャル インタラクション）は、その情報を取得するコードを自分で書く必要があります。

ほとんどの Web サイトオーナーが気に掛けるユーザー インタラクションは同様のものであるため、Web 開発者は新しいサイトを作るたびに、同じコードを何度も書くことになります。

Autotrack は、この問題を解決するためのものです。多くの人が気にするインタラクションに関する標準のトラッキング機能を提供し、また、便利な機能（例：宣言的イベント トラッキング）もいくつか提供するため、人々があなたのサイトをどのように利用しているのかを、これまでよりも容易に理解できるようになります。

`autotrack.js` は小さなライブラリで（gzipで3Kバイト）、次に示すプラグインを含みます。デフォルトではすべてのプラグインが1つにまとめられていますが、各プラグインを個別に含めて設定することも可能です。

<table>
  <tr>
    <th align="left">プラグイン</th>
    <th align="left">説明</th>
  </tr>
  <tr>
    <td><a href="#eventtracker"><code>eventTracker</code></a></td>
    <td>宣言的イベント トラッキング</td>
  </tr>
  <tr>
    <td><a href="#mediaquerytracker"><code>mediaQueryTracker</code></a></td>
    <td>Media queryとブレークポイントのトラッキング</td>
  </tr>
  <tr>
    <td><a href="#outboundformtracker"><code>outboundFormTracker</code></a></td>
    <td>外部サイト向けフォーム送信の自動トラッキング</td>
  </tr>
  <tr>
    <td><a href="#outboundlinktracker"><code>outboundLinkTracker</code></a></td>
    <td>外部サイト向けリンク クリックの自動トラッキング</td>
  </tr>
  <tr>
    <td><a href="#socialtracker"><code>socialTracker</code></a></td>
    <td>強化された自動かつ宣言的なソーシャル トラッキング</td>
  </tr>
  <tr>
    <td><a href="#urlchangetracker"><code>urlChangeTracker</code></a></td>
    <td>URL変更の自動トラッキング（シングル ページ アプリケーション向け）</td>
  </tr>
</table>

**免責条項:** autotrack は、Google アナリティクスの開発者リレーションチームが開発・維持しており、その主な対象者は開発者です。Google アナリティクスの正式なプロダクトではなく、Google アナリティクス プレミアムのサポート対象ではありません。このライブラリを利用することを選んだ開発者は、その実装が [Google アナリティクス サービス利用規約](https://www.google.com/analytics/terms/jp.html) を満たす責任があり、各国における法的な義務を果たす責任があります。


## 使用方法

autotrack をサイトに追加するには、次の2つのことが必要です：

1. `autotrack.js` スクリプトをページ内で読み込む。
2. [JavaScript トラッキング スニペット](https://developers.google.com/analytics/devguides/collection/analyticsjs/tracking-snippet-reference?hl=ja) を、`autotrack` [プラグインを使用する](https://developers.google.com/analytics/devguides/collection/analyticsjs/using-plugins?hl=ja) ように変更する。

サイトですでにデフォルトのJavaScript トラッキング スニペットを読み込んでいる場合、それを次の修正済みスニペットに置き換えてもかまいません（`require` コマンドと、追加の`autotrack.js` があることに注意）：

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

[analytics.js プラグインのシステム](https://developers.google.com/analytics/devguides/collection/analyticsjs/using-plugins?hl=ja) はスクリプトの非同期読み込みをサポートしているため、`autotrack.js` の読み込みは `analytics.js` の前でも後でもかまいません。また、`autotrack.js` ライブラリを個別に読み込むか、他のJavaScript コードと一緒にまとめて読み込むかも関係ありません。

### 設定オプションを渡す

autotrack のデフォルトの挙動は、[設定オプション](#設定オプション) でカスタマイズできます。autotrack の設定オプションは、`require` コマンドに3つ目のオプション パラメータとして渡します。

たとえば、デフォルトの [`attributePrefix`](#attributeprefix) オプションをオーバーライドするには、次のようにします:

```js
ga('require', 'autotrack', {
  attributePrefix: 'data-ga-'
});
```

### autotrack を npm 経由で読み込む

npm で [Browserify](http://browserify.org/)、 [Webpack](https://webpack.github.io/)、[SystemJS](https://github.com/systemjs/systemjs) のようなモジュールローダーを使っている場合は、require することで、他の npm モジュールと同様に、autotrack をビルドにインクルードできます：

```sh
npm install autotrack
```

```js
// JavaScript コードで
require('autotrack');
```

上記のコードでは、生成する JavaScript ファイルに autotrack プラグインをインクルードしていますが、`analytics.js` トラッカー オブジェクトにプラグインを登録していないことに注意してください。依然として、トラッキング スニペットに `require` コマンドを追加することは必要です：

```js
// analytics.js のトラッキング スニペットで
ga('create', 'UA-XXXXX-Y', 'auto');
ga('require', 'autotrack');
ga('send', 'pageview');
```

### プラグインを個別に使う

`autotrack.js` ソースファイルは、以下に示すすべてのプラグインを含みますが、そのすべてを使いたいわけではないこともあるでしょう。

`autotrack` プラグインを require すると、バンドルされたすべてのプラグインに対して `require` コマンドを実行し、受け取った設定オブジェクト（存在する場合）のコピーを渡します。一部のプラグインだけを使う場合は、`autotrack` プラグインを require するのではなく、個別に require してください。

たとえば、`eventTracker` プラグインと `outboundLinkTracker` プラグインだけを使うには、スニペットを次のように修正します：

```js
ga('create', 'UA-XXXXX-Y', 'auto');
ga('require', 'eventTracker');
ga('require', 'outboundLinkTracker');
ga('send', 'pageview');
```

それぞれのプラグインも、autotrack と同じ一連の設定オプションを受け付けます。特定のプラグインに関連のないオプションは無視されます。各プラグインを require する際に設定オプションを利用する場合、同じオブジェクトを各プラグインに渡すのがわかりやすいやり方です。

```js
var opts = { /* 設定オプション */ };

ga('require', 'eventTracker', opts);
ga('require', 'outboundLinkTracker', opts);
```

特定のプラグインだけを require する場合でも、`autotrack.js` のソースコード ファイルはすべてのプラグインのコードを含んでいることを理解していくのは重要です。望むプラグインだけを含むスクリプト ファイルをビルドするには、[カスタムビルド](#カスタムビルド) セクションを参照してください。

## プラグイン

### `eventTracker`

`eventTracker` プラグインは、どんな要素でも `data-event-category` 属性と `data-event-action` 属性があれば実行される、宣言的イベント トラッキングを追加できます。`data-event-label` 属性と `data-event-value` 属性もサポートしています（属性名はカスタマイズ可能です）。

#### オプション

* [`attributePrefix`](#attributeprefix)

#### 例

次の要素は、イベント カテゴリが "video" でイベント アクションが "play" のイベント ヒットを Google アナリティクスに送信します。

```html
<button data-event-category="video" data-event-action="play">Play</button>
```

### `mediaQueryTracker`

`mediaQueryTracker` プラグインは、どの media query が有効かと、該当する media query がどのくらいの頻度で変わったかをトラッキングできます。

`mediaQueryTracker` プラグインがどの media query データを調べるかは、 [`mediaQueryDefinitions`](#mediaquerydefinitions) 設定オプションで指定します。

**重要： 他の autotrack プラグインと異なり、`mediaQueryTracker` プラグインを利用するには、Google アナリティクスのプロパティ設定を変更する必要があります。必要な修正は次のとおりです：**

1. Google アナリティクスにログインし、データを送信しようとしている [アカウントとプロパティ](https://support.google.com/analytics/answer/1009618) を開きます。そして、トラッキングしたい media queries のセットごとに [カスタム ディメンション](https://support.google.com/analytics/answer/2709829) を設定します（例： ブレークポイント、解像度/DPI、デバイスの向きなど）。
2. それぞれのディメンションに名前を付け（例： Breakpoints）、範囲（スコープ）を [ヒット](https://support.google.com/analytics/answer/2709828#example-hit) に設定します。"アクティブ" チェックボックスを有効にしておくことを忘れないでください。
3. [`mediaQueryDefinitions`](#mediaquerydefinitions) の設定オブジェクトで、`name` と `dimensionIndex` の値として、Google アナリティクスのカスタム ディメンション設定画面で表示されるカスタム ディメンション名とインデックスと同じ値を指定します。

ブレークポイント、デバイス解像度、デバイスの向きのデータをトラッキングするための設定オプションに関するドキュメントは、[`mediaQueryDefinitions`](#mediaquerydefinitions) を参照してください。

#### オプション

* [`mediaQueryDefinitions`](#mediaquerydefinitions)

### `outboundFormTracker`

`outboundFormTracker` プラグインは、サイトと異なるドメイン名に対してフォームが送信されたことを自動的に検知し、イベント ヒットを送信します。イベント カテゴリは "Outbound Form" で、イベント アクションは "submit" です。イベント ラベルはフォームの `action` 属性の値です。

デフォルトでは、フォームの action 属性が、相対パスではなく、かつ、現在の `location.hostname` 値を含まない場合に、そのフォームは外部サイト向けだとみなされます。これにより、（デフォルトでは）同じ上位レベルドメイン名に属する他のサブドメインに送信されるフォームが外部サイト向けフォームだとみなされることに注意してください。このロジックは [`shouldTrackOutboundForm`](#shouldtrackoutboundform) 設定オプションでカスタマイズできます。

#### オプション

* [`shouldTrackOutboundForm`](#shouldtrackoutboundform)

### `outboundLinkTracker`

`outboundLinkTracker` プラグインは、リンクの `href` 属性が他のドメイン名を指している場合に、そのクリックを自動的に検知し、イベント ヒットを送信します。イベント カテゴリは "Outbound Link" で、イベント アクションは "click" です。イベント ラベルはリンクの `href` 属性値です。

デフォルトでは、リンクの `hostname` プロパティが `location.hostname` と異なる場合に、そのリンクは外部サイト向けだとみなされます。これにより、（デフォルトでは）同じ上位レベルドメイン名に属する他のサブドメインに対するリンクが外部サイト向けリンクだとみなされることに注意してください。このロジックは [`shouldTrackOutboundLink`](#shouldtrackoutboundlink) 設定オプションでカスタマイズできます。

#### オプション

* [`shouldTrackOutboundLink`](#shouldtrackoutboundlink)

### `socialTracker`

`socialTracker` プラグインは、どんな要素でも `data-social-network` 属性、`data-social-action` 属性、`data-social-target` 属性があればクリック イベントとして実行される、宣言的ソーシャル インタラクション トラッキングを追加できるもので、`eventTracking` プラグインと似ています。

また、公式 Twitter ツイート/フォローボタン、公式 Facebook いいね!ボタンに対しては、自動的にソーシャル トラッキングを追加します。言い換えれば、Twitter や Facebook の公式ボタンをページで利用している場合、autotrack （または `socialTracker` プラグイン単体）を利用すれば、それらのボタンに対するユーザー インタラクションは自動的にトラッキングされます。

トラッキングされるソーシャルフィールドを、次の表に示します：

<table>
  <tr>
    <th align="left">ウィジェット</th>
    <th align="left">ソーシャル ネットワーク</th>
    <th align="left">ソーシャル アクション</th>
    <th align="left">ソーシャル ターゲット</th>
  </tr>
  <tr>
    <td>Like button</td>
    <td><code>Facebook</code></td>
    <td><code>like</code> または <code>unlike</code></td>
    <td>現在のページのURL</td>
  </tr>
  <tr>
    <td>Tweet button</td>
    <td><code>Twitter</code></td>
    <td><code>tweet</code></td>
    <td>ウィジェットの <code>data-url</code> 属性、または現在のページのURL</td>
  </tr>
  <tr>
    <td>Follow button</td>
    <td><code>Twitter</code></td>
    <td><code>follow</code></td>
    <td>ウィジェットの <code>data-screen-name</code> 属性</td>
  </tr>
</table>

### `urlChangeTracker`

`urlChangeTracker` プラグインは、[History API](https://developer.mozilla.org/ja/docs/Web/Guide/DOM/Manipulating_the_browser_history) によって URL が変わったことを検知し、自動的にトラッカーを更新して追加のページビューを送信します。これにより、 [シングル ページ アプリケーション](https://en.wikipedia.org/wiki/Single-page_application) でも、特別な設定なしに、旧来のWebサイトのようにトラッキングできます。

注意してください、このプラグインは、URLのハッシュ部分の変更をトラッキングすることはサポートしていません。多くの Google アナリティクスの実装がページビューのトラッキングにあたって、URLのハッシュ部分を取り込まないからです。また、シングル ページ アプリケーションの開発者は、利用しているフレームワークではURLの変更をトラッキングしていないことを確認し、収集するデータが重複しないようにするべきです。

#### オプション

* [`shouldTrackUrlChange`](#shouldtrackurlchange)


## 設定オプション

以下のオプションは、`autotrack` プラグイン、または個別のサブ プラグインに渡せます。

### `attributePrefix`

**型**: `string`

**デフォルト**: `'data-'`

宣言的イベント トラッキングと宣言的ソーシャル トラッキングで利用する属性のprefixです。この値に、フィールド名をケバブケース（ハイフン区切り）にしたものを追加した属性名が使われます。たとえば、prefixが `'data-ga-'` でフィールドが、`eventCategory` の場合、属性名は `data-ga-event-category` になります。

### `mediaQueryDefinitions`

**型**: `Object|Array|null`

**デフォルト**: `null`

media query の定義オブジェクト、または media query の定義オブジェクトのリストです。media query 定義オブジェクトは、次のプロパティを含みます：

  - `name`: media query 変更イベントの `eventCategory` 値に使う一意の名前
  - `dimensionIndex`: [Google アナリティクスで作成した](https://support.google.com/analytics/answer/2709829) カスタム ディメンションのインデックス
  - `items`: 次のプロパティを含むオブジェクトの配列：
    - `name`: カスタム ディメンションに設定する名前
    - `media`: 合致するかテストする media query 値

次の配列は、3つの media query 定義オブジェクトの例です：

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

同時に複数の `media` 値に合致する場合、`items` 配列で後に定義されたものが優先されます。たとえば、上記の "Breakpoint" の例では、`sm` が `all` に設定されており常に合致しますが、`md` や `lg` に合致する場合はそれらが優先されます。

### `mediaQueryChangeTemplate`

**型**: `Function`

**デフォルト**:

```js
function(newValue, oldValue) {
  return oldValue + ' => ' + newValue;
}
```

media query 変更イベントの `eventLabel` に使う値のフォーマット関数です。たとえば、media query 変更が `lg` から `md` の場合、デフォルトでは `lg => md` のようにフォーマットされます。

### `mediaQueryChangeTimeout`

**型**: `number`

**デフォルト**: `1000`

debounce タイムアウト、言い換えれば、media query 変更ヒットを実際に送信するまでに待つ時間です。このタイムアウト時間内に複数の変更イベントが発生した場合、最後のものだけが送信されます。

### `shouldTrackOutboundForm`

**型**: `Function`

**デフォルト**:

```js
function(form) {
  var action = form.getAttribute('action');
  return action.indexOf('http') === 0 && action.indexOf(location.hostname) < 0;
};
```

フォーム送信を「外部サイト向けフォーム」としてトラッキングするかどうかを判断する関数です。この関数は、呼び出し時に、唯一の引数として `<form>` 要素を受け取ります。この関数がtrueを返すと、そのフォーム送信はトラッキングされます。

デフォルトの `shouldTrackOutboundForm` オプションは、`blog.example.com` から `store.example.com` へのフォーム送信を外部サイト向けフォームだとみなします。このロジックをカスタマイズし、`*.example.com` サブドメインへのフォーム送信をトラッキングから除外するには、オプションを次のようにオーバーライドします：

```js
ga('require', 'autotrack', {
  shouldTrackOutboundForm: function(form) {
    var action = form.getAttribute('action');
    // action 属性が "http" で始まるかをチェックして相対パスを除外し、
    // action 属性が文字列 "example.com" を含まないことをチェック
    return action.indexOf('http') === 0 && action.indexOf('example.com') < 0;
  }
}
```

### `shouldTrackOutboundLink`

**型**: `Function`

**デフォルト**:

```js
function(link) {
  return link.hostname != location.hostname;
};
```

リンクのクリックを「外部サイト向けリンク」としてトラッキングするかどうかを判断する関数です。この関数は、呼び出し時に、唯一の引数として `<a>` 要素を受け取ります。この関数がtrueを返すと、そのリンクのクリックはトラッキングされます。

デフォルトの `shouldTrackOutboundLink` オプションは、`blog.example.com` から `store.example.com` へのリンク クリックを外部サイト向けリンクだとみなします。このロジックをカスタマイズし、`*.example.com` サブドメインへのリンク クリックをトラッキングから除外するには、オプションを次のようにオーバーライドします：

```js
ga('require', 'autotrack', {
  shouldTrackOutboundLink: function(link) {
    // リンクの hostname が "example.com" を含まないことをチェック
    return link.hostname.indexOf('example.com') < 0;
  }
}
```

### `shouldTrackUrlChange`

**型**: `Function`

**デフォルト**:

```js
function(newPath, oldPath) {
  return true;
}
```

URLが変更された際に、その変更をトラッキングするかどうかを判断する関数です。デフォルトでは、すべての変更がキャプチャされます。

この関数は、呼び出し時に、引数として文字列 `newPath` と文字列 `oldPath` を受け取ります。これらの値は、URLのパスとクエリ文字列を含みます（ハッシュ部分は含みません）。


## 高度な使用方法

### カスタムビルド

autotrack ライブラリはモジュール構成で作られており、各プラグインはそれぞれの依存要素をインクルードしています。そのため、 [Browserify](http://browserify.org/) などのスクリプト バンドラーを利用してライブラリのカスタム ビルドを作成できます。

次の例は、`eventTracker` プラグインと `outboundLinkTracker` プラグインだけを含むビルドの作成方法を示しています：

```sh
browserify lib/plugins/event-tracker lib/plugins/outbound-link-tracker
```

カスタムビルドを作成する際にには、トラッキング スニペットを修正して、ビルドに含まれるプラグインだけを require するように注意します。ビルドに含まれていないプラグインを require すると、それ以降の`analytics.js` コマンドが実行されなくなります。

すでに [Browserify](http://browserify.org/)、[Webpack](https://webpack.github.io/)、[SystemJS](https://github.com/systemjs/systemjs) などのモジュールローダーで JavaScriptをビルドしている場合、上記の手順は省略し、望むプラグインだけをソースファイルで直接 require できます：

```js
// JavaScript コードで
require('autotrack/lib/plugins/event-tracker');
require('autotrack/lib/plugins/outbound-link-tracker');
```

この部分の動作をよりよく理解するには、[autotrack のソースコード](https://github.com/philipwalton/autotrack/blob/master/lib/plugins/autotrack.js) を参照してください。

### autotrack を複数のトラッカーで使う

すべての autotrack プラグインは、複数のトラッカーをサポートしており、トラッカー名を指定して `require` コマンドを実行することで、正しく動作します。次の例は、2つのトラッカーを作成し、両方で `autotrack` を利用しています：

```js
ga('create', 'UA-XXXXX-Y', 'auto', 'tracker1');
ga('create', 'UA-XXXXX-Z', 'auto', 'tracker2');
ga('tracker1.require', 'autotrack');
ga('tracker2.require', 'autotrack');
ga('tracker1.send', 'pageview');
ga('tracker2.send', 'pageview');
```

## ブラウザサポート

Autotrack は、どんなブラウザでもエラーなく動作します。サポートされていない可能性のあるコードは常に機能を検知したうえで実行するからです。しかし、autotrack は実行しているブラウザでサポートされている機能でしかトラッキングを実行しません。たとえば、Internet Explorer 8 では、media queryの利用はトラッキングされません。Internet Explorer 8 では media query自体がサポートされていないからです。

すべての autotrack プラグインは、[Sauce Labs テスト](https://saucelabs.com/u/autotrack) によって、次のブラウザでテストされています：

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


Translation by Hidehisa YASUDA @[web-tan](http://web-tan.forum.impressrd.jp/), translation license follows autotrack's project license.
