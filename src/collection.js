'use strict';
/* global sunRest */
sunRest.factory('sunRestCollection', function ($q, $http, sunUtils, sunRestConfig, sunRestModelFactory, sunRestRouter) {
  var sunRestCollection = function (schema) {
    this.schema = schema;
    this.router = new sunRestRouter(schema.route);
    this.model = sunRestModelFactory(schema);

  };
  sunRestCollection.prototype.find = function (params, postData, options) {
    var promise,
      id,
      httpConfig,
      value,
      dataLocation,
      Model = this.model,
      method = postData ? 'POST' : 'GET',
      isArray = true;
    params = params || {};
    options = options || {};
    if (!_.isObject(params) && angular.isDefined(params)) {
      id = params;
      params = {};
      params[this.schema.routeIdProperty] = id;
    }
    if (angular.isDefined(options.isArray)) {
      isArray = options.isArray;
    }
    else if (_.isObject(params) && (params[this.schema.routeIdProperty])) {
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
  return sunRestCollection;
});
sunRest.factory('sunRestRepository', function (sunRestSchema, sunRestCollection) {
  return {
    resources: {},
    create   : function (name, schema) {
      if (!schema) {
        if (!_.isObject(name)) {
          throw new Error('Wrong repository call format');
        }
        schema = name;
      }
      name = schema['name'];
      schema = new sunRestSchema(schema);
      this.resources[name] = new sunRestCollection(schema);
      return this.resources[name];
    },
    get      : function (name) {
      return this.resources[name];
    }
  };

});
