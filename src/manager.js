/**
 * Created by maxaon on 14.01.14.
 */
(function (angular) {
  function stringJsonParser(stringPath, object) {
    var returnValue = object;

    if (stringPath.length > 0) {
      returnValue = object;
      var parts = stringPath.split('.');

      for (var x = 0; x < parts.length; x += 1) {
        returnValue = _.isObject(returnValue) ? returnValue[parts[x]] : undefined;
      }
    }

    return returnValue;
  }

  'use strict';
  /**
   * @name sun.rest.manager
   */
  angular.module('sun.rest.manager', [
      'sun.rest.config',
      'sun.rest.router'
    ])
    .factory('ModelManager', function ($http, $q, RestConfig, Router)
    /**
     * @param $http
     * @param $q
     * @param RestConfig
     * @param Router
     * @returns {ModelManager}
     */ {
      //region Dotted path
      var MEMBER_NAME_REGEX = /^(\.[a-zA-Z_$][0-9a-zA-Z_$]*)+$/;

      function isValidDottedPath(path) {
        return (path != null && path !== '' && path !== 'hasOwnProperty' &&
          MEMBER_NAME_REGEX.test('.' + path));
      }

      function lookupDottedPath(obj, path) {
        if (!isValidDottedPath(path)) {
          throw new Error('Dotted member path "@{' + path + '}" is invalid.');
        }
        var keys = path.split('.');
        for (var i = 0, ii = keys.length; i < ii && obj !== undefined; i++) {
          var key = keys[i];
          obj = (obj !== null) ? obj[key] : undefined;
        }
        return obj;
      }

      //endregion
      /**
       * @name ModelManager
       * @param {object} schema Schema of the model
       * @constructor
       */
      var ModelManager = function (schema, model) {
        this.schema = schema;
        this.remoteFlag = false;
        this.model = model;

        this.originalData = {};
        this.deleteFlag = false;
        this.route = new Router(schema.route);
      };
      ModelManager.prototype.NEW = 'new';
      ModelManager.prototype.DELETED = 'deleted';
      ModelManager.prototype.DIRTY = 'dirty';
      ModelManager.prototype.LOADED = 'loaded';

      ModelManager.prototype.populate = function (data) {
        angular.forEach(data, function (value, key) {
          this['__' + key] = value;
        }, this.model);
        this.remoteFlag = true;
        this.originalData = data;
      };
      ModelManager.prototype.reset = function () {
        throw new Error('Not implemented');
      };
      ModelManager.prototype.toJSON = function () {
        var returnData = {};
        _.forEach(this.schema.properties, function (value, key) {
          returnData[key] = this.model['_' + key];
        }, this);
        return returnData;
      };
      ModelManager.prototype.NORMALIZE_INCOMING = "incomint";
      ModelManager.prototype.NORMALIZE_OUTGOING = "outgoing";
      ModelManager.prototype.normalizeData = function (data, way) {
        var normalizedData = {};
        var isOutgoing = (way === this.NORMALIZE_OUTGOING);

        _.forEach(this.schema.properties, function (prop, name) {
          var remoteProperty = (!_.isUndefined(prop.remoteProperty) && !_.isNull(prop.remoteProperty) ? prop.remoteProperty : name);
          var normalizedKey = (isOutgoing ? remoteProperty : name);
          var noneNormalizedKey = (isOutgoing ? name : remoteProperty);

          normalizedData[normalizedKey] = data[noneNormalizedKey] || data[name];
        });

        return normalizedData;
      };


      ModelManager.prototype.extractParams = function (data, actionParams) {
        var ids = {};
        actionParams = angular.extend({}, this.schema.paramDefaults, actionParams);
        angular.forEach(actionParams, function (value, key) {
          if (isFunction(value)) {
            value = value();
          }
          ids[key] = value && value.charAt && value.charAt(0) == '@' ?
            lookupDottedPath(data, value.substr(1)) : value;
        });
        return ids;
      };


      ModelManager.prototype.save = function (params, modifyLocal) {
        var isNew = this.state === this.NEW,
          method = isNew ? "POST" : RestConfig.getUpdateMethod();
        params = angular.extend({}, this.schema.paramDefaults[isNew ? 'create' : 'update'], params);
        var promise = this.simpleReques(method, params, this.model, this.schema.dataItemLocation);
        var model = this.model;
        if (modifyLocal !== false) {
          promise = promise.then(function (obj) {
            model.mngr.populate(obj);
            return obj;
          });
        }
        return promise;
      }
      ModelManager.prototype.delete = function (params) {
        params = angular.extend({}, this.schema.paramDefaults.deleta, params);
        return this.simpleReques("DELETE", params);
      };
      ModelManager.prototype.objectRequest = function (method, isArray, params, data) {
        var Model = this.modelClass;
        var dataLocation = (isArray === true ? this.schema.dataListLocation : this.schema.dataItemLocation);

        var value = isArray ? [] : (new Model(data));

        var promise = this.simpleReques(method, params, data)
          .then(function (response) {
            var data = response.data,
              promise = value.$promise;

            if (data) {
              var extracted = stringJsonParser(dataLocation, data);
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

//          (error || noop)(response);

            return $q.reject(response);
          });

        value.$promise = promise;
        value.$resolved = false;

        return value;

      };

      ModelManager.prototype.simpleReques = function (method, params, data, path) {
        var hasBody = (['POST', 'PUT', 'PATCH'].indexOf(method.toUpperCase()) > -1);
        var httpConfig = {method: method};
//        var url = this.schema.route;
        if (hasBody) httpConfig.data = data;
        params = params || {};
        if (data)
          params[this.schema.idProperty] = data[this.schema.idProperty];

        this.route.buildConfig(httpConfig,
          angular.extend({}, this.extractParams(data), params));

        if (params.data) {
          params.data = this.normalizeData(params.data, this.NORMALIZE_OUTGOING);
        }
        var promise = $http(httpConfig);
        if (angular.isDefined(path)) {
          promise = promise.then(function (response) {
            return stringJsonParser(path, response.data);

          });
        }
        return promise;

      };


      Object.defineProperties(ModelManager.prototype, {
        state: {
          get: function () {
            if (this.remoteFlag === false) {
              return this.NEW;
            }
            else if (this.deleteFlag === true) {
              return this.DELETED;
            }
            // TODO: Add loaded and dirty check
            else if (this.remoteFlag === true) {
              return this.LOADED;
            }
            else {
              return this.DIRTY;
            }
          }
        },

        isRemote: {
          get: function () {
            return (this.remoteFlag && !this.deleteFlag);
          }
        }

      });

      return ModelManager;
    });

}(angular));