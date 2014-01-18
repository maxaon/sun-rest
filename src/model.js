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
        this.mngr.model = this;
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
        this.super.constructor.call(this, data);
      }

      /**
       * Name modelFactory
       * @param schema
       * @returns {*}
       * @constructor
       */
      function modelFactory(schema) {
        var Model, modelProperties = {}, mngr;

        Model = sunUtils.inherit(schema.inherit || DefaultChild, BaseModel);
        _.forEach(schema.properties, function (value, key) {
          modelProperties['_' + key] = {
            get: function () {
              return this['__' + key];
            },
            set: function (value) {
              this['__' + key] = value;
            }
          };
          if (key in Model.prototype) {
            return;
          }
          var defaultGetMethod, defaultSetMethod;
          defaultGetMethod = function () {
            var value = !_.isUndefined(this['_' + key]) ? this['_' + key] : undefined;

            //see if we need to apply any custom getter logic
            if (schema.properties[key].getter) {
              value = schema.properties[key].getter.apply(this, [value]);
            }

            return value;
          };
          defaultSetMethod = function (value) {
            //see if we need to apply any custom setter logic
            if (schema.properties[key].setter) {
              value = schema.properties[key].setter.apply(this, [value]);
            }

            this['_' + key] = value;
          };

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
    })

}(angular));