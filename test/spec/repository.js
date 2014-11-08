/**
 * Created by maxaon on 14.01.14.
 */
var custom = {
  toBeInstanceOf: function (util, customEqualityTesters) {
    return {
      compare: function (actual, expected) {
        'use strict';
        var result = {};
        result.pass = actual instanceof expected;
        result.message = 'Expected ' + (actual) + (result.pass ? ' not' : '') + ' to be instance of ' + expected;
        return result;
      }
    };
  }
};
function userSchema(override) {
  'use strict';
  return _.merge(
    {},
    {
      name: 'User',
      route: '/controllers/:id',
      properties: {
        id: {},
        title: {},
        description: {},
        licenseType: {},
        devices: {}
      }
    },
    override
  );
}
beforeEach(function () {
  jasmine.addMatchers(custom);
});

function model(id, override) {
  'use strict';
  if (_.isObject(id)) {
    override = id;
    id = undefined;
  }
  id = id || 12;

  return _.merge({},
    {
      title: 'Home ' + id,
      description: 'Controller in the home',
      devices: [1, 2, 3],
      id: id,
      licenseType: 1
    },
    override);
}

describe('Rest creation', function () {
  'use strict';
  var $httpBackend, RestRepository;
  beforeEach(module('sun.rest'));
  beforeEach(inject(function (_$httpBackend_, _sunRestRepository_) {
    $httpBackend = _$httpBackend_;
    RestRepository = _sunRestRepository_;
  }));


  it('should retrieve object', function () {
    var globalRepo = RestRepository.create(userSchema());
    $httpBackend.expect('GET', '/controllers').respond([model()]);
    var obj = globalRepo.find();
    expect(obj.length).toBe(0);
    $httpBackend.flush();
    expect(obj.length).toBe(1);
    expect(obj[0]).toBeInstanceOf(globalRepo.model);
    expect(obj[0].title).toBe('Home 12');
    expect(obj[0].devices).toEqual([1, 2, 3]);
  });
  it('should create new object', function () {
    var globalRepo = RestRepository.create(userSchema());
    var obj = new globalRepo.model();
    expect(obj.mngr.state).toBe(obj.mngr.NEW);
    angular.extend(obj, model());
    obj.id = undefined;
    $httpBackend.expect('POST', '/controllers').respond([model()]);
    obj.mngr.save();
    $httpBackend.flush();
  });
  it('should make two responses', function () {
    var globalRepo = RestRepository.create(userSchema());
    $httpBackend.expect('GET', '/controllers').respond([model()]);
    var objs = globalRepo.find();
    $httpBackend.flush();
    expect(objs.length).toBe(1);
    $httpBackend.expect('GET', '/controllers').respond([model()]);
    objs = globalRepo.find();
    $httpBackend.flush();
    expect(objs.length).toBe(1);
  });
  it('Should save object save ', function () {
    var globalRepo = RestRepository.create(userSchema());
    $httpBackend.expect('GET', '/controllers/12').respond(model());
    var obj = globalRepo.find(12);
    $httpBackend.flush();
    expect(obj.mngr.state).toBe(obj.mngr.LOADED);
    obj.title = 'New title';
    expect(obj.mngr.state).toBe(obj.mngr.DIRTY);
    $httpBackend
      .expect('PUT', '/controllers/12', model({title: 'New title'}))
      .respond(model({title: 'ServerSideTitle'}));
    obj.mngr.save();
    $httpBackend.flush();
    expect(obj.mngr.state).toBe(obj.mngr.LOADED);
    expect(obj.title).toBe('ServerSideTitle');
  });
  it('should delete object object', function () {
    var globalRepo = RestRepository.create(userSchema());
    $httpBackend.expect('GET', '/controllers/12').respond(model());
    var obj = globalRepo.find(12);
    $httpBackend.flush();
    $httpBackend.expect('DELETE', '/controllers/12').respond(204);
    obj.mngr.remove();
    $httpBackend.flush();
  });
  it('should copy model data', function () {
    var repo = RestRepository.create(userSchema());
    $httpBackend.expect('GET', '/controllers').respond([model()]);
    var obj = repo.find();
    $httpBackend.flush();
    obj = obj[0];
    var obj_copy = angular.copy(obj);
    expect(obj_copy).toBeDefined();
    expect(obj_copy).not.toBe(obj);
    expect(obj.mngr).toBeDefined();
    expect(obj_copy.mngr).toBeUndefined();

  });
  it('should set default values', function () {
    var ref = [3, 4, 5];
    var collection = RestRepository.create(userSchema(
        {
          properties: {
            title: {"default": "DefaultTitle"},
            devices: {
              "default": function () {
                return ref;
              }
            },
            enabled: {"default": true}
          }
        }
      )
    );
    var obj = collection.create();
    expect(obj.title).toBe("DefaultTitle");
    expect(obj.enabled).toBe(true);
    expect(obj.mngr.state).toBe(obj.mngr.NEW);
    $httpBackend.expect('POST', '/controllers', {
      title: "DefaultTitle",
      devices: ref,
      enabled: true
    }).respond(model({title: "DefaultTitle", devices: ref}));
    obj.mngr.save();
    $httpBackend.flush();

    $httpBackend.expect('GET', '/controllers').respond([model()]);
    obj = collection.find();
    $httpBackend.flush();
    expect(obj[0].enabled).toBe(true);
    //expect(obj).toBeDefined();
    //expect(obj_copy).not.toBe(obj);
    //expect(obj.mngr).toBeDefined();
    //expect(obj_copy.mngr).toBeUndefined();

  });


})
;
describe('Rest custom creation', function () {
  'use strict';
  var $httpBackend, RestRepository;
  beforeEach(module('sun.rest'));
  beforeEach(inject(function (_$httpBackend_, _sunRestRepository_) {
    $httpBackend = _$httpBackend_;
    RestRepository = _sunRestRepository_;
  }));
  it('should create custom property object', function () {
    var obj, repo, ControllerModel;
    ControllerModel = function (data) {
      //noinspection JSLint
      this.$super.constructor.call(this, data);
    };
    ControllerModel.prototype.testFunction = function () {
      return this._title;
    };
    Object.defineProperty(ControllerModel.prototype, 'licenseTypeText', {
      get: function () {
        return {1: 'activated', 2: 'superNew'}[this.licenseType] || 'This is a prop';
      }
    });
    repo = RestRepository.create(userSchema({inherit: ControllerModel}));
    $httpBackend.expect('GET', '/controllers/12').respond(model());
    obj = repo.find(12);
    $httpBackend.flush();
    expect(obj.id).toBe(12);
    expect(obj.testFunction()).toBe('Home 12');
    expect(obj.licenseTypeText).toBe('activated');
  });
  it('should extend manager method', function () {
    var obj, repo, ControllerModel;
    ControllerModel = function (data) {
      this.$super.constructor.call(this, data);
    };
    ControllerModel.mngr = {
      managerMethod: function () {
        return this.state;
      }
    };
    repo = RestRepository.create(userSchema({inherit: ControllerModel}));
    $httpBackend.when('GET', '/controllers/12').respond(model());
    obj = repo.find(12);
    $httpBackend.flush();
    expect(obj.mngr.managerMethod).toBeDefined();
    expect(obj.mngr.managerMethod()).toBe(obj.mngr.LOADED);
  });
  it('should modify first letter in property from uppercase to lowercase', function () {
    var obj, repo, model;
    repo = RestRepository.create(userSchema({
      propertyModifier: function (prop, name) {
        if (!prop.remoteProperty) {
          prop.remoteProperty = name[0].toUpperCase() + name.slice(1);
        }
      }
    }));
    model = {
      Title: 'Home 12',
      Description: 'Controller in the home',
      Devices: [1, 2, 3],
      Id: 12,
      LicenseType: 1
    };
    $httpBackend.expect('GET', '/controllers/12').respond(model);
    obj = repo.find(12);
    $httpBackend.flush();
    expect(obj.title).toBe('Home 12');
    expect(obj.licenseType).toBe(1);
    obj.title = 'New home title';
    model = _.extend({}, model, {Title: 'New home title'});
    $httpBackend.expect('PUT', '/controllers/12', model).respond(_.extend({}, model, {Title: 'Server side title'}));
    obj.mngr.save();
    $httpBackend.flush();
    expect(obj.title).toBe('Server side title');
  });
});
describe('Repository creation with configuration', function () {
  'use strict';
  beforeEach(module('sun.rest'));
  it('should work with other baseUrl', function () {
    module(function (sunRestConfigProvider) {
      sunRestConfigProvider.baseUrl = 'http://api.example.com:1209/api/';
    });
    inject(function (sunRestRepository, $httpBackend) {
      var obj, repo = sunRestRepository.create(userSchema());
      $httpBackend.expect('GET', 'http://api.example.com:1209/api/controllers/12').respond(model());
      obj = repo.find(12);
      $httpBackend.flush();
      expect(obj.id).toBe(12);
    });
  });
});
describe('Repository with related objects', function () {
  beforeEach(module('sun.rest'));
  it('should retrive related repository by collection', function () {
    module(function ($provide, sunRestConfigProvider) {
      sunRestConfigProvider.baseUrl = "http://api.site.com:8080/v1";
      $provide.factory('PrimaryCollection', function (sunRestRepository) {
        return sunRestRepository.create(userSchema({
          properties: {
            billId: {}
          },
          relations: {
            bills: {
              service: 'BillsCollection',
              property: 'billId'
            }
          }
        }));
      });
      $provide.factory('BillsCollection', function (sunRestRepository) {
        return sunRestRepository.create('bills', {
          route: '/bills/:id',
          properties: {
            id: {},
            name: {}
          }
        });
      });


    });
    inject(function ($httpBackend, PrimaryCollection, sunRestNestedModelManager) {
      $httpBackend.expect('GET', 'http://api.site.com:8080/v1/controllers/12').respond(model());
      $httpBackend.expect('GET', 'http://api.site.com:8080/v1/controllers/12/bills').respond([
        {id: 1, name: "bill1"},
        {id: 2, name: "bill2"}
      ]);
      var obj = PrimaryCollection.find(12, {populateRelated: true});
      $httpBackend.flush();
      expect(obj.title).toBe("Home 12");
      expect(obj.bills).toBeDefined();
      expect(obj.bills.length).toBeDefined(2);
      expect(obj.bills[0].name).toBe('bill1');
      expect(obj.bills[1].name).toBe('bill2');
      expect(obj.mngr.related.bills).not.toBeNull();
      var bill = obj.mngr.related.bills.create();
      bill.name = "bill3";
      $httpBackend.expect('POST', 'http://api.site.com:8080/v1/controllers/12/bills', {"name": "bill3"})
        .respond({id: 3, name: "bill3"});
      bill.mngr.save();
      $httpBackend.flush();

      $httpBackend.expect('GET', 'http://api.site.com:8080/v1/controllers/13').respond(model(13));
      $httpBackend.expect('GET', 'http://api.site.com:8080/v1/controllers/13/bills').respond([
        {id: 1, name: "bill1"},
        {id: 2, name: "bill2"}
      ]);
      var obj2 = PrimaryCollection.find(13, {populateRelated: true});
      $httpBackend.flush();
      obj.bills[1].name = "name";
      $httpBackend.expect('PUT', 'http://api.site.com:8080/v1/controllers/12/bills/2', {"id": 2, "name": "name"})
        .respond({"id": 2, "name": "name"});
      obj.bills[1].mngr.save();
      $httpBackend.flush();
      obj2.bills[0].name = "name13";
      $httpBackend.expect('PUT', 'http://api.site.com:8080/v1/controllers/13/bills/1?param=-1', {
        "id": 1,
        "name": "name13"
      })
        .respond({"id": 1, "name": "nameUpd"});
      obj2.bills[0].mngr.save({param: -1});
      $httpBackend.flush();

    });

  })
});