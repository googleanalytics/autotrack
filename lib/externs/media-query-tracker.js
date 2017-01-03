/**
 * Public properties for a MediaQueryDefinition item object.
 * @typedef {{
 *   name: (string|undefined),
 *   media: (string|undefined),
 * }}
 */
let MediaQueryDefinitionItem;


/**
 * Public properties for a MediaQueryTracker definitions object.
 * @typedef {{
 *   name: (string|undefined),
 *   dimensionIndex: (number|undefined),
 *   items: (!Array<MediaQueryDefinitionItem>),
 * }}
 */
let MediaQueryDefinition;



/**
 * Public options for the MediaQueryTracker.
 * @typedef {{
 *   definitions: (Array<MediaQueryDefinition>|undefined),
 *   changeTemplate: (!Function),
 *   changeTimeout: (number),
 *   fieldsObj: (!FieldsObj),
 *   hitFilter: (Function|undefined),
 * }}
 */
let MediaQueryTrackerOpts;


/**
 * @interface
 */
class MediaQueryTrackerPublicInterface {
  remove() {}
}
