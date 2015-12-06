export default {

  /**
   * Detects support for `navigator.sendBeach`.
   * @return {boolean}
   */
  beacon: function() {
    return !!navigator.sendBeacon;
  }

}
