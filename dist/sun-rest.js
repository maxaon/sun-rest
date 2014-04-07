(function (angular) {
  'use strict';
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
  'use strict';
  var sunRest = angular.module('sun.rest', ['sun.utils']);
  'use strict';
  sunRest.provider('sunRestConfig', function () {
    var baseUrl = '',
      responseDataLocation = '',
      modelIdProperty = 'id',
      updateMethod = 'PUT',
      updatePartial = false,
      propertyModifier, requestInterceptor, requestErrorInterceptor, responseInterceptor, responseErrorInterceptor, properties, dataExtractor;
    properties = {
      baseUrl: {
        get: function () {
          return baseUrl;
        },
        set: function (value) {
          if (value.lastIndexOf('/') === value.length - 1) {
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
    this.$get = function () {
      return Object.defineProperties({}, _.mapValues(properties, function (param) {
        return {
          get: param.get
        };
      }));
    };
  });
  'use strict';
  sunRest.factory('sunRestSchema', [
    '$q',
    'sunUtils',
    'sunRestConfig',
    function ($q, sunUtils, sunRestConfig) {
      function sunRestSchema(properties) {
        angular.extend(this, this.defaultProperties, properties);
        if (!this.routeIdProperty) {
          this.routeIdProperty = this.extractRouteIdProperty(this.route);
        }
        if (this.propertyModifier) {
          this.applyPropertyModifier(this.properties, this.propertyModifier);
        }
      }
      sunRestSchema.prototype.defaultProperties = {
        name: null,
        route: null,
        idProperty: sunRestConfig.modelIdProperty,
        routeIdProperty: null,
        properties: {},
        relations: {},
        dataListLocation: sunRestConfig.responseDataLocation,
        dataItemLocation: sunRestConfig.responseDataLocation,
        autoParse: true,
        requestInterceptor: sunRestConfig.requestInterceptor,
        responseInterceptor: sunRestConfig.responseInterceptor,
        isArray: sunRestConfig.isArray,
        paramDefaults: {},
        propertyModifier: sunRestConfig.propertyModifier,
        dataExtractor: sunRestConfig.dataExtractor
      };
      sunRestSchema.prototype.extractRouteIdProperty = function (route) {
        var keys = route.match(/:\w[\w0-9-_]*/g);
        if (keys.length === 0) {
          return null;
        }
        return keys[keys.length - 1].slice(1);
      };
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
  'use strict';
  sunRest.factory('sunRestRouter', [
    'sunRestConfig',
    function (sunRestConfig) {
      function encodeUriQuery(val, pctEncodeSpaces) {
        return encodeURIComponent(val).replace(/%40/gi, '@').replace(/%3A/gi, ':').replace(/%24/g, '$').replace(/%2C/gi, ',').replace(/%20/g, pctEncodeSpaces ? '%20' : '+');
      }

      function encodeUriSegment(val) {
        return encodeUriQuery(val, true).replace(/%26/gi, '&').replace(/%3D/gi, '=').replace(/%2B/gi, '+');
      }

      function sunRestRouter(template, defaults) {
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
            if (actionUrl && actionUrl.indexOf('/') !== 0) {
              url = this.template + '/' + actionUrl;
            } else if (actionUrl) {
              url = actionUrl;
            }
            url = sunRestConfig.baseUrl + url;
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
          url = url.replace(/\/+$/, '') || '/';
          url = url.replace(/\/\.(?=\w+($|\?))/, '.');
          config.url = url.replace(/\/\\\./, '/.');
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
  'use strict';
  sunRest.factory('sunRestBaseModel', function () {
    var BaseModel = function (data) {
      Object.defineProperty(this, 'mngr', {
        value: new this.constructor.mngrClass(this),
        enumerable: false
      });
      if (!_.isEmpty(data)) {
        this.mngr.populate(data);
      }
    };
    BaseModel.prototype.constructor = BaseModel;
    BaseModel.prototype.toJSON = function () {
      return this.mngr.toJSON();
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

      function sunRestModelManager(model, schema, modelClass) {
        this.model = model;
        if (schema) {
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
      }
      sunRestModelManager.prototype.NEW = 'new';
      sunRestModelManager.prototype.DELETED = 'deleted';
      sunRestModelManager.prototype.DIRTY = 'dirty';
      sunRestModelManager.prototype.LOADED = 'loaded';
      sunRestModelManager.prototype.NORMALIZE_INCOMING = 'incoming';
      sunRestModelManager.prototype.NORMALIZE_OUTGOING = 'outgoing';
      sunRestModelManager.prototype.populate = function (data) {
        var properties = this.schema.properties;
        data = this.normalizeData(data, this.NORMALIZE_INCOMING);
        angular.forEach(data, function (value, key) {
          if (properties[key] && properties[key].toNative) {
            value = properties[key].toNative(value);
          }
          this['__' + key] = value;
        }, this.model);
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
              value.populate(extracted);
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
      function DefaultChild(data) {
        this.$super.constructor.call(this, data);
      }

      function sunRestModelFactory(schema) {
        var Model, modelProperties = {};
        Model = sunUtils.inherit(schema.inherit || DefaultChild, sunRestBaseModel);
        _.forEach(schema.properties, function (value, key) {
          var customSetter = false,
            customGetter = false,
            customProperty = false,
            defaultGetMethod, defaultSetMethod;
          if (Model.prototype[key]) {
            customGetter = customSetter = customProperty = true;
          } else {
            customGetter = !! schema.properties[key].getter;
            customSetter = !! schema.properties[key].setter;
          }
          modelProperties['_' + key] = {
            get: function () {
              return this['__' + key];
            },
            set: function (value) {
              if (value !== this['__' + key]) {
                if (value === this.mngr.originalData[key]) {
                  delete this.mngr.changedProperties[key];
                  this.mngr.modifyFlag = Object.keys(this.mngr.changedProperties).length > 0;
                } else {
                  this.mngr.changedProperties[key] = true;
                  this.mngr.modifyFlag = true;
                }
              }
              this['__' + key] = value;
            }
          };
          if (customProperty) {
            return;
          }
          if (customGetter) {
            defaultGetMethod = function () {
              return schema.properties[key].getter.call(this, this['_' + key]);
            };
          } else {
            defaultGetMethod = function () {
              return this['_' + key];
            };
          }
          if (customSetter) {
            defaultSetMethod = function (value) {
              this['_' + key] = schema.properties[key].setter.call(this, value);
            };
          } else {
            defaultSetMethod = function (value) {
              this['_' + key] = value;
            };
          }
          modelProperties[key] = {
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
  'use strict';
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
        promise = $http(httpConfig).then(function (response) {
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
          name = schema[name];
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
