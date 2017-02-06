/**
 * @fileoverview
 * Externs for the IntersectionObserver and IntersectionObserverEntry
 * globals. These can be removed once they're included in Closure Compiler's
 * default browser externs.
 */

/**
 * These contain the information provided from a change event.
 * @see https://wicg.github.io/IntersectionObserver/#intersection-observer-entry
 * @constructor
 */
function IntersectionObserverEntry() {}

/**
 * The time the change was observed.
 * @see https://wicg.github.io/IntersectionObserver/#dom-intersectionobserverentry-time
 * @type {number}
 * @const
 */
IntersectionObserverEntry.prototype.time;

/**
 * The root intersection rectangle, if target belongs to the same unit of
 * related similar-origin browsing contexts as the intersection root, null
 * otherwise.
 * @see https://wicg.github.io/IntersectionObserver/#dom-intersectionobserverentry-rootbounds
 * @type {{top: number, right: number, bottom: number, left: number,
 *     height: number, width: number}}
 * @const
 */
IntersectionObserverEntry.prototype.rootBounds;

/**
 * The rectangle describing the element being observed.
 * @see https://wicg.github.io/IntersectionObserver/#dom-intersectionobserverentry-boundingclientrect
 * @type {!{top: number, right: number, bottom: number, left: number,
 *     height: number, width: number}}
 * @const
 */
IntersectionObserverEntry.prototype.boundingClientRect;

/**
 * The rectangle describing the intersection between the observed element and
 * the viewport.
 * @see https://wicg.github.io/IntersectionObserver/#dom-intersectionobserverentry-intersectionrect
 * @type {!{top: number, right: number, bottom: number, left: number,
 *     height: number, width: number}}
 * @const
 */
IntersectionObserverEntry.prototype.intersectionRect;

/**
 * Ratio of intersectionRect area to boundingClientRect area.
 * @see https://wicg.github.io/IntersectionObserver/#dom-intersectionobserverentry-intersectionratio
 * @type {!number}
 * @const
 */
IntersectionObserverEntry.prototype.intersectionRatio;

/**
 * The Element whose intersection with the intersection root changed.
 * @see https://wicg.github.io/IntersectionObserver/#dom-intersectionobserverentry-target
 * @type {!Element}
 * @const
 */
IntersectionObserverEntry.prototype.target;

/**
 * Options for the IntersectionObserver.
 * @see https://wicg.github.io/IntersectionObserver/#intersection-observer-init
 * @typedef {{
 *   threshold: (!Array<number>|undefined),
 *   root: (!Element|undefined),
 *   rootMargin: (string|undefined)
 * }}
 */
var IntersectionObserverInit;

/**
 * This is the constructor for Intersection Observer objects.
 * @see https://wicg.github.io/IntersectionObserver/#intersection-observer-interface
 * @param {function(!Array<!IntersectionObserverEntry>)} handler The callback
 *     for the observer.
 * @param {!IntersectionObserverInit=} opt_options The object defining the
 *     thresholds, etc.
 * @constructor
 */
function IntersectionObserver(handler, opt_options) {};

/**
 * The root Element to use for intersection, or null if the observer uses the
 * implicit root.
 * @see https://wicg.github.io/IntersectionObserver/#dom-intersectionobserver-root
 * @type {?Element}
 * @const
 */
IntersectionObserver.prototype.root;

/**
 * Offsets applied to the intersection root’s bounding box, effectively growing
 * or shrinking the box that is used to calculate intersections.
 * @see https://wicg.github.io/IntersectionObserver/#dom-intersectionobserver-rootmargin
 * @type {!string}
 * @const
 */
IntersectionObserver.prototype.rootMargin;

/**
 * A list of thresholds, sorted in increasing numeric order, where each
 * threshold is a ratio of intersection area to bounding box area of an observed
 * target.
 * @see https://wicg.github.io/IntersectionObserver/#dom-intersectionobserver-thresholds
 * @type {!Array.<!number>}
 * @const
 */
IntersectionObserver.prototype.thresholds;

/**
 * This is used to set which element to observe.
 * @see https://wicg.github.io/IntersectionObserver/#dom-intersectionobserver-observe
 * @param {!Element} element The element to observe.
 * @return {undefined}
 */
IntersectionObserver.prototype.observe = function(element) {};

/**
 * This is used to stop observing a given element.
 * @see https://wicg.github.io/IntersectionObserver/#dom-intersectionobserver-unobserve
 * @param {!Element} element The elmenent to stop observing.
 * @return {undefined}
 */
IntersectionObserver.prototype.unobserve = function(element) {};

/**
 * Disconnect.
 * @see https://wicg.github.io/IntersectionObserver/#dom-intersectionobserver-disconnect
 */
IntersectionObserver.prototype.disconnect = function() {};

/**
 * Take records.
 * @see https://wicg.github.io/IntersectionObserver/#dom-intersectionobserver-takerecords
 * @return {!Array.<!IntersectionObserverEntry>}
 */
IntersectionObserver.prototype.takeRecords = function() {};
