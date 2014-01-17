/**
 * Created by maxaon on 14.01.14.
 */
(function (angular) {
  'use strict';

  /**
   * @name sun.rest.model
   *
   */
  angular.module('sun.rest.model', [
      'sun.rest.manager'
    ])
    .factory("ModelFactory", function (ModelManager)
    /**
     * @param {ModelManager} ModelManager
     */ {
      function inherit(child, parent) {
        if (!child) {
          child = function (data) {
            child.super.constructor.call(this, data);
          };
        }
        var F = function () {
        };
        F.prototype = parent.prototype;


        child.prototype = new F();
        child.prototype.constructor = child;
        child.prototype.super = parent.prototype;
        for (var prop in parent)
          child[prop] = parent[prop];
        return child;
      }

      var BaseModel = function (data) {
        this.mngr = new ModelManager(this.schema, this.constructor);
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
        return this.mngr.objectRequest("GET", false, params);
      };
      BaseModel.query = function (params) {
        return this.mngr.objectRequest("GET", true, params);
      };
      BaseModel.fetch = BaseModel.query;


      /**
       * Name ModelFactory
       * @param schema
       * @returns {*}
       * @constructor
       */
      function ModelFactory(schema) {
        var Model, modelProperties = {}, mngr;
        Model = inherit(schema.inherit, BaseModel);


        _.forEach(schema.properties, function (value, key) {
          modelProperties["_" + key] = {
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
        Model.prototype.schema = schema;

        mngr = new ModelManager(schema, Model);
        if ('mngr' in Model) {
          for (var prop in Model.mngr) {
            //noinspection JSUnfilteredForInLoop
            mngr[prop] = Model.mngr[prop];
          }
        }
        Model.mngr = mngr;
        return Model;
      }

      ModelFactory.BaseModel = BaseModel;

      return ModelFactory;
    })

}(angular));