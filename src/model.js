'use strict';
/* global sunRest */
sunRest.factory('sunRestBaseModel', function () {
  /**
   * @ngdoc object
   * @name sunRest.sunRestBaseModel
   * @property {string} ppp
   * @typedef {object} sunRestBaseModel
   */
  var BaseModel = function (data) {
    Object.defineProperty(this, 'mngr', {
      value     : new this.constructor.mngrClass(this),
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
sunRest.factory('sunRestModelManager', function ($http, $q, sunUtils, sunRestConfig, sunRestRouter) {
  //region Dotted path
  var MEMBER_NAME_REGEX = /^(\.[a-zA-Z_$][0-9a-zA-Z_$]*)+$/;

  function hasBody(method) {
    return (['POST', 'PUT', 'PATCH']).indexOf(method.toUpperCase()) > -1;
  }

  function isValidDottedPath(path) {
    return (path !== null && path !== '' && path !== 'hasOwnProperty' &&
      MEMBER_NAME_REGEX.test('.' + path));
  }

  function lookupDottedPath(obj, path) {
    if (!isValidDottedPath(path)) {
      throw new Error('Dotted member path "@{' + path + '}" is invalid.');
    }
    var i, ii, key,
      keys = path.split('.');
    for (i = 0, ii = keys.length; i < ii && obj !== undefined; i++) {
      key = keys[i];
      obj = (obj !== null) ? obj[key] : undefined;
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
    this.model = model;
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
    var normalizedData = {},
      isOutgoing = (way === this.NORMALIZE_OUTGOING);
    if (!data) {
      return {};
    }

    _.forEach(this.schema.properties, function (prop, name) {
      var remoteProperty = (prop.remoteProperty ? prop.remoteProperty : name),
        normalizedKey = (isOutgoing ? remoteProperty : name),
        noneNormalizedKey = (isOutgoing ? name : remoteProperty);

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
      ids[key] = value &&
        value.charAt &&
        value.charAt(0) === '@' ? lookupDottedPath(data, value.substr(1)) : value;
    });
    return ids;
  };
  sunRestModelManager.prototype.save = function (params, modifyLocal) {
    var model, promise,
      isNew = (this.state === this.NEW),
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
    var promise,
      Model = this.modelClass,
      dataLocation = (isArray === true ? this.schema.dataListLocation : this.schema.dataItemLocation),
      value = isArray ? [] : (new Model(data)),
      schema = this.schema;

    promise = this.simpleRequest(method, params, data)
      .then(function (response) {
        var extracted;

        if (response.data) {
          extracted = schema.dataExtractor(dataLocation, response);
          if (isArray) {
            value.length = 0;
            angular.forEach(extracted, function (item) {
              value.push(new Model(item));
            });
          } else {
            value.populate(extracted);//shallowClearAndCopy(data, value);
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
    var promise,
      httpConfig = {method: method},
      schema = this.schema;

    if (hasBody(method)) {
      httpConfig.data = data;
    }
    params = params || {};
    if (data) {
      params[this.schema.idProperty] = data[this.schema.idProperty];
    }

    this.route.buildConfig(httpConfig,
      angular.extend({}, this.extractParams(data), params));
    promise = this.schema.wrappedRequestInterceptor(this, httpConfig)
      .then(function (newConfig) {
        return $http(newConfig);
      }).then(function (response) {
        return schema.wrappedResponseInterceptor(this, response, path)
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

        if (!this.remoteFlag) {
          state = this.NEW;
        }
        else if (this.deleteFlag) {
          state = this.DELETED;
        }
        else if (this.modifyFlag) {
          state = this.DIRTY;
        }
        else {
          state = this.LOADED;
        }
        return state;
      }
    },

    isRemote: {
      get: function () {
        return (this.remoteFlag && !this.deleteFlag);
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
});
sunRest.factory('sunRestModelFactory', function (sunUtils, sunRestBaseModel, sunRestModelManager) {

  function DefaultChild(data) {
    this.$super.constructor.call(this, data);
  }

  /**
   * Name sunRestModelFactory
   * @param schema
   * @returns {*}
   * @constructor
   */
  function sunRestModelFactory(schema) {
    var Model, modelProperties = {};

    Model = sunUtils.inherit(schema.inherit || DefaultChild, sunRestBaseModel);
    _.forEach(schema.properties, function (value, key) {
      var customSetter = false,
        customGetter = false,
        customProperty = false,
        defaultGetMethod,
        defaultSetMethod;
      if (Model.prototype[key]) {
        customGetter = customSetter = customProperty = true;
      } else {
        customGetter = !!schema.properties[key].getter;
        customSetter = !!schema.properties[key].setter;
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
});

