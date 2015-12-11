// Imports sub-plugins.
import './custom-media';
import './events';
import './links';
import './session-duration';
import './social';


// Imports dependencies.
import provide from './provide';


class Autotrack {

  /**
   *
   * Requires all sub-plugins via a single plugin.
   * @constructor
   * @param {Object} tracker
   * @param {Object} opts
   */
  constructor(tracker, opts = {}) {
    let name = tracker.get('name');
    ga(`${name}.require`, 'customMediaTracker', opts);
    ga(`${name}.require`, 'eventTracker', opts);
    ga(`${name}.require`, 'outboundLinkTracker', opts);
    ga(`${name}.require`, 'sessionDurationTracker', opts);
    ga(`${name}.require`, 'socialTracker', opts);
  }
}


provide('autotrack', Autotrack);
