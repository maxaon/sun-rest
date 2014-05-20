/*! sun-rest v0.0.4 by maxaon*/
(function (angular, undefined) {
  'use strict';
  angular.module('sun.utils', []).service('sunUtils', function sunUtils() {
    this.copyProperties = function (from, to, exclude) {
      var i, props, prop, description;
      exclude = exclude || [];
      props = Object.getOwnPropertyNames(from);
      for (i = 0; i < props.length; i++) {
        prop = props[i];
        description = Object.getOwnPropertyDescriptor(from, prop);
        if (exclude.indexOf(prop) === -1) {
          Object.defineProperty(to, prop, description);
        }
      }
    };
    this.inherit = function (Child, Parent) {
      if (!angular.isFunction(Child)) {
        var DefaultChild = function () {
          this.$super.constructor.apply(this, arguments);
        };
        DefaultChild.prototype = Child;
        return this.inherit(DefaultChild, Parent);
      }
      var F, f;
      F = function () {};
      F.prototype = Parent.prototype;
      f = new F();
      this.copyProperties(Child.prototype, f, ['constructor']);
      Child.prototype = f;
      Child.prototype.constructor = Child;
      Child.prototype.$super = Parent.prototype;
      return Child;
    };
    this.stringJsonParser = function (stringPath, object) {
      var parts, x, returnValue = object;
      if (stringPath.length > 0) {
        returnValue = object;
        parts = stringPath.split('.');
        for (x = 0; x < parts.length; x += 1) {
          returnValue = _.isObject(returnValue) ? returnValue[parts[x]] : undefined;
        }
      }
      return returnValue;
    };
  });
  /**
   * @name sunRest
   */
  var sunRest = angular.module('sun.rest', ['sun.utils']);
  var isDefined = angular.isDefined,
    isFunction = angular.isFunction,
    isString = angular.isString,
    isObject = angular.isObject,
    isArray = angular.isArray,
    forEach = angular.forEach,
    extend = angular.extend,
    copy = angular.copy;

  function isWindow(obj) {
    return obj && obj.document && obj.location && obj.alert && obj.setInterval;
  }

  function isArrayLike(obj) {
    if (obj == null || isWindow(obj)) {
      return false;
    }
    var length = obj.length;
    if (obj.nodeType === 1 && length) {
      return true;
    }
    return isString(obj) || isArray(obj) || length === 0 || typeof length === 'number' && length > 0 && length - 1 in obj;
  }

  function $watchCollection(objGetter, listener) {
    var self = this;
    // the current value, updated on each dirty-check run
    var newValue;
    // a shallow copy of the newValue from the last dirty-check run,
    // updated to match newValue during dirty-check run
    var oldValue;
    // a shallow copy of the newValue from when the last change happened
    var veryOldValue;
    // only track veryOldValue if the listener is asking for it
    var trackVeryOldValue = listener.length > 1;
    var changeDetected = 0;
    //  var objGetter = $parse(obj);
    var internalArray = [];
    var internalObject = {};
    var initRun = true;
    var oldLength = 0;

    function $watchCollectionWatch() {
      newValue = objGetter(self);
      var newLength, key;
      if (!isObject(newValue)) {
        // if primitive
        if (oldValue !== newValue) {
          oldValue = newValue;
          changeDetected++;
        }
      } else if (isArrayLike(newValue)) {
        if (oldValue !== internalArray) {
          // we are transitioning from something which was not an array into array.
          oldValue = internalArray;
          oldLength = oldValue.length = 0;
          changeDetected++;
        }
        newLength = newValue.length;
        if (oldLength !== newLength) {
          // if lengths do not match we need to trigger change notification
          changeDetected++;
          oldValue.length = oldLength = newLength;
        }
        // copy the items to oldValue and look for changes.
        for (var i = 0; i < newLength; i++) {
          var bothNaN = oldValue[i] !== oldValue[i] && newValue[i] !== newValue[i];
          if (!bothNaN && oldValue[i] !== newValue[i]) {
            changeDetected++;
            oldValue[i] = newValue[i];
          }
        }
      } else {
        if (oldValue !== internalObject) {
          // we are transitioning from something which was not an object into object.
          oldValue = internalObject = {};
          oldLength = 0;
          changeDetected++;
        }
        // copy the items to oldValue and look for changes.
        newLength = 0;
        for (key in newValue) {
          if (newValue.hasOwnProperty(key)) {
            newLength++;
            if (oldValue.hasOwnProperty(key)) {
              if (oldValue[key] !== newValue[key]) {
                changeDetected++;
                oldValue[key] = newValue[key];
              }
            } else {
              oldLength++;
              oldValue[key] = newValue[key];
              changeDetected++;
            }
          }
        }
        if (oldLength > newLength) {
          // we used to have more keys, need to find them and destroy them.
          changeDetected++;
          for (key in oldValue) {
            if (oldValue.hasOwnProperty(key) && !newValue.hasOwnProperty(key)) {
              oldLength--;
              delete oldValue[key];
            }
          }
        }
      }
      return changeDetected;
    }

    function $watchCollectionAction() {
      if (initRun) {
        initRun = false;
        listener(newValue, newValue, self);
      } else {
        listener(newValue, veryOldValue, self);
      }
      // make a copy for the next time a collection is changed
      if (trackVeryOldValue) {
        if (!isObject(newValue)) {
          //primitive
          veryOldValue = newValue;
        } else if (isArrayLike(newValue)) {
          veryOldValue = new Array(newValue.length);
          for (var i = 0; i < newValue.length; i++) {
            veryOldValue[i] = newValue[i];
          }
        } else {
          // if object
          veryOldValue = {};
          for (var key in newValue) {
            if (hasOwnProperty.call(newValue, key)) {
              veryOldValue[key] = newValue[key];
            }
          }
        }
      }
    }
    return this.$watch($watchCollectionWatch, $watchCollectionAction);
  }
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
    var baseUrl = '',
      responseDataListLocation = '',
      responseDataItemLocation = '',
      modelIdProperty = 'id',
      updateMethod = 'PUT',
      updatePartial = false,
      propertyModifier, requestInterceptor, requestErrorInterceptor, responseInterceptor, responseErrorInterceptor, properties, trailingSlashes = false,
      dataExtractor;
    properties = {
      baseUrl: {
        get: function () {
          return baseUrl;
        },
        set: function (value) {
          if (value[value.length - 1] === '/') {
            value = value.slice(0, -1);
          }
          baseUrl = value;
        }
      },
      trailingSlashes: {
        get: function () {
          return trailingSlashes;
        },
        set: function (value) {
          trailingSlashes = bool(value);
        }
      },
      responseDataListLocation: {
        get: function () {
          return responseDataListLocation;
        },
        set: function (value) {
          responseDataListLocation = value;
        }
      },
      responseDataItemLocation: {
        get: function () {
          return responseDataItemLocation;
        },
        set: function (value) {
          responseDataItemLocation = value;
        }
      },
      modelIdProperty: {
        get: function () {
          return modelIdProperty;
        },
        set: function (value) {
          modelIdProperty = value;
        }
      },
      updateMethod: {
        get: function () {
          return updateMethod;
        },
        set: function (value) {
          updateMethod = value;
        }
      },
      updatePartial: {
        get: function () {
          return updatePartial;
        },
        set: function (value) {
          updatePartial = value;
        }
      },
      requestInterceptor: {
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
      requestErrorInterceptor: {
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
      responseInterceptor: {
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
      propertyModifier: {
        get: function () {
          return propertyModifier;
        },
        set: function (value) {
          propertyModifier = value;
        }
      },
      dataExtractor: {
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
      return Object.defineProperties({}, _.mapValues(properties, function (param) {
        return {
          get: param.get
        };
      }));
    };
  });
  sunRest.factory('sunRestSchema', [
    '$q',
    'sunUtils',
    'sunRestConfig',
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
        } else {
          return $q.when(result);
        }
      };
      sunRestSchema.prototype.wrappedResponseInterceptor = function (bind, response, path) {
        var result = this.responseInterceptor && this.responseInterceptor.call(bind, response, path);
        if (!result) {
          return $q.when(response);
        } else {
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
    }
  ]);
  sunRest.factory('sunRestRouter', [
    'sunRestConfig',
    function (sunRestConfig) {
      /**
       * This method is intended for encoding *key* or *value* parts of query component. We need a
       * custom method because encodeURIComponent is too aggressive and encodes stuff that doesn't
       * have to be encoded per http://tools.ietf.org/html/rfc3986:
       *    query       = *( pchar / '/' / '?' )
       *    pchar         = unreserved / pct-encoded / sub-delims / ':' / '@'
       *    unreserved    = ALPHA / DIGIT / '-' / '.' / '_' / '~'
       *    pct-encoded   = '%' HEXDIG HEXDIG
       *    sub-delims    = '!' / '$' / '&' / ''' / '(' / ')'
       *                     / '*' / '+' / ',' / ';' / '='
       */
      function encodeUriQuery(val, pctEncodeSpaces) {
        return encodeURIComponent(val).replace(/%40/gi, '@').replace(/%3A/gi, ':').replace(/%24/g, '$').replace(/%2C/gi, ',').replace(/%20/g, pctEncodeSpaces ? '%20' : '+');
      }
      /**
       * We need our custom method because encodeURIComponent is too aggressive and doesn't follow
       * http://www.ietf.org/rfc/rfc3986.txt with regards to the character set (pchar) allowed in path
       * segments:
       *    segment       = *pchar
       *    pchar         = unreserved / pct-encoded / sub-delims / ':' / '@'
       *    pct-encoded   = '%' HEXDIG HEXDIG
       *    unreserved    = ALPHA / DIGIT / '-' / '.' / '_' / '~'
       *    sub-delims    = '!' / '$' / '&' / ''' / '(' / ')'
       *                     / '*' / '+' / ',' / ';' / '='
       */
      function encodeUriSegment(val) {
        return encodeUriQuery(val, true).replace(/%26/gi, '&').replace(/%3D/gi, '=').replace(/%2B/gi, '+');
      }

      function sunRestRouter(template, defaults) {
        if (template) {
          if (template[template.length - 1] === '/')
            template = template.slice(0, -1);
        }
        this.template = template;
        this.defaults = defaults || {};
        this.urlParams = {};
      }
      sunRestRouter.prototype = {
        buildConfig: function (config, params, actionUrl) {
          params = params || {};
          actionUrl = actionUrl || params.url;
          delete params.url;
          var url, val, encodedVal, urlParams = {};
          if (actionUrl && actionUrl.indexOf('^') === 0) {
            url = actionUrl.slice(1);
          } else {
            url = this.template;
            if (actionUrl) {
              if (actionUrl[actionUrl.length - 1] == '/' && actionUrl.length !== 1)
                actionUrl = actionUrl.slice(0, -1);
              if (actionUrl[0] === '/') {
                url = actionUrl;
              } else {
                url = this.template + '/' + actionUrl;
              }
            }
            if (url[0] === '/')
              url = sunRestConfig.baseUrl + url + '/';
            else
              url = url + '/';
          }
          angular.forEach(url.split(/\W/), function (param) {
            if (param === 'hasOwnProperty') {
              throw new Error('hasOwnProperty is not a valid parameter name.');
            }
            if (!new RegExp('^\\d+$').test(param) && param && new RegExp('(^|[^\\\\]):' + param + '(\\W|$)').test(url)) {
              urlParams[param] = true;
            }
          });
          params = params || {};
          angular.forEach(urlParams, function (_, urlParam) {
            val = params.hasOwnProperty(urlParam) ? params[urlParam] : this.defaults[urlParam];
            if (angular.isDefined(val) && val !== null) {
              encodedVal = encodeUriSegment(val);
              url = url.replace(new RegExp(':' + urlParam + '(\\W|$)', 'g'), encodedVal + '$1');
            } else {
              url = url.replace(new RegExp('(/?):' + urlParam + '(\\W|$)', 'g'), function (match, leadingSlashes, tail) {
                if (tail.charAt(0) === '/') {
                  return tail;
                }
                return leadingSlashes + tail;
              });
            }
          }, this);
          // strip trailing slashes and set the url
          if (sunRestConfig.trailingSlashes === false) {
            url = url.slice(0, url.length - 1) || '/';
          }
          // then replace collapse `/.` if found in the last URL path segment before the query
          // E.g. `http://url.com/id./format?q=x` becomes `http://url.com/id.format?q=x`
          url = url.replace(/\/\.(?=\w+($|\?))/, '.');
          // replace escaped `/\.` with `/.`
          config.url = url.replace(/\/\\\./, '/.');
          // set params - delegate param encoding to $http
          angular.forEach(params, function (value, key) {
            if (!urlParams[key]) {
              config.params = config.params || {};
              config.params[key] = value;
            }
          });
          return config;
        }
      };
      return sunRestRouter;
    }
  ]);
  sunRest.factory('sunRestBaseModel', function () {
    /**
     * @ngdoc object
     * @name sunRest.sunRestBaseModel
     * @property {string} ppp
     * @typedef {object} sunRestBaseModel
     */
    var BaseModel = function (data) {
      // Manager can not be properly copied by `angular.copy`
      Object.defineProperty(this, 'mngr', {
        value: new this.constructor.mngrClass(this),
        enumerable: false
      });
      this._setDefaults(data);
      if (!_.isEmpty(data)) {
        this.mngr.populate(data);
      }
    };
    BaseModel.prototype.constructor = BaseModel;
    BaseModel.prototype.toJSON = function () {
      return this.mngr.toJSON();
    };
    BaseModel.prototype._setDefaults = function (data) {
      this.mngr.populating = true;
      _.forEach(this.mngr.schema.properties, function (prop, prop_name) {
        var default_value = prop['default'];
        if (default_value !== undefined && (data === undefined || prop_name in data)) {
          if (angular.isFunction(default_value)) {
            default_value = new default_value();
          }
          this[prop_name] = default_value;
        }
      }, this);
      this.mngr.populating = false;
    };
    return BaseModel;
  });
  sunRest.factory('sunRestModelManager', [
    '$http',
    '$q',
    'sunUtils',
    'sunRestConfig',
    'sunRestRouter',
    function ($http, $q, sunUtils, sunRestConfig, sunRestRouter) {
      //region Dotted path
      var MEMBER_NAME_REGEX = /^(\.[a-zA-Z_$][0-9a-zA-Z_$]*)+$/;

      function hasBody(method) {
        return [
          'POST',
          'PUT',
          'PATCH'
        ].indexOf(method.toUpperCase()) > -1;
      }

      function isValidDottedPath(path) {
        return path !== null && path !== '' && path !== 'hasOwnProperty' && MEMBER_NAME_REGEX.test('.' + path);
      }

      function lookupDottedPath(obj, path) {
        if (!isValidDottedPath(path)) {
          throw new Error('Dotted member path "@{' + path + '}" is invalid.');
        }
        var i, ii, key, keys = path.split('.');
        for (i = 0, ii = keys.length; i < ii && obj !== undefined; i++) {
          key = keys[i];
          obj = obj !== null ? obj[key] : undefined;
        }
        return obj;
      }
      //endregion
      /**
       * @ngdoc service
       * @name sunRest.sunRestModelManager
       *
       * @constructor
       * @param {sunRestBaseModel} model Managed model
       * @param {?sunRestSchema} schema Schema of the resource
       * @param {?sunRestBaseModel} modelClass Model class
       *
       * @property {sunRestBaseModel} model Managed model
       * @property  {sunRestSchema} schema Resource schema
       * @property  {sunRestBaseModel} modelClass Model class
       *
       * @description
       * Manager for all model
       */
      function sunRestModelManager(model, schema, modelClass) {
        // TODO Try to remove dependency
        Object.defineProperty(this, 'model', {
          value: model,
          enumerable: false
        });
        if (schema) {
          /** @type sunRestSchema */
          this.schema = schema;
        }
        if (modelClass) {
          this.modelClass = modelClass;
        }
        this.route = new sunRestRouter(this.schema.route);
        this.remoteFlag = false;
        this.modifyFlag = false;
        this.originalData = {};
        this.changedProperties = {};
        this.deleteFlag = false;
        this.populating = false;
      }
      sunRestModelManager.prototype.NEW = 'new';
      sunRestModelManager.prototype.DELETED = 'deleted';
      sunRestModelManager.prototype.DIRTY = 'dirty';
      sunRestModelManager.prototype.LOADED = 'loaded';
      sunRestModelManager.prototype.NORMALIZE_INCOMING = 'incoming';
      sunRestModelManager.prototype.NORMALIZE_OUTGOING = 'outgoing';
      sunRestModelManager.prototype.populate = function (data) {
        var properties = this.schema.properties;
        this.populating = true;
        data = this.normalizeData(data, this.NORMALIZE_INCOMING);
        angular.forEach(data, function (value, key) {
          if (properties[key] && properties[key].toNative) {
            value = properties[key].toNative(value);
          }
          this[key] = value;
        }, this.model);
        this.populating = false;
        this.remoteFlag = true;
        this.modifyFlag = false;
        this.changedProperties = {};
        this.originalData = data;
      };
      sunRestModelManager.prototype.reset = function () {
        var saveRemoteFlag = this.remoteFlag;
        this.populate(this.originalData);
        this.remoteFlag = saveRemoteFlag;
      };
      sunRestModelManager.prototype.toJSON = function () {
        var returnData = {}, value;
        _.forEach(this.schema.properties, function (property, key) {
          value = this.model['_' + key];
          if (property.toJson) {
            value = property.toJson(value);
          }
          returnData[key] = value;
        }, this);
        return this.normalizeData(returnData, this.NORMALIZE_OUTGOING);
      };
      sunRestModelManager.prototype.normalizeData = function (data, way) {
        var normalizedData = {}, isOutgoing = way === this.NORMALIZE_OUTGOING;
        if (!data) {
          return {};
        }
        _.forEach(this.schema.properties, function (prop, name) {
          var remoteProperty = prop.remoteProperty ? prop.remoteProperty : name,
            normalizedKey = isOutgoing ? remoteProperty : name,
            noneNormalizedKey = isOutgoing ? name : remoteProperty;
          normalizedData[normalizedKey] = data[noneNormalizedKey] || data[name];
        });
        return normalizedData;
      };
      sunRestModelManager.prototype.extractParams = function (data, actionParams) {
        var ids = {};
        actionParams = angular.extend({}, this.schema.paramDefaults, actionParams);
        angular.forEach(actionParams, function (value, key) {
          if (angular.isFunction(value)) {
            value = value();
          }
          ids[key] = value && value.charAt && value.charAt(0) === '@' ? lookupDottedPath(data, value.substr(1)) : value;
        });
        return ids;
      };
      sunRestModelManager.prototype.save = function (params, modifyLocal) {
        var model, promise, isNew = this.state === this.NEW,
          method = isNew ? 'POST' : sunRestConfig.updateMethod;
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
      sunRestModelManager.prototype.remove = function (params) {
        params = angular.extend({}, this.schema.paramDefaults.remove, params);
        return this.simpleRequest('DELETE', params);
      };
      sunRestModelManager.prototype.objectRequest = function (method, isArray, params, data) {
        var promise, Model = this.modelClass,
          dataLocation = isArray === true ? this.schema.dataListLocation : this.schema.dataItemLocation,
          value = isArray ? [] : new Model(data),
          schema = this.schema;
        promise = this.simpleRequest(method, params, data).then(function (response) {
          var extracted;
          if (response.data) {
            extracted = schema.dataExtractor(dataLocation, response);
            if (isArray) {
              value.length = 0;
              angular.forEach(extracted, function (item) {
                value.push(new Model(item));
              });
            } else {
              value.populate(extracted); //shallowClearAndCopy(data, value);
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
      sunRestModelManager.prototype.simpleRequest = function (method, params, data, path) {
        var promise, httpConfig = {
            method: method
          }, schema = this.schema;
        if (hasBody(method)) {
          httpConfig.data = data;
        }
        params = params || {};
        if (data) {
          params[this.schema.idProperty] = data[this.schema.idProperty];
        }
        this.route.buildConfig(httpConfig, angular.extend({}, this.extractParams(data), params));
        promise = this.schema.wrappedRequestInterceptor(this, httpConfig).then(function (newConfig) {
          return $http(newConfig);
        }).then(function (response) {
          return schema.wrappedResponseInterceptor(this, response, path);
        });
        if (angular.isDefined(path)) {
          promise = promise.then(function (response) {
            return schema.dataExtractor(path, response);
          });
        }
        return promise;
      };
      Object.defineProperties(sunRestModelManager.prototype, {
        state: {
          get: function () {
            /*jslint white:true*/
            var state;
            this.i = (this.i || 0) + 1;
            if (!this.remoteFlag) {
              state = this.NEW;
            } else if (this.deleteFlag) {
              state = this.DELETED;
            } else if (this.modifyFlag) {
              state = this.DIRTY;
            } else {
              state = this.LOADED;
            }
            return state;
          }
        },
        isRemote: {
          get: function () {
            return this.remoteFlag && !this.deleteFlag;
          }
        }
      });
      sunRestModelManager.create = function (schema, model, overrides) {
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
        sunUtils.inherit(child, sunRestModelManager);
        child.prototype.schema = schema;
        child.prototype.modelClass = model;
        return child;
      };
      return sunRestModelManager;
    }
  ]);
  sunRest.factory('sunRestModelFactory', [
    'sunUtils',
    'sunRestBaseModel',
    'sunRestModelManager',
    function (sunUtils, sunRestBaseModel, sunRestModelManager) {
      /**
       * Name sunRestModelFactory
       * @param schema
       * @returns {*}
       * @constructor
       */
      function sunRestModelFactory(schema) {
        var Model, modelProperties = {};
        Model = sunUtils.inherit(schema.inherit || {}, sunRestBaseModel);
        _.forEach(schema.properties, function (prop, prop_name) {
          var customSetter = false,
            customGetter = false,
            customProperty = false,
            defaultGetMethod, defaultSetMethod;
          if (Model.prototype[prop_name]) {
            customGetter = customSetter = customProperty = true;
          } else {
            customGetter = !! schema.properties[prop_name].getter;
            customSetter = !! schema.properties[prop_name].setter;
          }
          modelProperties['_' + prop_name] = {
            get: function () {
              return this['__' + prop_name];
            },
            set: function (value) {
              if (value != this['__' + prop_name] && !this.mngr.populating) {
                if (value == this.mngr.originalData[prop_name]) {
                  delete this.mngr.changedProperties[prop_name];
                  this.mngr.modifyFlag = Object.keys(this.mngr.changedProperties).length > 0;
                } else {
                  this.mngr.changedProperties[prop_name] = true;
                  this.mngr.modifyFlag = true;
                }
              }
              this['__' + prop_name] = value;
            }
          };
          if (customProperty) {
            return;
          }
          if (customGetter) {
            defaultGetMethod = function () {
              return schema.properties[prop_name].getter.call(this, this['_' + prop_name]);
            };
          } else {
            defaultGetMethod = function () {
              return this['_' + prop_name];
            };
          }
          if (customSetter) {
            defaultSetMethod = function (value) {
              var res = schema.properties[prop_name].setter.call(this, value);
              if (res !== undefined) {
                this['_' + prop_name] = res;
              }
            };
          } else {
            defaultSetMethod = function (value) {
              this['_' + prop_name] = value;
            };
          }
          modelProperties[prop_name] = {
            get: defaultGetMethod,
            set: defaultSetMethod
          };
        });
        Object.defineProperties(Model.prototype, modelProperties);
        Model.mngrClass = sunRestModelManager.create(schema, Model, Model.mngr);
        return Model;
      }
      return sunRestModelFactory;
    }
  ]);
  sunRest.factory('sunRestCollection', [
    '$q',
    '$http',
    'sunUtils',
    'sunRestConfig',
    'sunRestModelFactory',
    'sunRestRouter',
    function ($q, $http, sunUtils, sunRestConfig, sunRestModelFactory, sunRestRouter) {
      var sunRestCollection = function (schema) {
        this.schema = schema;
        this.router = new sunRestRouter(schema.route);
        this.model = sunRestModelFactory(schema);
      };
      sunRestCollection.prototype.find = function (params, postData) {
        var promise, id, httpConfig, value, dataLocation, Model = this.model,
          schema = this.schema,
          method = postData ? 'POST' : 'GET',
          isArray = true;
        params = params || {};
        if (!_.isObject(params) && angular.isDefined(params)) {
          id = params;
          params = {};
          params[this.schema.routeIdProperty] = id;
        }
        if (_.isObject(params) && params[this.schema.routeIdProperty]) {
          isArray = false;
        }
        dataLocation = isArray === true ? this.schema.dataListLocation : this.schema.dataItemLocation;
        value = isArray ? [] : new Model();
        httpConfig = {
          method: method,
          data: postData
        };
        this.router.buildConfig(httpConfig, params);
        //noinspection UnnecessaryLocalVariableJS
        promise = this.schema.wrappedRequestInterceptor(this, httpConfig).then(function (newConfig) {
          return $http(newConfig);
        }).then(function (response) {
          return schema.wrappedResponseInterceptor(this, response);
        }).then(function (response) {
          var extracted, data = response.data,
            promise = value.$promise;
          if (data) {
            extracted = sunUtils.stringJsonParser(dataLocation, data);
            if (isArray) {
              value.length = 0;
              angular.forEach(extracted, function (item) {
                value.push(new Model(item));
              });
            } else {
              value.mngr.populate(extracted);
              //shallowClearAndCopy(data, value);
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
    }
  ]);
  sunRest.factory('sunRestRepository', [
    'sunRestSchema',
    'sunRestCollection',
    function (sunRestSchema, sunRestCollection) {
      return {
        resources: {},
        create: function (name, schema) {
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
        get: function (name) {
          return this.resources[name];
        }
      };
    }
  ]);
}(angular));
