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
        property = {
          enumerable: true
        };
      if (Model.prototype[prop_name]) {
        customGetter = customSetter = customProperty = true;
      } else {
        customGetter = !!prop.getter;
        customSetter = !!prop.setter;
      }
      modelProperties['_' + prop_name] = {
        get: function () {
          return this['__' + prop_name];
        },
        set: function (value) {
          if (value !== this['__' + prop_name] && !this.mngr.populating) {
            if (value === this.mngr.originalData[prop_name]) {
              delete this.mngr.changedProperties[prop_name];
              this.mngr.modifyFlag = Object.keys(this.mngr.changedProperties).length > 0;
            } else {
              this.mngr.changedProperties[prop_name] = true;
              this.mngr.modifyFlag = true;
            }
          }
          Object.defineProperty(this, '__' + prop_name, {
            enumerable: false, value: value, configurable: true
          });
//          this['__' + prop_name] = value;
        }
      };
      if (customProperty) {
        return;
      }
      if (prop.getter !== null) {
        if (customGetter) {
          property.get = function () {
            return schema.properties[prop_name].getter.call(this, this['_' + prop_name]);
          };
        } else {
          property.get = function () {
            return this['_' + prop_name];
          };
        }
      }
      if (prop.setter !== null) {
        if (customSetter) {
          property.set = function (value) {
            var res = schema.properties[prop_name].setter.call(this, value);
            if (res !== undefined) {
              this['_' + prop_name] = res;
            }
          };
        } else {
          property.set = function (value) {
            this['_' + prop_name] = value;
          };
        }
      }
      if (property.set || property.get) {
        modelProperties[prop_name] = property;
      }
    });
    Object.defineProperties(Model.prototype, modelProperties);

    Model.mngrClass = sunRestModelManager.create(schema, Model, Model.mngr);

    return Model;
  }


  return sunRestModelFactory;
});