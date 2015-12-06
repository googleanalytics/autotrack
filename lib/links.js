import delegate from 'delegate';
import supports from './supports';


// export default class OutBoundLinkTracker {

//   constructor(tracker, opts) {

//     this.tracker_ = tracker;
//     this.opts_ = opts;

//     // Use the beacon transport mechanism if available.
//     this.tracker_.set('transport', 'beacon');

//     delegate(document, 'a', 'click', this.handleLinkClicks.bind(this));
//   }


//   handleLinkClicks(event) {
//     // TODO(philipwalton): ignore outbound links with data attributes.

//     let link = event.delegateTarget;
//     if (link.hostname != location.hostname) {
//       // Open outbound links in a new tab if the browser doesn't support
//       // the beacon transport method.
//       if (!supports.beacon()) {
//         link.target = '_blank';
//       }
//       this.tracker_.send('event', 'Outbound Link', 'click', link.href);
//     }
//   }

// }

export default function(tracker, opts) {

  // Use the beacon transport mechanism if available.
  tracker.set('transport', 'beacon');

  delegate(document, 'a', 'click', function(event) {

    // TODO(philipwalton): ignore outbound links with data attributes.

    let link = event.delegateTarget;
    if (link.hostname != location.hostname) {
      // Open outbound links in a new tab if the browser doesn't support
      // the beacon transport method.
      if (!supports.beacon()) {
        link.target = '_blank';
      }
      tracker.send('event', 'Outbound Link', 'click', link.href);
    }
  });

}
