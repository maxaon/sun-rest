(function (angular) {
  'use strict';
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

  /**
   * @name sun.rest
   */
  var module = angular.module('sun.rest', [
    'sun.rest.config',
    'sun.rest.model',
    'sun.rest.router'
  ]);
  module.factory('RestRepository', function ($q, $http, RestConfig, ModelFactory, Router)
    /**
     * @name RestRepository
     * @param RestConfig
     * @param {ModelFactory} ModelFactory
     * @returns {Function}
     * @constructor
     * @param $http
     * @param Router
     */ {
      var RestResource = function (schema) {
        this.schema = schema;
        this.router = new Router(schema.route);
        this.model = ModelFactory(schema);

      };
      RestResource.prototype.find = function (params, postData) {
        params = params || {};
        var Model = this.model;
        var method = postData ? 'POST' : 'GET';
        var isArray = true;
        if (!_.isObject(params) && angular.isDefined(params)) {
          var objid = params;
          params = {};
          params[this.schema.routeIdProperty] = objid;
        }
        if (_.isObject(params) && this.schema.routeIdProperty in params) {
          isArray = false;
        }

        var dataLocation = (isArray === true ? this.schema.dataListLocation : this.schema.dataItemLocation);

        var value = isArray ? [] : (new Model());
        var httpConfig = {method: method, data: postData};
        this.router.buildConfig(httpConfig, params);

        //noinspection UnnecessaryLocalVariableJS
        var promise = $http(httpConfig)
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
                value.mngr.populate(extracted);//shallowClearAndCopy(data, value);
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
      var Schema = function (properties) {
        angular.extend(this, {
          name            : name,
          route           : null,
          idProperty      : RestConfig.getModelIdProperty(),
          routeIdProperty : null,
          properties      : {},
          relations       : {},
          dataListLocation: RestConfig.getResponseDataLocation(),
          dataItemLocation: RestConfig.getResponseDataLocation(),
          autoParse       : true,
          requestFormatter: RestConfig.getRequestFormatter(),
          isArray         : RestConfig.getIsArray(),
          flattenItemRoute: RestConfig.getFlattenItemRoute(),
          modal           : {},
          inherit         : null,
          paramDefaults   : {}
        }, properties);
        if (!this.routeIdProperty) {
          var keys = this.route.match(/:\w[\w0-9-_]*/g);
          this.routeIdProperty = keys[keys.length - 1].slice(1);
        }
      };

      return  {
        resources: {},
        create   : function (name, schema) {
          if (!schema) {
            if (!_.isObject(name)) {
              throw new Error("Wrong repository call format");
            }
            schema = name;
          }
          name = schema[name];
          schema = new Schema(schema);
          this.resources[name] = new RestResource(schema);
          return this.resources[name];
        },
        get      : function (name) {
          return this.resources[name];
        }
      };

    }
  )
  ;


}(angular));