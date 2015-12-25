var assert = require('assert');


describe('autotrack', function() {

  it('should require all other plugins', function *() {

    var gaplugins = (yield browser
        .url('/test/autotrack.html')
        .execute(getPageData))
        .value;

    assert(gaplugins.Autotrack);
    assert(gaplugins.EventTracker);
    assert(gaplugins.MediaQueryTracker);
    assert(gaplugins.OutboundFormTracker);
    assert(gaplugins.OutboundLinkTracker);
    assert(gaplugins.SessionDurationTracker);
    assert(gaplugins.SocialTracker);
    assert(gaplugins.UrlChangeTracker);
  });
});


function getPageData() {
  return gaplugins;
}
