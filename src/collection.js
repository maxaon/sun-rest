'use strict';
/* global sunRest */
sunRest.factory('sunRestCollection', function ($q, $http, sunUtils, sunRestConfig, sunRestModelFactory) {
  var sunRestCollection = function (schema) {
    this.schema = schema;
    this.model = sunRestModelFactory(schema);
  };
  sunRestCollection.prototype.find = function (params, postData) {
    return this.query(params, postData);
  };
  sunRestCollection.prototype.query = function (params, postData, isArray) {
    var promise,
      id,
      httpConfig,
      value,
      dataLocation,
      Model = this.model,
      schema = this.schema,
      method = postData ? 'POST' : 'GET',
      self = this;

    if (!_.isObject(params) && angular.isDefined(params)) {
      id = params;
      params = {};
      params[this.schema.routeIdProperty] = id;
    }
    if (isArray === undefined) {
      isArray = !(_.isObject(params) && (params[this.schema.routeIdProperty]));
    }


    dataLocation = (isArray === true ? this.schema.dataListLocation : this.schema.dataItemLocation);

    value = isArray ? [] : (new Model());
    httpConfig = {method: method, data: postData};
    this.schema.router.buildConfig(httpConfig, params);

    //noinspection UnnecessaryLocalVariableJS
    promise = this.schema.wrappedRequestInterceptor(this, httpConfig)
      .then(function (newConfig) {
        return $http(newConfig);
      })
      .then(function (response) {
        return schema.wrappedResponseInterceptor(self, response);
      })
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
  sunRestCollection.prototype.create = function (data) {
    var obj = new this.model(data);
    return obj;

  };
  return sunRestCollection;
});

