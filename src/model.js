'use strict';
/* global sunRest */
sunRest.factory('sunRestBaseModel', function () {

  /**
   * @ngdoc object
   * @class
   * @name sunRest.sunRestBaseModel
   * @property {string} ppp
   * @typedef {object} sunRestBaseModel
   */
  var BaseModel = function (data) {
    // Manager can not be properly copied by `angular.copy`
    Object.defineProperty(this, 'mngr', {
      value     : new this.constructor.mngrClass(this),
      enumerable: false
    });
//    this._setDefaults(data);
    if (!_.isEmpty(data)) {
      this.mngr.populate(data);
    }
  };

  BaseModel.prototype.constructor = BaseModel;
  BaseModel.prototype.toJSON = function () {
    return this.mngr.toJSON();
  };
  BaseModel.prototype._setDefaults = function (data) {
    this.mngr.populating = true;
    _.forEach(this.mngr.schema.properties, function (prop, prop_name) {
      var default_value = prop['default'];
      if (default_value !== undefined && (data === undefined || prop_name in data)) {
        if (angular.isFunction(default_value)) {
          default_value = new default_value();
        }
        this[prop_name] = default_value;
      }
    }, this);
    this.mngr.populating = false;
  };

  return BaseModel;
});



