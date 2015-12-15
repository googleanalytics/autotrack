var assert = require('assert');


describe('Outbound form tracking', function() {

  it('should send events on outbound form submits', function *() {
    var hitData = (yield browser
        .url('/test/outbound-form-tracker.html')
        .execute(stopFormSubmits)
        .execute(stubBeacon)
        .click('#control-1')
        .execute(getPageData))
        .value;

    assert.equal(hitData[0].eventCategory, 'Outbound Form');
    assert.equal(hitData[0].eventAction, 'submit');
    assert.equal(hitData[0].eventLabel, 'http://example.com/?id=1');
  });

  it('should not send events on local form submits', function *() {
    var hitData = (yield browser
        .url('/test/outbound-form-tracker.html')
        .execute(stopFormSubmits)
        .execute(stubBeacon)
        .click('#control-2')
        .execute(getPageData))
        .value;

    assert.equal(hitData.length, 0);
  });

  it('should respect the formaction attribute', function *() {
    var hitData = (yield browser
        .url('/test/outbound-form-tracker.html')
        .execute(stopFormSubmits)
        .execute(stubBeacon)
        .click('#control-3')
        .execute(getPageData))
        .value;

    assert.equal(hitData[0].eventLabel, 'http://example.com/?id=3');

    hitData = (yield browser
        .click('#control-4')
        .execute(getPageData))
        .value;

    assert.equal(hitData[1].eventLabel, 'http://example.com/?id=4');

    hitData = (yield browser
        .click('#control-5')
        .execute(getPageData))
        .value;

    assert.equal(hitData.length, 2);

    hitData = (yield browser
        .click('#control-6')
        .execute(getPageData))
        .value;

    assert.equal(hitData[2].eventLabel, 'http://example.com/?id=6');

    hitData = (yield browser
        .click('#control-7')
        .keys('\ue007')
        .execute(getPageData))
        .value;

    assert.equal(hitData[3].eventLabel, 'http://example.com/?id=7');
  });

  it('should navigate to the proper location on submit', function *() {
    var url = (yield browser
        .url('/test/outbound-form-tracker.html')
        .execute(stubBeacon)
        .click('#control-1')
        .url()).value;

    assert.equal(url, 'http://example.com/?id=1');

    url = (yield browser
        .url('/test/outbound-form-tracker.html')
        .execute(stubBeacon)
        .click('#control-3')
        .url()).value;

    assert.equal(url, 'http://example.com/?id=3');

    url = (yield browser
        .url('/test/outbound-form-tracker.html')
        .execute(stubBeacon)
        .click('#control-4')
        .url()).value;

    assert.equal(url, 'http://example.com/?id=4');

    url = (yield browser
        .url('/test/outbound-form-tracker.html')
        .execute(stubBeacon)
        .click('#control-6')
        .url()).value;

    assert.equal(url, 'http://example.com/?id=6');

    url = (yield browser
        .url('/test/outbound-form-tracker.html')
        .execute(stubBeacon)
        .click('#control-7')
        .keys('\ue007')
        .url()).value;

    assert.equal(url, 'http://example.com/?id=7');
  });

  it('should stop the event when beacon is not supported and re-emit ' +
      'after the hit succeeds or times out', function* () {

    var hitData = (yield browser
        .url('/test/outbound-form-tracker.html')
        .execute(stubNoBeacon)
        .execute(disableFormSubmitMethod)
        .click('#control-1')
        .execute(getPageData))
        .value;

    assert.equal(hitData[0].eventCategory, 'Outbound Form');
    assert.equal(hitData[0].eventAction, 'submit');
    assert.equal(hitData[0].eventLabel, 'http://example.com/?id=1');

    url = (yield browser
        .execute(reenabledFormSubmitMethod)
        .click('#control-1')
        .url())
        .value;

    assert.equal(url, 'http://example.com/?id=1');

    // TODO(philipwalton): figure out a way to test hitCallback timing out.
  });
});


function stopFormSubmits() {
  window.__stopFormSubmits__ = true;
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
    form.__originalSubmit__ = form.submit;
    form.submit = function() {};
  }
}


function reenabledFormSubmitMethod() {
  for (var i = 0, form; form = document.forms[i]; i++) {
    form.submit = form.__originalSubmit__;
  }
}


function getPageData() {
  return hitData;
}
