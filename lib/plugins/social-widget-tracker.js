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
import TrackerQueue from '../tracker-queue';
import {plugins, trackUsage} from '../usage';
import {assign, createFieldsObj, now} from '../utilities';


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
    this.handleFacebookEvents = this.handleFacebookEvents.bind(this);

    this.queue = TrackerQueue.getOrCreate(tracker.get('trackingId'));

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
    this.queue.pushTask(() => {
      this.addFacebookEventHandlers();
      if (window.twttr) this.addTwitterEventHandlers();
    });
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
    } catch (err) {
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
    } catch (err) {
      // Do nothing.
    }
  }

  /**
   * Adds event handlers for the "like" and "unlike" events emitted by the
   * official Facebook like button.
   */
  addFacebookEventHandlers() {
    window.addEventListener('blur', this.handleFacebookEvents);
  }

  /**
   * Removes event handlers for the "like" and "unlike" events emitted by the
   * official Facebook like button.
   */
  removeFacebookEventHandlers() {
    window.removeEventListener('blur', this.handleFacebookEvents);
  }

  /**
   * Handles `tweet` events emitted by the Twitter JS SDK.
   * @param {TwttrEvent} event The Twitter event object passed to the handler.
   */
  handleTweetEvents(event) {
    this.queue.pushTask(({time}) => {
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
        queueTime: now() - time,
      };
      this.tracker.send('social',
          createFieldsObj(defaultFields, this.opts.fieldsObj,
              this.tracker, this.opts.hitFilter, event.target, event));
    });
  }

  /**
   * Handles `follow` events emitted by the Twitter JS SDK.
   * @param {TwttrEvent} event The Twitter event object passed to the handler.
   */
  handleFollowEvents(event) {
    this.queue.pushTask(({time}) => {
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
        queueTime: now() - time,
      };
      this.tracker.send('social',
          createFieldsObj(defaultFields, this.opts.fieldsObj,
              this.tracker, this.opts.hitFilter, event.target, event));
    });
  }

  /**
   * Handles events of embedded Facebook `like` and `share` widgets.
   *
   * Due to privacy issues Facebook decided to deprecate a particular solution
   * which allows to track clicks of native buttons embedded by Facebook JS SDK.
   * @param {Event} event The window blur event.
   *
   * @see https://developers.facebook.com/blog/post/2017/11/07/changes-developer-offerings/
   */
  handleFacebookEvents(event) {
    /** @type {HTMLElement} */ let iframe = document.activeElement;
    if (iframe && iframe.tagName == 'IFRAME') {
      if (iframe.src.indexOf('https://www.facebook.com/') == 0) {
        // Possible iframe titles:
        // "fb:like Facebook Social Plugin"
        // "fb:share_button Facebook Social Plugin"
        let action = iframe.title.split(' ')[0];
        if (action.indexOf('fb:') == 0) {
          action = action.slice(3).split('_')[0];

          this.queue.pushTask(({time}) => {
            /** @type {FieldsObj} */ const defaultFields = {
              transport: 'beacon',
              socialNetwork: 'Facebook',
              socialAction: action,
              socialTarget: location.href,
              queueTime: now() - time,
            };
            this.tracker.send('social', createFieldsObj(defaultFields,
                this.opts.fieldsObj, this.tracker, this.opts.hitFilter));
          });
        }
      }
    }
  }

  /**
   * Removes all event listeners and instance properties.
   */
  remove() {
    this.queue.destroy();
    this.removeFacebookEventHandlers();
    this.removeTwitterEventHandlers();
    window.removeEventListener('load', this.addWidgetListeners);
  }
}


provide('socialWidgetTracker', SocialWidgetTracker);
