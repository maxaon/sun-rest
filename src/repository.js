'use strict';
/* global sunRest */
sunRest.factory('sunRestRepository', function (sunRestSchema, sunRestCollection) {
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

});
