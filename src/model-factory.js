'use strict';
/* global sunRest */
sunRest.factory('sunRestModelFactory', function (sunUtils, sunRestBaseModel, sunRestModelManager) {

  /**
   * Name sunRestModelFactory
   * @param schema
   * @returns {*}
   * @constructor
   */
  function sunRestModelFactory(schema) {
    var Model, modelProperties = {};


    Model = sunUtils.inherit(schema.inherit || {}, sunRestBaseModel);
    _.forEach(schema.properties, function (prop, prop_name) {
      var customSetter = false,
        customGetter = false,
        customProperty = false,
        defaultGetMethod,
        defaultSetMethod;
      if (Model.prototype[prop_name]) {
        customGetter = customSetter = customProperty = true;
      } else {
        customGetter = !!schema.properties[prop_name].getter;
        customSetter = !!schema.properties[prop_name].setter;
      }
      modelProperties['_' + prop_name] = {
        get: function () {
          return this['__' + prop_name];
        },
        set: function (value) {
          if (value != this['__' + prop_name] && !this.mngr.populating) {
            if (value == this.mngr.originalData[prop_name]) {
              delete this.mngr.changedProperties[prop_name];
              this.mngr.modifyFlag = Object.keys(this.mngr.changedProperties).length > 0;
            } else {
              this.mngr.changedProperties[prop_name] = true;
              this.mngr.modifyFlag = true;
            }
          }
          this['__' + prop_name] = value;
        }
      };
      if (customProperty) {
        return;
      }

      if (customGetter) {
        defaultGetMethod = function () {
          return schema.properties[prop_name].getter.call(this, this['_' + prop_name]);
        };
      } else {
        defaultGetMethod = function () {
          return this['_' + prop_name];
        };
      }
      if (customSetter) {
        defaultSetMethod = function (value) {
          var res = schema.properties[prop_name].setter.call(this, value);
          if (res !== undefined) {
            this['_' + prop_name] = res;
          }
        };
      } else {
        defaultSetMethod = function (value) {
          this['_' + prop_name] = value;
        };
      }

      modelProperties[prop_name] = {
        get: defaultGetMethod,
        set: defaultSetMethod
      };
    });
    Object.defineProperties(Model.prototype, modelProperties);

    Model.mngrClass = sunRestModelManager.create(schema, Model, Model.mngr);

    return Model;
  }


  return sunRestModelFactory;
});