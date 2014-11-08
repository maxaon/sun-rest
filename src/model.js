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
    if (!this.schema) {
      throw new Error("Model must be created through ModelFactory");
    }
    // Manager can not be properly copied by `angular.copy`
    Object.defineProperty(this, 'mngr', {
      value: new this.mngrClass(this),
      enumerable: false
    });
    this.mngr.setDefaults()

    if (!_.isEmpty(data)) {
      _.extend(this, data);
    }
  };

  BaseModel.prototype.constructor = BaseModel;
  BaseModel.prototype.mngrClass = undefined;

  BaseModel.prototype.toJSON = function () {
    return this.mngr.toJSON();
  };

  return BaseModel;
});



