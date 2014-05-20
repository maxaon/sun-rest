'use strict';
/* global sunRest */
sunRest.factory('sunRestSchema',
  /**
   *
   * @param $q
   * @param sunUtils
   * @param {sunRestConfig} sunRestConfig
   * @returns {sunRestSchema}
   */
    function ($q, sunUtils, sunRestConfig) {
    /**
     * @ngdoc object
     * @name sunRest.sunRestSchema:PropertyDescription
     * @typedef {object} PropertyDescription
     * @property {function} setter Function to set value
     * @property {function} getter Function to get value
     * @property {string} remoteProperty Name of the remote property
     */
    /**
     * @ngdoc service
     * @name sunRest.sunRestSchema
     * @typedef {object} sunRestSchema
     * @constructor
     * @param {object} properties Properties of the schema
     *
     * @property {string}  name
     * @property {string}  route
     * @property {string}  idProperty
     * @property {string}  routeIdProperty
     * @property {PropertyDescription[]}  properties
     * @property {object}  relations
     * @property {string}  dataListLocation
     * @property {string}  dataItemLocation
     * @property {boolean}  autoParse
     * @property {function}  requestInterceptor
     * @property {function}  responseInterceptor
     * @property {boolean}  isArray
     * @property {object}  paramDefaults
     * @property {function}  propertyModifier
     * @property {function}  dataExtractor
     */
    function sunRestSchema(properties) {
      angular.extend(this, this.defaultProperties, properties);
      if (!this.routeIdProperty) {
        this.routeIdProperty = this.extractRouteIdProperty(this.route);
      }
      if (this.propertyModifier) {
        this.applyPropertyModifier(this.properties, this.propertyModifier);
      }
    }

    /**
     * @name sunRest.sunRestSchema.defaultProperties
     * @memberOf sunRest.sunRestSchema
     * @methodOf sunRest.sunRestSchema
     */
    sunRestSchema.prototype.defaultProperties = {
      name: null,
      route: null,
      idProperty: sunRestConfig.modelIdProperty,
      routeIdProperty: null,
      properties: {},
      relations: {},
      dataListLocation: sunRestConfig.responseDataListLocation,
      dataItemLocation: sunRestConfig.responseDataItemLocation,
      autoParse: true,
      requestInterceptor: sunRestConfig.requestInterceptor,
      responseInterceptor: sunRestConfig.responseInterceptor,
      isArray: sunRestConfig.isArray,
      paramDefaults: {},
      propertyModifier: sunRestConfig.propertyModifier,
      dataExtractor: sunRestConfig.dataExtractor
    };
    /**
     * @name sunRest.sunRestSchema.extractRouteIdProperty
     * @memberOf sunRest.sunRestSchema
     * @methodOf sunRest.sunRestSchema
     */
    sunRestSchema.prototype.extractRouteIdProperty = function (route) {
      var keys = route.match(/:\w[\w0-9-_]*/g);
      if (keys === null || keys.length === 0) {
        return null;
      }
      return keys[keys.length - 1].slice(1);
    };
    /**
     * @name sunRest.sunRestSchema.applyPropertyModifier
     * @memberOf sunRest.sunRestSchema
     * @methodOf sunRest.sunRestSchema
     */
    sunRestSchema.prototype.applyPropertyModifier = function (properties, modifier) {
      var newProperty;
      _.forEach(properties, function (property, name) {
        newProperty = modifier(property, name);
        if (newProperty !== undefined) {
          properties[name] = newProperty;
        }
      });
    };
    sunRestSchema.prototype.wrappedRequestInterceptor = function (bind, httpConfig) {
      var result = this.requestInterceptor && this.requestInterceptor.call(bind, httpConfig);
      if (!result) {
        return $q.when(httpConfig);
      }
      else {
        return $q.when(result);
      }

    };

    sunRestSchema.prototype.wrappedResponseInterceptor = function (bind, response, path) {
      var result = this.responseInterceptor && this.responseInterceptor.call(bind, response, path);
      if (!result) {
        return $q.when(response);
      }
      else {
        return $q.when(result);
      }
    };
    sunRestSchema.defaultDataExtractor = function (path, response) {
      return sunUtils.stringJsonParser(path, response.data);
    };

    Object.defineProperties(sunRestSchema.prototype, {
      'dataExtractor': {
        get: function () {
          return this._dataExtractor || sunRestSchema.defaultDataExtractor;
        },
        set: function (value) {
          this._dataExtractor = value;
        }
      }
    });


    return sunRestSchema;
  });

