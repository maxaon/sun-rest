/*! sun-rest v0.0.5 by maxaon*/
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
    'sunRestRouter',
    function ($q, sunUtils, sunRestConfig, sunRestRouter) {
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
          if (!this.route) {
            throw new Error('Schema does not have route property');
          }
          if (!this.routeIdProperty) {
            this.routeIdProperty = this.extractRouteIdProperty(this.route);
          }
          if (this.propertyModifier) {
            this.applyPropertyModifier(this.properties, this.propertyModifier);
          }
          this.router = new sunRestRouter(this.route);
        }
        /**
         * @name sunRest.sunRestSchema.defaultProperties
         * @memberOf sunRest.sunRestSchema
         * @methodOf sunRest.sunRestSchema
         */
      sunRestSchema.prototype.defaultProperties = {
        name: null,
        route: null,
        router: null,
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
        /**
         * @class sunRestRouter
         * @name sunRest.sunRestRouter
         * @param template
         * @param defaults
         */
      function sunRestRouter(template, defaults) {
        if (template) {
          if (template[template.length - 1] === '/')
            template = template.slice(0, -1);
        }
        this.template = template;
        this.defaults = defaults || {};
        this.urlParams = {};
      }
      sunRestRouter.prototype.generateUrl = function (action, params) {
        var url;
        url = this._normalizeUrl(action);
        url = this._injectParams(url, params);
        // strip trailing slashes
        if (sunRestConfig.trailingSlashes === false) {
          url = url.slice(0, url.length - 1);
        }
        // then replace collapse `/.` if found in the last URL path segment before the query
        // E.g. `http://url.com/id./format?q=x` becomes `http://url.com/id.format?q=x`
        url = url.replace(/\/\.(?=\w+($|\?))/, '.');
        // replace escaped `/\.` with `/.`
        url = url.replace(/\/\\\./, '/.');
        return url;
      };
      sunRestRouter.prototype.buildConfig = function (config, params, action) {
        var url, urlParams;
        params = params || {};
        config = config || {};
        if (params.url) {
          action = params.url;
          delete params.url;
        }
        config.url = this.generateUrl(action, params);
        urlParams = this._extractUrlParams(this._normalizeUrl(action));
        // set params - delegate param encoding to $http
        angular.forEach(params, function (value, key) {
          if (!urlParams[key]) {
            config.params = config.params || {};
            config.params[key] = value;
          }
        });
        return config;
      };
      sunRestRouter.prototype._extractUrlParams = function _extractUrlParams(url) {
        var urlParams = {};
        angular.forEach(url.split(/\W/), function (param) {
          if (param === 'hasOwnProperty') {
            throw new Error('hasOwnProperty is not a valid parameter name.');
          }
          if (!new RegExp('^\\d+$').test(param) && param && new RegExp('(^|[^\\\\]):' + param + '(\\W|$)').test(url)) {
            urlParams[param] = true;
          }
        });
        return urlParams;
      };
      sunRestRouter.prototype._getBaseUrl = function () {
        return sunRestConfig.baseUrl;
      };
      sunRestRouter.prototype._prependBaseUrl = function (url) {
        if (url[0] === '/') {
          url = this._getBaseUrl() + url + '/';
        } else {
          url = url + '/';
        }
        return url;
      };
      sunRestRouter.prototype._normalizeUrl = function _normalizeUrl(actionUrl) {
        var url;
        if (actionUrl && actionUrl.indexOf('^') === 0) {
          url = actionUrl.slice(1);
        } else {
          url = this.template;
          if (actionUrl) {
            if (actionUrl[actionUrl.length - 1] === '/' && actionUrl.length !== 1) {
              actionUrl = actionUrl.slice(0, -1);
            }
            if (actionUrl[0] === '/') {
              url = actionUrl;
            } else {
              url = this.template + '/' + actionUrl;
            }
          }
          url = this._prependBaseUrl(url);
        }
        if (url.length === 0) {
          url = '/';
        }
        if (url[url.length - 1] !== '/') {
          url = url + '/';
        }
        return url;
      };
      sunRestRouter.prototype._injectParams = function _injectParams(url, params) {
        var val, encodedVal, defaults, urlParams = this._extractUrlParams(url);
        params = params || {};
        defaults = _.isFunction(this.defaults) ? this.defaults() : this.defaults;
        angular.forEach(urlParams, function (_, urlParam) {
          val = params.hasOwnProperty(urlParam) ? params[urlParam] : defaults[urlParam];
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
        return url;
      };
      return sunRestRouter;
    }
  ]);
  sunRest.factory('sunRestRouterNested', [
    'sunRestConfig',
    'sunRestRouter',
    'sunUtils',
    function (sunRestConfig, sunRestRouter, sunUtils) {
      function SunRestRouterNested(parentRouter, parentDefauls, template, defaults) {
        this.$super.constructor.call(this, template, defaults);
        this.parentRouter = Object.create(parentRouter);
        this.parentRouter.defaults = Object.create(parentDefauls);
        this.parentRouter._getBaseUrl = function () {
          return '';
        };
      }
      sunUtils.inherit(SunRestRouterNested, sunRestRouter);
      SunRestRouterNested.prototype._prependBaseUrl = function (url) {
        var parentUrl = this.parentRouter.generateUrl();
        // Escape :
        parentUrl = parentUrl.replace(/.:+/g, function (m) {
          return m[0] === '\\' ? m : m[0] + Array(m.length).join('\\:');
        });
        return this._getBaseUrl() + parentUrl + url + '/';
      };
      SunRestRouterNested.prototype.generateUrl = function (url) {
        url = this.$super.generateUrl.apply(this, arguments);
        url = url.replace(/\\:/g, ':');
        return url;
      };
      return SunRestRouterNested;
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
  sunRest.factory('sunRestBaseModel', function () {
    /**
     * @ngdoc object
     * @class
     * @name sunRest.sunRestBaseModel
     * @property {string} ppp
     * @typedef {object} sunRestBaseModel
     */
    var BaseModel = function (data) {
      if (!this.schema) {
        throw new Error('Model must be created through ModelFactory');
      }
      // Manager can not be properly copied by `angular.copy`
      Object.defineProperty(this, 'mngr', {
        value: new this.mngrClass(this),
        enumerable: false
      });
      if (!_.isEmpty(data)) {
        _.extend(this, data);
      }
    };
    BaseModel.prototype.constructor = BaseModel;
    BaseModel.prototype.mngrClass = undefined;
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
    '$injector',
    'sunUtils',
    'sunRestConfig',
    'sunRestRouter',
    function ($http, $q, $injector, sunUtils, sunRestConfig, sunRestRouter) {
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

      function getCollection(relationConfig) {
          var collection;
          if (relationConfig.service) {
            collection = $injector.get(relationConfig.service);
            if (!collection) {
              throw new Error('Unable to get service "' + relationConfig.service + '"');
            }
          } else {
            collection = $injector.get('sunRestRepository').get(relationConfig.resource);
            if (!collection) {
              throw new Error('Unable to get resource "' + relationConfig.resource + '"');
            }
          }
          return collection;
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
      function sunRestModelManager(model) {
        if (!this.schema) {
          throw new Error('Mngr must be contain schema');
        }
        // TODO Try to remove dependency
        Object.defineProperty(this, 'model', {
          value: model,
          enumerable: false
        });
        this.remoteFlag = false;
        this.modifyFlag = false;
        this.originalData = {};
        this.changedProperties = {};
        this.deleteFlag = false;
        this.populating = false;
        this.updateRelations();
      }
      sunRestModelManager.prototype.NEW = 'new';
      sunRestModelManager.prototype.DELETED = 'deleted';
      sunRestModelManager.prototype.DIRTY = 'dirty';
      sunRestModelManager.prototype.LOADED = 'loaded';
      sunRestModelManager.prototype.NORMALIZE_INCOMING = 'incoming';
      sunRestModelManager.prototype.NORMALIZE_OUTGOING = 'outgoing';
      sunRestModelManager.prototype.schema = undefined;
      sunRestModelManager.prototype.populate = function (data) {
        var properties = this.schema.properties;
        this.populating = true;
        data = this.normalizeData(data, this.NORMALIZE_INCOMING);
        angular.forEach(data, function (value, key) {
          if (properties[key] && properties[key].toNative) {
            value = properties[key].toNative.call(this, value);
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
        var returnData = {},
          value;
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
        var normalizedData = {},
          isOutgoing = way === this.NORMALIZE_OUTGOING;
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
        var promise, mngr = this,
          isNew = this.state === this.NEW,
          method = isNew ? 'POST' : sunRestConfig.updateMethod;
        params = angular.extend({}, this.schema.paramDefaults[isNew ? 'create' : 'update'], params);
        promise = this.simpleRequest(method, params, this.model);
        if (modifyLocal !== false) {
          promise = promise.then(function (response) {
            var obj = mngr.schema.dataExtractor(mngr.schema.dataItemLocation, response);
            mngr.populate(obj);
            return response;
          });
        }
        return promise;
      };
      sunRestModelManager.prototype.remove = function (params) {
        params = angular.extend({}, this.schema.paramDefaults.remove, params);
        return this.simpleRequest('DELETE', params, this.model);
      };
      sunRestModelManager.prototype.objectRequest = function (method, params, data) {
        var mngr = this;
        return this.simpleRequest(method, params, data).then(function (response) {
          var extracted;
          if (response.data) {
            var obj = mngr.schema.dataExtractor(mngr.schema.dataItemLocation, response);
            mngr.populate(obj);
          }
          response.resource = mngr.model;
          return response;
        }, function (response) {
          return $q.reject(response);
        });
      };
      sunRestModelManager.prototype.simpleRequest = function (method, params, data) {
        var promise, httpConfig = {
            method: method
          },
          schema = this.schema,
          self = this;
        if (hasBody(method)) {
          httpConfig.data = data;
        }
        params = params || {};
        if (data) {
          params[this.schema.routeIdProperty] = data[this.schema.routeIdProperty];
        }
        this.schema.router.buildConfig(httpConfig, angular.extend({}, this.extractParams(data), params));
        promise = this.schema.wrappedRequestInterceptor(this, httpConfig).then(function (newConfig) {
          return $http(newConfig);
        }).then(function (response) {
          response.resource = self.model;
          return schema.wrappedResponseInterceptor(self, response);
        });
        return promise;
      };
      sunRestModelManager.prototype.populateRelated = function (populateOptions) {
        var mngr = this;
        populateOptions = populateOptions || _.keys(this.schema.relations);
        var prom = _(populateOptions).map(function (name, opts) {
          var options = !_.isArray(populateOptions) ? opts : {};
          return mngr.related[name].request(options).$promise.then(function (resp) {
            mngr.model[name] = resp.resource;
            return resp;
          });
        }).value();
        return $q.all(prom);
      };
      sunRestModelManager.prototype.updateRelations = function () {
        var self = this;
        if (self.schema.relations) {
          var related = {};
          _.forEach(self.schema.relations, function (relationConfig, relationName) {
            if (!(relationConfig.service || relationConfig.resource)) {
              throw new Error('Inappropriate configuration of related item. Resource or service should be speccified');
            }
            if (relationConfig.isArray) {
              throw new Error('Not implemented to get arrays');
            }
            var sunRestNestedModelManager = $injector.get('sunRestNestedModelManager');
            related[relationName] = sunRestNestedModelManager.create(self.schema, self.model, getCollection(relationConfig));
          });
          this.related = related;
        }
      };
      Object.defineProperties(sunRestModelManager.prototype, {
        state: {
          get: function () {
            /*jslint white:true*/
            var state;
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
      sunRestModelManager.create = function (schema, overrides) {
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
        return child;
      };
      return sunRestModelManager;
    }
  ]);
  sunRest.factory('sunRestNestedModelManager', [
    '$http',
    '$q',
    '$injector',
    'sunUtils',
    'sunRestConfig',
    'sunRestRouter',
    'sunRestModelManager',
    'sunRestRouterNested',
    function ($http, $q, $injector, sunUtils, sunRestConfig, sunRestRouter, sunRestModelManager, sunRestRouterNested) {
      var sunRestNestedModelManager = function () {};
      sunRestNestedModelManager.create = function (baseSchema, defaults, subCollection) {
        // WARNING! hardcore govnokod!
        // Here must be created manager form parent with schema and nested router
        var nested = function sunRestNestedModelManager() {
          var schema = this.schema = Object.create(this.schema);
          this.schema.router = new sunRestRouterNested(baseSchema.router, defaults, this.schema.router.template, this.schema.router.defaults);
          var parentModelClass = this.schema.modelClass;
          var ChildModel = function () {
            this.schema = schema;
            var mngrClass = this.mngrClass;
            this.mngrClass = function () {
              this.schema = schema;
              mngrClass.apply(this, arguments);
            };
            this.mngrClass.prototype = Object.create(mngrClass.prototype);
            parentModelClass.apply(this, arguments);
          };
          ChildModel.prototype = parentModelClass.prototype;
          this.schema.modelClass = ChildModel;
        };
        nested.prototype = subCollection;
        return new nested();
      };
      return sunRestNestedModelManager;
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
        var ModelClass, modelProperties = {};
        ModelClass = sunUtils.inherit(schema.inherit || {}, sunRestBaseModel);
        _.forEach(schema.properties, function (prop, prop_name) {
          var customSetter = false,
            customGetter = false,
            customProperty = false,
            property = {
              enumerable: true
            };
          if (ModelClass.prototype[prop_name]) {
            customGetter = customSetter = customProperty = true;
          } else {
            customGetter = !!prop.getter;
            customSetter = !!prop.setter;
          }
          modelProperties['_' + prop_name] = {
            get: function () {
              return this['__' + prop_name];
            },
            set: function (value) {
              if (value !== this['__' + prop_name] && !this.mngr.populating) {
                if (value === this.mngr.originalData[prop_name]) {
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
          if (prop.getter !== null) {
            if (customGetter) {
              property.get = function () {
                return schema.properties[prop_name].getter.call(this, this['_' + prop_name]);
              };
            } else {
              property.get = function () {
                return this['_' + prop_name];
              };
            }
          }
          if (prop.setter !== null) {
            if (customSetter) {
              property.set = function (value) {
                var res = schema.properties[prop_name].setter.call(this, value);
                if (res !== undefined) {
                  this['_' + prop_name] = res;
                }
              };
            } else {
              property.set = function (value) {
                this['_' + prop_name] = value;
              };
            }
          }
          if (property.set || property.get) {
            modelProperties[prop_name] = property;
          }
        });
        Object.defineProperties(ModelClass.prototype, modelProperties);
        ModelClass.prototype.schema = schema;
        ModelClass.prototype.mngrClass = sunRestModelManager.create(schema, ModelClass.mngr);
        ModelClass.prototype.mngrClass.prototype.schema = schema;
        return ModelClass;
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
    'sunRestModelManager',
    function ($q, $http, sunUtils, sunRestConfig, sunRestModelFactory, sunRestModelManager) {
      function normalizeOptions(options, defaults) {
        if (_.isBoolean(options)) {
          options = {
            isArray: options
          };
        }
        options = options || {};
        return _.defaults(options, defaults);
      }

      function bindAll(k, that, to) {
        to = to || k;
        for (var prop in k) {
          if (k.hasOwnProperty(prop))
            to[prop] = _.bind(k[prop], that);
        }
      }
      var sunRestCollection = function (schema) {
        this.schema = schema;
        this.schema.modelClass = sunRestModelFactory(schema);
        bindAll(this.find, this);
        bindAll(this.query, this);
      };
      sunRestCollection.prototype.find = function (params, options) {
        options = normalizeOptions(options, {
          method: 'GET',
          params: params
        });
        return this.request(options);
      };
      sunRestCollection.prototype.find.one = function (params, options) {
        options = normalizeOptions(options, {
          isArray: false
        });
        return this.find(params, options);
      };
      sunRestCollection.prototype.find.all = function (data, params, options) {
        options = normalizeOptions(options, {
          isArray: true
        });
        return this.find(params, options);
      };
      sunRestCollection.prototype.query = function (data, params, options) {
        options = normalizeOptions(options, {
          method: 'POST',
          data: data,
          params: params
        });
        return this.request(options);
      };
      sunRestCollection.prototype.query.one = function (data, params, options) {
        options = normalizeOptions(options, {
          isArray: false
        });
        return this.query(data, params, options);
      };
      sunRestCollection.prototype.query.all = function (data, params, options) {
        options = normalizeOptions(options, {
          isArray: true
        });
        return this.query(data, params, options);
      };
      sunRestCollection.prototype.request = function (options) {
        options = options || {};
        var promise, id, httpConfig, value, dataLocation, Model = this.schema.modelClass,
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
          isArray = !(_.isObject(params) && params[this.schema.routeIdProperty]);
        }
        dataLocation = isArray === true ? this.schema.dataListLocation : this.schema.dataItemLocation;
        value = isArray ? [] : new Model();
        httpConfig = this.schema.router.buildConfig({
          method: method,
          data: data
        }, params);
        //noinspection UnnecessaryLocalVariableJS
        promise = this.schema.wrappedRequestInterceptor(this, httpConfig).then(function (newConfig) {
          return $http(newConfig);
        }).then(function (response) {
          return schema.wrappedResponseInterceptor(self, response);
        }).then(function (response) {
          var extracted, data = response.data,
            promise = value.$promise;
          if (data) {
            extracted = sunUtils.stringJsonParser(dataLocation, data);
            if (isArray) {
              value.length = 0;
              angular.forEach(extracted, function (item) {
                var model = new Model();
                model.mngr.populate(item);
                value.push(model);
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
        if (options.populateRelated) {
          promise = promise.then(function (resp) {
            var prom = _(isArray ? resp.resource : [resp.resource]).map(function (obj) {
              return obj.mngr.populateRelated(!_.isBoolean(options.populateRelated) ? options.populateRelated : undefined);
            }).value();
            return $q.all(prom).then(function () {
              return resp;
            });
          });
        }
        value.$promise = promise;
        value.$resolved = false;
        return value;
      };
      sunRestCollection.prototype.create = function (data) {
        return new this.schema.modelClass(data);
      };
      Object.defineProperty(sunRestCollection.prototype, 'model', {
        get: function () {
          return this.schema.modelClass;
        }
      });
      return sunRestCollection;
    }
  ]);
}(angular));
