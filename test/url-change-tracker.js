/**
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


var assert = require('assert');
var ga = require('./analytics');
var constants = require('../lib/constants');


var browserCaps;
var baseUrl = browser.options.baseUrl;


describe('urlTracker', function() {

  before(function *() {
    browserCaps = (yield browser.session()).value;

    yield browser.url('/test/url-change-tracker.html');
  });


  beforeEach(function() {
    return browser
        .execute(ga.run, 'create', 'UA-XXXXX-Y', 'auto')
        .execute(ga.trackHitData);
  });


  afterEach(function () {
    return browser
        .execute(ga.clearHitData)
        .execute(ga.run, 'urlChangeTracker:remove')
        .execute(ga.run, 'remove');
  });


  it('should capture URL changes via pushState and popstate', function *() {

    if (notSupportedInBrowser()) return;

    yield browser.execute(ga.run, 'require', 'urlChangeTracker');

    var fooUrl = (yield browser
        .click('#foo')
        .url())
        .value;

    assert.equal(fooUrl, baseUrl + '/test/foo.html');

    var barUrl = (yield browser
        .click('#bar')
        .url())
        .value;

    assert.equal(barUrl, baseUrl + '/test/bar.html');

    var quxUrl = (yield browser
        .click('#qux')
        .url())
        .value;

    assert.equal(quxUrl, baseUrl + '/test/qux.html');

    var back1Url = (yield browser
        .back()
        .url())
        .value;

    assert.equal(back1Url, baseUrl + '/test/bar.html');

    var back2Url = (yield browser
        .back()
        .url())
        .value;

    assert.equal(back2Url, baseUrl + '/test/foo.html');

    var back3Url = (yield browser
        .back()
        .url())
        .value;

    assert.equal(back3Url, baseUrl + '/test/url-change-tracker.html');

    var hitData = (yield browser
        .execute(ga.getHitData))
        .value;

    assert.equal(hitData[0].page, '/test/foo.html');
    assert.equal(hitData[0].title, 'Foo');
    assert.equal(hitData[1].page, '/test/bar.html');
    assert.equal(hitData[1].title, 'Bar');
    assert.equal(hitData[2].page, '/test/qux.html');
    assert.equal(hitData[2].title, 'Qux');
    assert.equal(hitData[3].page, '/test/bar.html');
    assert.equal(hitData[3].title, 'Bar');
    assert.equal(hitData[4].page, '/test/foo.html');
    assert.equal(hitData[4].title, 'Foo');
    assert.equal(hitData[5].page, '/test/url-change-tracker.html');
    assert.equal(hitData[5].title, 'Home');
  });

  it('should update the tracker but not send hits when using replaceState',
      function *() {

    if (notSupportedInBrowser()) return;

    yield browser.execute(ga.run, 'require', 'urlChangeTracker');

    var url = (yield browser
        .click('#replace')
        .url())
        .value;

    // Replace state was called to just use the pathname value.
    assert.equal(url, baseUrl + '/test/replaced.html');

    var url = (yield browser
        .click('#restore')
        .url())
        .value;

    // Replace state was called to just use the pathname value.
    assert.equal(url, baseUrl + '/test/url-change-tracker.html');

    var hitData = (yield browser
        .execute(ga.getHitData))
        .value;

    assert.equal(hitData.length, 0);
  });


  it('should not capture hash changes', function *() {

    if (notSupportedInBrowser()) return;

    yield browser.execute(ga.run, 'require', 'urlChangeTracker');

    var url = (yield browser
        .click('#hash')
        .url())
        .value;

    assert.equal(url, baseUrl + '/test/url-change-tracker.html#hash');

    var backUrl = (yield browser
        .back()
        .url())
        .value;

    assert.equal(backUrl, baseUrl + '/test/url-change-tracker.html');

    var hitData = (yield browser
        .execute(ga.getHitData))
        .value;

    assert.equal(hitData.length, 0);
  });


  it('should support customizing what is considered a change', function *() {

    if (notSupportedInBrowser()) return;

    yield browser.execute(requireUrlChangeTrackerTrackerWithConditional);

    var fooUrl = (yield browser
        .click('#foo')
        .url())
        .value;

    assert.equal(fooUrl, baseUrl + '/test/foo.html');

    var backUrl = (yield browser
       .back()
       .url())
       .value;

    assert.equal(backUrl, baseUrl + '/test/url-change-tracker.html');

    var hitData = (yield browser
       .execute(ga.getHitData))
       .value;

    assert.equal(hitData.length, 0);
  });


  it('should include the &did param with all hits', function() {

    return browser
        .execute(ga.run, 'require', 'urlChangeTracker')
        .execute(ga.run, 'send', 'pageview')
        .waitUntil(ga.hitDataMatches([['[0].devId', constants.DEV_ID]]));
  });

});


/**
 * Since function objects can't be passed via parameters from server to
 * client, this one-off function must be used to set the value for
 * `shouldTrackOutboundForm`.
 */
function requireUrlChangeTrackerTrackerWithConditional() {
  ga('require', 'urlChangeTracker', {
    shouldTrackUrlChange: function(newPath, oldPath) {
      return false;
    }
  });
}


function isIE9() {
  return browserCaps.browserName == 'internet explorer' &&
         browserCaps.version == '9';
}


function notSupportedInBrowser() {
  // IE9 doesn't support the HTML5 History API.
  return isIE9();
}
