(function (angular) {
  'use strict';

  /**
   * @name sun.rest
   */
  var module = angular.module('sun.rest', [
    'sun.utils',
    'sun.rest.config',
    'sun.rest.model',
    'sun.rest.router'
  ]);

  module.factory('RestRepository',
    /**
     * @name RestRepository
     * @param RestConfig
     * @param {modelFactory} modelFactory
     * @returns {Function}
     * @constructor
     * @param $http
     * @param Router
     * @param $q
     * @param sunUtils
     */
      function ($q, $http, sunUtils, RestConfig, modelFactory, Router) {
      var RestResource = function (schema) {
        this.schema = schema;
        this.router = new Router(schema.route);
        this.model = modelFactory(schema);

      };
      RestResource.prototype.find = function (params, postData) {
        var promise,
          id,
          httpConfig,
          value,
          dataLocation,
          Model = this.model,
          method = postData ? 'POST' : 'GET',
          isArray = true;
        params = params || {};
        if (!_.isObject(params) && angular.isDefined(params)) {
          id = params;
          params = {};
          params[this.schema.routeIdProperty] = id;
        }
        if (_.isObject(params) && (params[this.schema.routeIdProperty])) {
          isArray = false;
        }

        dataLocation = (isArray === true ? this.schema.dataListLocation : this.schema.dataItemLocation);

        value = isArray ? [] : (new Model());
        httpConfig = {method: method, data: postData};
        this.router.buildConfig(httpConfig, params);

        //noinspection UnnecessaryLocalVariableJS
        promise = $http(httpConfig)
          .then(function (response) {
            var extracted,
              data = response.data,
              promise = value.$promise;

            if (data) {
              extracted = sunUtils.stringJsonParser(dataLocation, data);
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


            return $q.reject(response);
          });

        value.$promise = promise;
        value.$resolved = false;

        return value;


      };
      /**
       * @name Schema
       */
      function Schema(properties) {
        angular.extend(this, {
          name            : null,
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
      }

      return {
        resources: {},
        create   : function (name, schema) {
          if (!schema) {
            if (!_.isObject(name)) {
              throw new Error('Wrong repository call format');
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

    });
}(angular));