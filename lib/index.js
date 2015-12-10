// Imports sub-plugins.
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
   */
  constructor(tracker) {
    let name = tracker.get('name');
    ga(`${name}.require`, 'eventTracker');
    ga(`${name}.require`, 'outboundLinkTracker');
    ga(`${name}.require`, 'sessionDurationTracker');
    ga(`${name}.require`, 'socialTracker');
  }
}


provide('autotrack', Autotrack);
