'use strict';
/* global sunRest */
sunRest.factory('sunRestCollection', function ($q, $http, sunUtils, sunRestConfig, sunRestModelFactory) {
  function normalizeOptions(options, defaults) {
    if (_.isBoolean(options)) {
      options = {
        isArray: options
      };
    }
    options = options || {};
    return _.defaults(options, defaults);
  }

  var sunRestCollection = function (schema) {
    this.schema = schema;
    this.model = sunRestModelFactory(schema);
  };

  sunRestCollection.prototype.find = function (params, options) {
    options = normalizeOptions(options, {
      method: "GET",
      params: params
    });
    return this.request(options);
  };
  sunRestCollection.prototype.find.one = function (data, params, options) {
    options = normalizeOptions(options, {
      isArray: false
    });
    return this.find(options);
  };
  sunRestCollection.prototype.find.all = function (data, params, options) {
    options = normalizeOptions(options, {
      isArray: true
    });
    return this.find(options);
  };

  sunRestCollection.prototype.query = function (data, params, options) {
    options = normalizeOptions(options, {
      method: "POST",
      data: data,
      params: params
    });
    return this.request(options);
  };
  sunRestCollection.prototype.query.one = function (data, params, options) {
    options = normalizeOptions(options, {
      isArray: false
    });
    return this.query(options);
  };
  sunRestCollection.prototype.query.all = function (data, params, options) {
    options = normalizeOptions(options, {
      isArray: true
    });
    return this.query(options);
  };

  sunRestCollection.prototype.request = function (options) {
    options = options || {};
    var promise,
      id,
      httpConfig,
      value,
      dataLocation,
      Model = this.model,
      schema = this.schema,
      method = options.method ? options.method : options.data ? 'POST' : 'GET',
      self = this,
      data = options.data,
      params = options.params,
      isArray = options.isArray;

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
    httpConfig = this.schema.router.buildConfig({method: method, data: data}, params);


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
    if (options.populateRelated) {
      promise = promise.then(function (resp) {
        var prom = _(isArray ? resp.resource : [resp.resource])
          .map(function (obj) {
            return obj.mngr.populateRelated(!_.isBoolean(options.populateRelated) ? options.populateRelated : undefined);
          })
          .value();

        return $q.all(prom)
          .then(function () {
            return resp;
          });
      });
    }

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

