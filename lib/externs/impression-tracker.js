/**
 * Public item properties for the ImpressionTracker elements array.
 * @typedef {{
 *   id: (string|undefined),
 *   threshold: (number|undefined),
 *   trackFirstImpressionOnly: (boolean|undefined),
 * }}
 */
let ImpressionTrackerElementsItem;


/**
 * Public options for the ImpressionTracker.
 * @typedef {{
 *   elements: (Array<!ImpressionTrackerElementsItem|string>|undefined),
 *   rootMargin: (string),
 *   attributePrefix: (string),
 *   fieldsObj: (!FieldsObj),
 *   hitFilter: (Function|undefined),
 * }}
 */
let ImpressionTrackerOpts;


/**
 * @interface
 */
class ImpressionTrackerPublicInterface {
  /**
   * @param {Array<!ImpressionTrackerElementsItem|string>} elements
   */
  observeElements(elements) {}
  /**
   * @param {Array<!ImpressionTrackerElementsItem|string>} elements
   */
  unobserveElements(elements) {}
  unobserveAllElements() {}
  remove() {}
}
