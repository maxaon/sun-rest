'use strict';
/* global sunRest */
/**
 * @ngdoc object
 * @name sunRest.sunRestConfigProvider
 * @typedef  {object} RestConfigProvider
 * @property {bool} strictMode Desc strictmodel
 * @property {bool} strictMode1 Desc strictmodel1
 * @property {bool} strictMode2 Desc strictmodel2
 * @constructor
 *
 * @description
 *
 */
sunRest.provider('sunRestConfig', function () {
  var
    baseUrl = '',
    responseDataLocation = '',
    modelIdProperty = 'id',
    updateMethod = 'PUT',
    updatePartial = false,
    propertyModifier,
    requestInterceptor,
    requestErrorInterceptor,
    responseInterceptor,
    responseErrorInterceptor,
    properties,
    dataExtractor;


  properties = {
    baseUrl                 : {
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
    responseDataLocation    : {
      get: function () {
        return responseDataLocation;
      },
      set: function (value) {
        responseDataLocation = value;
      }
    },
    modelIdProperty         : {
      get: function () {
        return modelIdProperty;
      },
      set: function (value) {
        modelIdProperty = value;
      }
    },
    updateMethod            : {
      get: function () {
        return updateMethod;
      },
      set: function (value) {
        updateMethod = value;
      }
    },
    updatePartial           : {
      get: function () {
        return updatePartial;
      },
      set: function (value) {
        updatePartial = value;
      }
    },
    requestInterceptor      : {
      get: function () {
        return requestInterceptor;
      },
      set: function (value) {
        if (!_.isFunction(value)) {
          throw new Error('Request formatter must be a function');
        }
        requestInterceptor = value;
      }
    },
    requestErrorInterceptor : {
      get: function () {
        return requestErrorInterceptor;
      },
      set: function (value) {
        if (!_.isFunction(value)) {
          throw new Error('Request formatter must be a function');
        }
        requestErrorInterceptor = value;
      }
    },
    responseInterceptor     : {
      get: function () {
        return responseInterceptor;
      },
      set: function (value) {
        if (!_.isFunction(value)) {
          throw new Error('Request formatter must be a function');
        }
        responseInterceptor = value;
      }
    },
    responseErrorInterceptor: {
      get: function () {
        return responseErrorInterceptor;
      },
      set: function (value) {
        if (!_.isFunction(value)) {
          throw new Error('Request formatter must be a function');
        }
        responseErrorInterceptor = value;
      }
    },
    propertyModifier        : {
      get: function () {
        return propertyModifier;
      },
      set: function (value) {
        propertyModifier = value;
      }
    },
    dataExtractor           : {
      get: function () {
        return dataExtractor;
      },
      set: function (value) {
        if (!_.isFunction(value)) {
          throw new Error('DataExtractor must be a function');
        }
        dataExtractor = value;
      }
    }
  };
  Object.defineProperties(this, properties);
  //noinspection JSPotentiallyInvalidUsageOfThis
  /**
   * @ngdoc object
   * @name sunRest.sunRestConfig
   * @description
   * Bla blas vlss
   */
  this.$get = function () {
    return Object.defineProperties({},
      _.mapValues(properties, function (param) {
          return {get: param.get};
        }
      ));
  };
});
