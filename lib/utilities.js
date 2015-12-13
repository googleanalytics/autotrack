module.exports = {

  /**
   * Accepts a function and returns a wrapped version of the function that is
   * expected to be called elsewhere in the system. If it's not called
   * elsewhere after the timeout period, it's called regardless. The wrapper
   * function also prevents the callback from being called more than once.
   * @param {Function} callback The function to call.
   * @param {number} wait How many milliseconds to wait before invoking
   *     the callback.
   */
  withTimeout: function(callback, wait) {
    var called = false;
    setTimeout(callback, wait || 2000);
    return function() {
      if (!called) {
        called = true;
        callback();
      }
    };
  },


  /**
   * Accepts an object of overrides and defaults and returns a new object
   * with the values merged. For each key in defaults, if there's a
   * corresponding value in overrides, it gets used.
   * @param {Object} overrides.
   * @param {?Object} defaults.
   */
  defaults: function(overrides, defaults) {
    var result = {};

    if (typeof overrides != 'object') {
      overrides = {};
    }

    if (typeof defaults != 'object') {
      defaults = {};
    }

    for (var key in defaults) {
      if (defaults.hasOwnProperty(key)) {
        result[key] = overrides.hasOwnProperty(key) ?
            overridees[key] : defaults[key];
      }
    }
    return result;
  }
};
