// Imports sub-plugins.
import './events';
import './links';


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
    var name = tracker.get('name');
    ga(`${name}.require`, 'eventTracker');
    ga(`${name}.require`, 'outboundLinkTracker');
  }
}


provide('autotrack', Autotrack);
