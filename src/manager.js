/**
 * Created by maxaon on 14.01.14.
 */
(function (angular) {
  'use strict';
  /**
   * @name sun.rest.manager
   */
  var module = angular.module('sun.rest.manager', [
    'sun.utils',
    'sun.rest.config',
    'sun.rest.router'
  ]);
  module.factory('ModelManager', function ($http, $q, sunUtils, RestConfig, Router) {
    //region Dotted path
    var MEMBER_NAME_REGEX = /^(\.[a-zA-Z_$][0-9a-zA-Z_$]*)+$/;

    function isValidDottedPath(path) {
      return (path !== null && path !== '' && path !== 'hasOwnProperty' &&
        MEMBER_NAME_REGEX.test('.' + path));
    }

    function lookupDottedPath(obj, path) {
      if (!isValidDottedPath(path)) {
        throw new Error('Dotted member path "@{' + path + '}" is invalid.');
      }
      var i, ii, key,
        keys = path.split('.');
      for (i = 0, ii = keys.length; i < ii && obj !== undefined; i++) {
        key = keys[i];
        obj = (obj !== null) ? obj[key] : undefined;
      }
      return obj;
    }

    //endregion
    /**
     * @name ModelManager
     * @param {Schema} schema Schema of the model
     * @param model
     * @param modelClass
     * @constructor
     */
    function ModelManager(model, schema, modelClass) {
      if (schema) {
        this.schema = schema;
      }
      if (modelClass) {
        this.modelClass = modelClass;
      }
      this.remoteFlag = false;
      this.modifyFlag = false;
      this.model = model;

      this.originalData = {};
      this.changedProperties = {};
      this.deleteFlag = false;
      this.route = new Router(this.schema.route);
    }

    ModelManager.prototype.NEW = 'new';
    ModelManager.prototype.DELETED = 'deleted';
    ModelManager.prototype.DIRTY = 'dirty';
    ModelManager.prototype.LOADED = 'loaded';

    //noinspection JSUnusedGlobalSymbols
    ModelManager.prototype.NORMALIZE_INCOMING = 'incoming';
    ModelManager.prototype.NORMALIZE_OUTGOING = 'outgoing';

    ModelManager.prototype.populate = function (data) {
      angular.forEach(data, function (value, key) {
        this['__' + key] = value;
      }, this.model);
      this.remoteFlag = true;
      this.modifyFlag = false;
      this.changedProperties = {};
      this.originalData = data;
    };
    ModelManager.prototype.reset = function () {
      var saveRemoteFlag = this.remoteFlag;
      this.populate(this.originalData);
      this.remoteFlag = saveRemoteFlag;
    };
    ModelManager.prototype.toJSON = function () {
      var returnData = {};
      _.forEach(this.schema.properties, function (value, key) {
        returnData[key] = this.model['_' + key];
      }, this);
      return returnData;
    };
    ModelManager.prototype.normalizeData = function (data, way) {
      var normalizedData = {},
        isOutgoing = (way === this.NORMALIZE_OUTGOING);

      _.forEach(this.schema.properties, function (prop, name) {
        var remoteProperty = (!_.isUndefined(prop.remoteProperty) && !_.isNull(prop.remoteProperty) ? prop.remoteProperty : name),
          normalizedKey = (isOutgoing ? remoteProperty : name),
          noneNormalizedKey = (isOutgoing ? name : remoteProperty);

        normalizedData[normalizedKey] = data[noneNormalizedKey] || data[name];
      });

      return normalizedData;
    };
    ModelManager.prototype.extractParams = function (data, actionParams) {
      var ids = {};
      actionParams = angular.extend({}, this.schema.paramDefaults, actionParams);
      angular.forEach(actionParams, function (value, key) {
        if (angular.isFunction(value)) {
          value = value();
        }
        ids[key] = value &&
          value.charAt &&
          value.charAt(0) === '@' ? lookupDottedPath(data, value.substr(1)) : value;
      });
      return ids;
    };
    ModelManager.prototype.save = function (params, modifyLocal) {
      var model, promise,
        isNew = (this.state === this.NEW),
        method = isNew ? 'POST' : RestConfig.updateMethod;
      params = angular.extend({}, this.schema.paramDefaults[isNew ? 'create' : 'update'], params);

      promise = this.simpleRequest(method, params, this.model, this.schema.dataItemLocation);
      model = this.model;
      if (modifyLocal !== false) {
        promise = promise.then(function (obj) {
          model.mngr.populate(obj);
          return obj;
        });
      }
      return promise;
    };
    ModelManager.prototype.remove = function (params) {
      params = angular.extend({}, this.schema.paramDefaults.remove, params);
      return this.simpleRequest('DELETE', params);
    };
    ModelManager.prototype.objectRequest = function (method, isArray, params, data) {
      var promise,
        Model = this.modelClass,
        dataLocation = (isArray === true ? this.schema.dataListLocation : this.schema.dataItemLocation),
        value = isArray ? [] : (new Model(data));

      promise = this.simpleRequest(method, params, data)
        .then(function (response) {
          var data, promise, extracted;
          data = response.data;
          promise = value.$promise;

          if (data) {
            extracted = sunUtils.stringJsonParser(dataLocation, data);
            if (isArray) {
              value.length = 0;
              angular.forEach(extracted, function (item) {
                value.push(new Model(item));
              });
            } else {
              value.populate(extracted);//shallowClearAndCopy(data, value);
              value.$promise = promise;
            }
          }

          value.$resolved = true;

          response.resource = value;

          return response;
        }, function (response) {
          value.$resolved = true;

          return $q.reject(response);
        });

      value.$promise = promise;
      value.$resolved = false;

      return value;

    };
    ModelManager.prototype.simpleRequest = function (method, params, data, path) {
      var promise,
        hasBody = (['POST', 'PUT', 'PATCH'].indexOf(method.toUpperCase()) > -1),
        httpConfig = {method: method};
//        var url = this.schema.route;
      if (hasBody) {
        httpConfig.data = data;
      }
      params = params || {};
      if (data) {
        params[this.schema.idProperty] = data[this.schema.idProperty];
      }

      this.route.buildConfig(httpConfig,
        angular.extend({}, this.extractParams(data), params));

      if (params.data) {
        params.data = this.normalizeData(params.data, this.NORMALIZE_OUTGOING);
      }
      promise = $http(httpConfig);
      if (angular.isDefined(path)) {
        promise = promise.then(function (response) {
          return sunUtils.stringJsonParser(path, response.data);

        });
      }
      return promise;

    };
    Object.defineProperties(ModelManager.prototype, {
      state: {
        get: function () {
          /*jslint white:true*/
          var state;

          if (!this.remoteFlag) {
            state = this.NEW;
          }
          else if (this.deleteFlag) {
            state = this.DELETED;
          }
          else if (this.modifyFlag) {
            state = this.DIRTY;
          }
          else {
            state = this.LOADED;
          }
          return state;
        }
      },

      isRemote: {
        get: function () {
          return (this.remoteFlag && !this.deleteFlag);
        }
      }

    });

    ModelManager.create = function (schema, model, overrides) {
      var child;
      if (_.isFunction(overrides)) {
        child = overrides;
      } else {
        child = function () {
          this.$super.constructor.apply(this, arguments);
        };
        if (_.isObject(overrides)) {
          child.prototype = overrides;
        }
      }
      sunUtils.inherit(child, ModelManager);
      child.prototype.schema = schema;
      child.prototype.modelClass = model;
      return child;
    };

    return ModelManager;
  });
}(angular));