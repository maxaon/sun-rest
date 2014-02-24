(function (angular) {
  'use strict';
  /**
   * @name sun.utils
   */
  angular.module('sun.utils', [])
    .service('sunUtils', function sunUtils() {
      this.copyProperties = function (from, to, exclude) {
        var i, props, prop, description;
        exclude = exclude || [];
        props = Object.getOwnPropertyNames(from);
        for (i = 0; i < props.length; i++) {
          prop = props[i];
          description = Object.getOwnPropertyDescriptor(from, prop);
          if (exclude.indexOf(prop) === -1) {
            Object.defineProperty(to, prop, description);
          }
        }
      };

      this.inherit = function (Child, Parent) {
        var F, f;
        F = function () {
        };
        F.prototype = Parent.prototype;
        f = new F();
        this.copyProperties(Child.prototype, f, ['constructor']);
        Child.prototype = f;
        Child.prototype.constructor = Child;
        Child.prototype.$super = Parent.prototype;
        return Child;
      };

      this.stringJsonParser = function (stringPath, object) {
        var parts, x,
          returnValue = object;

        if (stringPath.length > 0) {
          returnValue = object;
          parts = stringPath.split('.');

          for (x = 0; x < parts.length; x += 1) {
            returnValue = _.isObject(returnValue) ? returnValue[parts[x]] : undefined;
          }
        }

        return returnValue;
      };
    });
}(angular));