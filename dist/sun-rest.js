/*! maxaon's sun.rest module*/
(function (angular) {
  'use strict';
  var module;

  angular.module('sun.rest.config', []).provider('RestConfig', function () {
    var requestFormatter, strictMode = false,
      baseUrl = '',
      responseDataLocation = '',
      modelIdProperty = 'id',
      updateMethod = 'PUT',
      flattenItemRoute = false,
      validateOnSync = true,
      isArray = null,
      properties;
    requestFormatter = function () {};
    properties = {
      strictMode: {
        get: function () {
          return strictMode;
        },
        set: function (value) {
          strictMode = value;
        }
      },
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
      flattenItemRoute: {
        get: function () {
          return flattenItemRoute;
        },
        set: function (value) {
          flattenItemRoute = value;
        }
      },
      requestFormatter: {
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
      validateOnSync: {
        get: function () {
          return validateOnSync;
        },
        set: function (value) {
          validateOnSync = value;
        }
      },
      isArray: {
        get: function () {
          return isArray;
        },
        set: function (value) {
          isArray = value;
        }
      }
    };
    Object.defineProperties(this, properties);
    this.$get = function () {
      var a = {};
      Object.defineProperties(a, _.mapValues(properties, function (param) {
        return {
          get: param.get
        };
      }));
      return a;
    };
  });

  module = angular.module('sun.rest.manager', [
    'sun.utils',
    'sun.rest.config',
    'sun.rest.router'
  ]);
  module.factory('ModelManager', [
    '$http',
    '$q',
    'sunUtils',
    'RestConfig',
    'Router',
    function ($http, $q, sunUtils, RestConfig, Router) {
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

      function ModelManager(model, schema, modelClass) {
        if (schema) {
          this.schema = schema;
        }
        if (modelClass) {
          this.modelClass = modelClass;
        }
        this.remoteFlag = false;
        this.modifyFlag = false;
        this.model = model;
        this.originalData = {};
        this.changedProperties = {};
        this.deleteFlag = false;
        this.route = new Router(this.schema.route);
      }
      ModelManager.prototype.NEW = 'new';
      ModelManager.prototype.DELETED = 'deleted';
      ModelManager.prototype.DIRTY = 'dirty';
      ModelManager.prototype.LOADED = 'loaded';
      ModelManager.prototype.NORMALIZE_INCOMING = 'incoming';
      ModelManager.prototype.NORMALIZE_OUTGOING = 'outgoing';
      ModelManager.prototype.populate = function (data) {
        angular.forEach(data, function (value, key) {
          this['__' + key] = value;
        }, this.model);
        this.remoteFlag = true;
        this.modifyFlag = false;
        this.changedProperties = {};
        this.originalData = data;
      };
      ModelManager.prototype.reset = function () {
        var saveRemoteFlag = this.remoteFlag;
        this.populate(this.originalData);
        this.remoteFlag = saveRemoteFlag;
      };
      ModelManager.prototype.toJSON = function () {
        var returnData = {};
        _.forEach(this.schema.properties, function (value, key) {
          returnData[key] = this.model['_' + key];
        }, this);
        return returnData;
      };
      ModelManager.prototype.normalizeData = function (data, way) {
        var normalizedData = {}, isOutgoing = way === this.NORMALIZE_OUTGOING;
        _.forEach(this.schema.properties, function (prop, name) {
          var remoteProperty = prop.remoteProperty ? prop.remoteProperty : name,
            normalizedKey = isOutgoing ? remoteProperty : name,
            noneNormalizedKey = isOutgoing ? name : remoteProperty;
          normalizedData[normalizedKey] = data[noneNormalizedKey] || data[name];
        });
        return normalizedData;
      };
      ModelManager.prototype.extractParams = function (data, actionParams) {
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
      ModelManager.prototype.save = function (params, modifyLocal) {
        var model, promise, isNew = this.state === this.NEW,
          method = isNew ? 'POST' : RestConfig.updateMethod;
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
      ModelManager.prototype.remove = function (params) {
        params = angular.extend({}, this.schema.paramDefaults.remove, params);
        return this.simpleRequest('DELETE', params);
      };
      ModelManager.prototype.objectRequest = function (method, isArray, params, data) {
        var promise, Model = this.modelClass,
          dataLocation = isArray === true ? this.schema.dataListLocation : this.schema.dataItemLocation,
          value = isArray ? [] : new Model(data);
        promise = this.simpleRequest(method, params, data).then(function (response) {
          var data, promise, extracted;
          data = response.data;
          promise = value.$promise;
          if (data) {
            extracted = sunUtils.stringJsonParser(dataLocation, data);
            if (isArray) {
              value.length = 0;
              angular.forEach(extracted, function (item) {
                value.push(new Model(item));
              });
            } else {
              value.populate(extracted);
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
      ModelManager.prototype.simpleRequest = function (method, params, data, path) {
        var promise, httpConfig = {
            method: method
          };
        if (hasBody(method)) {
          httpConfig.data = data;
        }
        params = params || {};
        if (data) {
          params[this.schema.idProperty] = data[this.schema.idProperty];
        }
        this.route.buildConfig(httpConfig, angular.extend({}, this.extractParams(data), params));
        if (params.data) {
          params.data = this.normalizeData(params.data, this.NORMALIZE_OUTGOING);
        }
        promise = $http(httpConfig);
        if (angular.isDefined(path)) {
          promise = promise.then(function (response) {
            return sunUtils.stringJsonParser(path, response.data);
          });
        }
        return promise;
      };
      Object.defineProperties(ModelManager.prototype, {
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
      ModelManager.create = function (schema, model, overrides) {
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
        sunUtils.inherit(child, ModelManager);
        child.prototype.schema = schema;
        child.prototype.modelClass = model;
        return child;
      };
      return ModelManager;
    }
  ]);

  module = angular.module('sun.rest.model', [
    'sun.rest.manager',
    'sun.utils'
  ]);
  module.factory('modelFactory', [
    'sunUtils',
    'ModelManager',
    function (sunUtils, ModelManager) {
      var BaseModel = function (data) {
        this.mngr = new this.constructor.mngrClass(this);
        if (!_.isEmpty(data)) {
          this.mngr.populate(data);
        }
      };
      BaseModel.prototype.constructor = BaseModel;
      BaseModel.prototype.toJSON = function () {
        return this.mngr.toJSON();
      };
      BaseModel.get = function (id, params) {
        var keys = this.mngr.schema.route.match(/:\w[\w0-9-_]*/g);
        params = params || {};
        params[keys[keys.length - 1]] = id;
        return this.mngr.objectRequest('GET', false, params);
      };
      BaseModel.query = function (params) {
        return this.mngr.objectRequest('GET', true, params);
      };
      BaseModel.fetch = BaseModel.query;

      function DefaultChild(data) {
        this.$super.constructor.call(this, data);
      }

      function modelFactory(schema) {
        var Model, modelProperties = {};
        Model = sunUtils.inherit(schema.inherit || DefaultChild, BaseModel);
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
        Model.mngrClass = ModelManager.create(schema, Model, Model.mngr);
        return Model;
      }
      modelFactory.BaseModel = BaseModel;
      return modelFactory;
    }
  ]);

  module = angular.module('sun.rest', [
    'sun.utils',
    'sun.rest.config',
    'sun.rest.model',
    'sun.rest.router'
  ]);
  module.factory('RestRepository', [
    '$q',
    '$http',
    'sunUtils',
    'RestConfig',
    'modelFactory',
    'Router',
    function ($q, $http, sunUtils, RestConfig, modelFactory, Router) {
      var RestResource = function (schema) {
        this.schema = schema;
        this.router = new Router(schema.route);
        this.model = modelFactory(schema);
      };
      RestResource.prototype.find = function (params, postData) {
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

      function Schema(properties) {
        angular.extend(this, {
          name: null,
          route: null,
          idProperty: RestConfig.modelIdProperty,
          routeIdProperty: null,
          properties: {},
          relations: {},
          dataListLocation: RestConfig.responseDataLocation,
          dataItemLocation: RestConfig.responseDataLocation,
          autoParse: true,
          requestFormatter: RestConfig.requestFormatter,
          isArray: RestConfig.isArray,
          flattenItemRoute: RestConfig.flattenItemRoute,
          modal: {},
          inherit: null,
          paramDefaults: {}
        }, properties);
        if (!this.routeIdProperty) {
          var keys = this.route.match(/:\w[\w0-9-_]*/g);
          this.routeIdProperty = keys[keys.length - 1].slice(1);
        }
      }
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
          schema = new Schema(schema);
          this.resources[name] = new RestResource(schema);
          return this.resources[name];
        },
        get: function (name) {
          return this.resources[name];
        }
      };
    }
  ]);

  module = angular.module('sun.rest.router', ['sun.rest.config']);
  module.factory('Router', [
    'RestConfig',
    function (RestConfig) {
      function encodeUriQuery(val, pctEncodeSpaces) {
        return encodeURIComponent(val).replace(/%40/gi, '@').replace(/%3A/gi, ':').replace(/%24/g, '$').replace(/%2C/gi, ',').replace(/%20/g, pctEncodeSpaces ? '%20' : '+');
      }

      function encodeUriSegment(val) {
        return encodeUriQuery(val, true).replace(/%26/gi, '&').replace(/%3D/gi, '=').replace(/%2B/gi, '+');
      }

      function Router(template, defaults) {
        this.template = template;
        this.defaults = defaults || {};
        this.urlParams = {};
      }
      Router.prototype = {
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
            url = RestConfig.baseUrl + url;
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
      return Router;
    }
  ]);


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
}(angular));
