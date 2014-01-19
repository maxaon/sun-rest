/**
 * Created by maxaon on 14.01.14.
 */
(function (angular) {
  'use strict';

  /**
   * @name sun.rest.model
   *
   */
  angular.module('sun.rest.model', [ 'sun.rest.manager', 'sun.utils' ])
    .factory('modelFactory', function (sunUtils, ModelManager) {

      var BaseModel = function (data) {
        this.mngr = new this.constructor.mngrClass(this);
        if (!_.isEmpty(data)) {
          this.mngr.populate(data);
        }
      };
      BaseModel.prototype.constructor = BaseModel;
      BaseModel.prototype.toJSON = function () {
        return this.mngr.toJSON();
      };
      BaseModel.get = function (id, params) {
        var keys = this.mngr.schema.route.match(/:\w[\w0-9-_]*/g);
        params = params || {};
        params[keys[keys.length - 1]] = id;
        return this.mngr.objectRequest('GET', false, params);
      };
      BaseModel.query = function (params) {
        return this.mngr.objectRequest('GET', true, params);
      };
      BaseModel.fetch = BaseModel.query;


      function DefaultChild(data) {
        //noinspection JSLint,JSUnresolvedVariable
        this.$super.constructor.call(this, data);
      }

      /**
       * Name modelFactory
       * @param schema
       * @returns {*}
       * @constructor
       */
      function modelFactory(schema) {
        var Model, modelProperties = {};

        Model = sunUtils.inherit(schema.inherit || DefaultChild, BaseModel);
        _.forEach(schema.properties, function (value, key) {
          var customSetter = false, customGetter = false, customProperty = false,
            defaultGetMethod, defaultSetMethod;
          if (Model.prototype[key]) {
            customGetter = customSetter = customProperty = true;
          } else {
            customGetter = !!schema.properties[key].getter;
            customSetter = !!schema.properties[key].setter;
          }
          modelProperties['_' + key] = {
            get: function () {
              return this['__' + key];
            },
            set: function (value) {
              if (value !== this['__' + key]) {
                if (value === this.mngr.originalData[key]) {
                  delete this.mngr.changedProperties[key];
                  this.mngr.modifyFlag = Object.keys(this.mngr.changedProperties).length > 0;
                } else {
                  this.mngr.changedProperties[key] = true;
                  this.mngr.modifyFlag = true;
                }
              }
              this['__' + key] = value;
            }
          };
          if (customProperty) {
            return;
          }

          if (customGetter) {
            defaultGetMethod = function () {
              return schema.properties[key].getter.call(this, this['_' + key]);
            };
          } else {
            defaultGetMethod = function () {
              return this['_' + key];
            };
          }
          if (customSetter) {
            defaultSetMethod = function (value) {
              this['_' + key] = schema.properties[key].setter.call(this, value);
            };
          } else {
            defaultSetMethod = function (value) {
              this['_' + key] = value;
            };
          }

          modelProperties[key] = {
            get: defaultGetMethod,
            set: defaultSetMethod
          };
        });
        Object.defineProperties(Model.prototype, modelProperties);

        Model.mngrClass = ModelManager.create(schema, Model, Model.mngr);

        return Model;
      }

      modelFactory.BaseModel = BaseModel;

      return modelFactory;
    });

}(angular));