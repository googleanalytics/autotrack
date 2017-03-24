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


import provide from '../provide';
import {plugins, trackUsage} from '../usage';
import {assign, createFieldsObj} from '../utilities';


/**
 * Class for the `socialWidgetTracker` analytics.js plugin.
 * @implements {SocialWidgetTrackerPublicInterface}
 */
class SocialWidgetTracker {
  /**
   * Registers social tracking on tracker object.
   * Supports both declarative social tracking via HTML attributes as well as
   * tracking for social events when using official Twitter or Facebook widgets.
   * @param {!Tracker} tracker Passed internally by analytics.js
   * @param {?Object} opts Passed by the require command.
   */
  constructor(tracker, opts) {
    trackUsage(tracker, plugins.SOCIAL_WIDGET_TRACKER);

    // Feature detects to prevent errors in unsupporting browsers.
    if (!window.addEventListener) return;

    /** @type {SocialWidgetTrackerOpts} */
    const defaultOpts = {
      fieldsObj: {},
      hitFilter: null,
    };

    this.opts = /** @type {SocialWidgetTrackerOpts} */ (
        assign(defaultOpts, opts));

    this.tracker = tracker;

    // Binds methods to `this`.
    this.addWidgetListeners = this.addWidgetListeners.bind(this);
    this.addTwitterEventHandlers = this.addTwitterEventHandlers.bind(this);
    this.handleTweetEvents = this.handleTweetEvents.bind(this);
    this.handleFollowEvents = this.handleFollowEvents.bind(this);
    this.handleLikeEvents = this.handleLikeEvents.bind(this);
    this.handleUnlikeEvents = this.handleUnlikeEvents.bind(this);

    if (document.readyState != 'complete') {
      // Adds the widget listeners after the window's `load` event fires.
      // If loading widgets using the officially recommended snippets, they
      // will be available at `window.load`. If not users can call the
      // `addWidgetListeners` method manually.
      window.addEventListener('load', this.addWidgetListeners);
    } else {
      this.addWidgetListeners();
    }
  }


  /**
   * Invokes the methods to add Facebook and Twitter widget event listeners.
   * Ensures the respective global namespaces are present before adding.
   */
  addWidgetListeners() {
    if (window.FB) this.addFacebookEventHandlers();
    if (window.twttr) this.addTwitterEventHandlers();
  }

  /**
   * Adds event handlers for the "tweet" and "follow" events emitted by the
   * official tweet and follow buttons. Note: this does not capture tweet or
   * follow events emitted by other Twitter widgets (tweet, timeline, etc.).
   */
  addTwitterEventHandlers() {
    try {
      window.twttr.ready(() => {
        window.twttr.events.bind('tweet', this.handleTweetEvents);
        window.twttr.events.bind('follow', this.handleFollowEvents);
      });
    } catch(err) {
      // Do nothing.
    }
  }

  /**
   * Removes event handlers for the "tweet" and "follow" events emitted by the
   * official tweet and follow buttons.
   */
  removeTwitterEventHandlers() {
    try {
      window.twttr.ready(() => {
        window.twttr.events.unbind('tweet', this.handleTweetEvents);
        window.twttr.events.unbind('follow', this.handleFollowEvents);
      });
    } catch(err) {
      // Do nothing.
    }
  }

  /**
   * Adds event handlers for the "like" and "unlike" events emitted by the
   * official Facebook like button.
   */
  addFacebookEventHandlers() {
    try {
      window.FB.Event.subscribe('edge.create', this.handleLikeEvents);
      window.FB.Event.subscribe('edge.remove', this.handleUnlikeEvents);
    } catch(err) {
      // Do nothing.
    }
  }

  /**
   * Removes event handlers for the "like" and "unlike" events emitted by the
   * official Facebook like button.
   */
  removeFacebookEventHandlers() {
    try {
      window.FB.Event.unsubscribe('edge.create', this.handleLikeEvents);
      window.FB.Event.unsubscribe('edge.remove', this.handleUnlikeEvents);
    } catch(err) {
      // Do nothing.
    }
  }

  /**
   * Handles `tweet` events emitted by the Twitter JS SDK.
   * @param {TwttrEvent} event The Twitter event object passed to the handler.
   */
  handleTweetEvents(event) {
    // Ignores tweets from widgets that aren't the tweet button.
    if (event.region != 'tweet') return;

    const url = event.data.url || event.target.getAttribute('data-url') ||
        location.href;

    /** @type {FieldsObj} */
    const defaultFields = {
      transport: 'beacon',
      socialNetwork: 'Twitter',
      socialAction: 'tweet',
      socialTarget: url,
    };
    this.tracker.send('social',
        createFieldsObj(defaultFields, this.opts.fieldsObj,
            this.tracker, this.opts.hitFilter, event.target, event));
  }

  /**
   * Handles `follow` events emitted by the Twitter JS SDK.
   * @param {TwttrEvent} event The Twitter event object passed to the handler.
   */
  handleFollowEvents(event) {
    // Ignore follows from widgets that aren't the follow button.
    if (event.region != 'follow') return;

    const screenName = event.data.screen_name ||
        event.target.getAttribute('data-screen-name');

    /** @type {FieldsObj} */
    const defaultFields = {
      transport: 'beacon',
      socialNetwork: 'Twitter',
      socialAction: 'follow',
      socialTarget: screenName,
    };
    this.tracker.send('social',
        createFieldsObj(defaultFields, this.opts.fieldsObj,
            this.tracker, this.opts.hitFilter, event.target, event));
  }

  /**
   * Handles `like` events emitted by the Facebook JS SDK.
   * @param {string} url The URL corresponding to the like event.
   */
  handleLikeEvents(url) {
    /** @type {FieldsObj} */
    const defaultFields = {
      transport: 'beacon',
      socialNetwork: 'Facebook',
      socialAction: 'like',
      socialTarget: url,
    };
    this.tracker.send('social', createFieldsObj(defaultFields,
        this.opts.fieldsObj, this.tracker, this.opts.hitFilter));
  }

  /**
   * Handles `unlike` events emitted by the Facebook JS SDK.
   * @param {string} url The URL corresponding to the unlike event.
   */
  handleUnlikeEvents(url) {
    /** @type {FieldsObj} */
    const defaultFields = {
      transport: 'beacon',
      socialNetwork: 'Facebook',
      socialAction: 'unlike',
      socialTarget: url,
    };
    this.tracker.send('social', createFieldsObj(defaultFields,
        this.opts.fieldsObj, this.tracker, this.opts.hitFilter));
  }

  /**
   * Removes all event listeners and instance properties.
   */
  remove() {
    window.removeEventListener('load', this.addWidgetListeners);
    this.removeFacebookEventHandlers();
    this.removeTwitterEventHandlers();
  }
}


provide('socialWidgetTracker', SocialWidgetTracker);
