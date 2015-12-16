var assert = require('assert');


describe('Outbound form tracking', function() {


  it('should send events on outbound form submits', function *() {

    var hitData = (yield browser
        .url('/test/outbound-form-tracker.html')
        .execute(stopFormSubmitEvents)
        .execute(stubBeacon)
        .click('#submit-1')
        .execute(getPageData))
        .value;

    assert.equal(hitData[0].eventCategory, 'Outbound Form');
    assert.equal(hitData[0].eventAction, 'submit');
    assert.equal(hitData[0].eventLabel, 'http://example.com/');
  });

  it('should not send events on local form submits', function *() {

    var hitData = (yield browser
        .url('/test/outbound-form-tracker.html')
        .execute(stopFormSubmitEvents)
        .execute(stubBeacon)
        .click('#submit-2')
        .execute(getPageData))
        .value;

    assert.equal(hitData.length, 0);
  });

  it('should navigate to the proper location on submit', function() {
    return browser
        .url('/test/outbound-form-tracker.html')
        .execute(stubBeacon)
        .click('#submit-1')
        .waitUntil(urlIs('http://example.com/'));
  });

  it('should stop the event when beacon is not supported and re-emit ' +
      'after the hit succeeds or times out', function* () {

    var hitData = (yield browser
        .url('/test/outbound-form-tracker.html')
        .execute(stubNoBeacon)
        .execute(disableFormSubmitMethod)
        .click('#submit-1')
        .execute(getPageData))
        .value;

    assert.equal(hitData[0].eventCategory, 'Outbound Form');
    assert.equal(hitData[0].eventAction, 'submit');
    assert.equal(hitData[0].eventLabel, 'http://example.com/');

    yield browser
        .url('/test/outbound-form-tracker.html')
        .click('#submit-1')
        .waitUntil(urlIs('http://example.com/'));

    // TODO(philipwalton): figure out a way to test hitCallback timing out.
  });
});


function urlIs(url) {
  return function() {
    return browser.url().then(function(result) {
      return result.value == url;
    });
  }
}

function stopFormSubmitEvents() {
  window.__stopFormSubmitEvents__ = true;
}


function stubBeacon() {
  navigator.sendBeacon = function() {
    return true;
  };
}


function stubNoBeacon() {
  navigator.sendBeacon = undefined;
}


function disableFormSubmitMethod() {
  for (var i = 0, form; form = document.forms[i]; i++) {
    form.submit = function() {};
  }
}


function getPageData() {
  return hitData;
}
