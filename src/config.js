/**
 * @name sun.rest.config
 */

(function (angular) {
  'use strict';
  angular.module('sun.rest.config', [ ])
    .provider('RestConfig', function () {
      var requestFormatter,
        strictMode = false,
        baseUrl = '',
        responseDataLocation = '',
        modelIdProperty = 'id',
        updateMethod = 'PUT',
        flattenItemRoute = false,
        validateOnSync = true,
        isArray = null,
        properties;
      requestFormatter = function () {
      };
      properties = {
        strictMode          : {
          get: function () {
            return strictMode;
          },
          set: function (value) {
            strictMode = value;
          }
        },
        baseUrl             : {
          get: function () {
            return baseUrl;
          },
          set: function (value) {
            if (value.lastIndexOf('/') === (value.length - 1)) {
              value = value.slice(0, -1);
            }
            baseUrl = value;
          }
        },
        responseDataLocation: {
          get: function () {
            return responseDataLocation;
          },
          set: function (value) {
            responseDataLocation = value;
          }
        },
        modelIdProperty     : {
          get: function () {
            return modelIdProperty;
          },
          set: function (value) {
            modelIdProperty = value;
          }
        },
        updateMethod        : {
          get: function () {
            return updateMethod;
          },
          set: function (value) {
            updateMethod = value;
          }
        },
        flattenItemRoute    : {
          get: function () {
            return flattenItemRoute;
          },
          set: function (value) {
            flattenItemRoute = value;
          }
        },
        requestFormatter    : {
          get: function () {
            return requestFormatter;
          },
          set: function (value) {
            if (!_.isFunction(value)) {
              throw new Error('Request formatter must be a function');
            }
            requestFormatter = value;
          }
        },
        validateOnSync      : {
          get: function () {
            return validateOnSync;
          },
          set: function (value) {
            validateOnSync = value;
          }
        },
        isArray             : {
          get: function () {
            return isArray;
          },
          set: function (value) {
            isArray = value;
          }
        }
      };
      Object.defineProperties(this, properties);
      //noinspection JSPotentiallyInvalidUsageOfThis
      this.$get = function () {
        var service = {};
        Object.defineProperties(service, _.mapValues(properties, function (param) {
          return {get: param.get};
        }));
        return service;
      };
    });
}(angular));
