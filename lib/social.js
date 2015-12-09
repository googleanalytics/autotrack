import delegate from 'delegate';
import provide from './provide';


const ATTR_PREFIX = 'data-social';


class SocialTracker {

  /**
   * @constructor
   * Registers social tracking on tracker object.
   * Supports both declarative social tracking via HTML attributes as well as
   * tracking for social events when using official Twitter or Facebook widgets.
   * @param {Object} tracker Passed internally by analytics.js
   * @param {Object} opts Initialization options passed to the require command.
   */
  constructor(tracker, opts = {}) {

    opts.prefix = opts.prefix || ATTR_PREFIX;

    this.tracker = tracker;
    this.options = opts;

    delegate(document, `[${this.options.prefix}-network]`, 'click',
        this.handleEventClicks.bind(this));

    this.detectLibraryLoad('FB', 'facebook-jssdk',
        this.addTwitterEventHandlers.bind(this));

    this.detectLibraryLoad('twttr', 'twitter-wjs',
        this.addFacebookEventHandlers.bind(this));
  }


  /**
   * Handles all clicks on elements with social tracking attributes.
   * @param {Event} event The DOM click event.
   */
  handleEventClicks(event) {

    let link = event.delegateTarget;

    this.tracker.send('social', {
      socialNetwork: link.getAttribute(`${this.options.prefix}-network`),
      socialAction: link.getAttribute(`${this.options.prefix}-action`),
      socialTarget: link.getAttribute(`${this.options.prefix}-target`)
    });
  }


  /**
   * A utility method that determines when a social library is finished loading.
   * @param {string} namespace The global property name added to window.
   * @param {string} domId The ID of a script element in the DOM.
   * @param {Function} done A callback to be invoked when done.
   */
  detectLibraryLoad(namespace, domId, done) {
    if (window[namespace]) {
      done();
    }
    else {
      let script = document.getElementById(domId);
      if (script) {
        script.onload = done;
      }
    }
  }


  /**
   * Adds event handlers for the "tweet" and "follow" events emitted by the
   * official tweet and follow buttons. Note: this does not capture tweet or
   * follow events emitted by other Twitter widgets (tweet, timeline, etc.).
   */
  addTwitterEventHandlers() {
    try {
      twttr.ready(() => {
        twttr.events.bind('tweet', (event) => {
          // Ignore tweets from widgets that aren't the tweet button.
          if (event.region != 'tweet') return;

          let url = event.data.url || event.target.getAttribute('data-url') ||
              location.href;

          this.tracker.send('social', 'Twitter', 'tweet', url);
        });

        twttr.events.bind('follow', (event) => {
          // Ignore follows from widgets that aren't the follow button.
          if (event.region != 'follow') return;

          let screenName = event.data.screen_name ||
              event.target.getAttribute('data-screen-name');

          this.tracker.send('social', 'Twitter', 'follow', screenName);
        });
      });
    } catch(err) {}
  }


  /**
   * Adds event handlers for the "like" and "unlike" events emitted by the
   * official Facebook like button.
   */
  addFacebookEventHandlers() {
    try {
      FB.Event.subscribe('edge.create', (url) => {
        this.tracker.send('social', 'Facebook', 'like', url);
      });

      FB.Event.subscribe('edge.remove', (url) => {
        this.tracker.send('social', 'Facebook', 'unlike', url);
      });
    } catch(err) {}
  }
}


provide('socialTracker', SocialTracker);
