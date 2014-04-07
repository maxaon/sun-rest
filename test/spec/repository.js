/**
 * Created by maxaon on 14.01.14.
 */
//noinspection JSAccessibilityCheck
jasmine.Matchers.prototype.toBeInstanceOf = function (expected) {
  'use strict';
  this.message = function () {
    return 'Expected ' + (this.actual) + (this.isNot ? ' not' : '') + ' to be instance of ' + expected;
  }.bind(this);
  return this.actual instanceof expected;
};
function userSchema(override) {
  'use strict';
  return _.merge(
    {},
    {
      name      : 'User',
      route     : '/controllers/:id',
      properties: {
        id         : {},
        title      : {},
        description: {},
        licenseType: {},
        devices    : {}
      }
    },
    override
  );
}

function model(id, override) {
  'use strict';
  if (_.isObject(id)) {
    override = id;
    id = undefined;
  }
  id = id || 12;

  return _.merge({},
    {
      title      : 'Home ' + id,
      description: 'Controller in the home',
      devices    : [1, 2, 3],
      id         : id,
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


  it('should create repository', function () {
    var repo = RestRepository.create(userSchema());

    describe('should make rest requests', function () {

      it('should retrieve object', function () {
        $httpBackend.expect('GET', '/controllers').respond([model()]);
        var obj = repo.find();
        expect(obj.length).toBe(0);
        $httpBackend.flush();
        expect(obj.length).toBe(1);
        expect(obj[0]).toBeInstanceOf(repo.model);
        expect(obj[0].title).toBe('Home 12');
        expect(obj[0].devices).toEqual([1, 2, 3]);
      });
      it('should create new object', function () {
        var obj = new repo.model();
        expect(obj.mngr.state).toBe(obj.mngr.NEW);
        angular.extend(obj, model());
        obj.id = undefined;
        $httpBackend.expect('POST', '/controllers').respond([model()]);
        obj.mngr.save();
        $httpBackend.flush();
      });
      it('should make two responses', function () {
        $httpBackend.expect('GET', '/controllers').respond([model()]);
        var objs = repo.find();
        $httpBackend.flush();
        expect(objs.length).toBe(1);
        $httpBackend.expect('GET', '/controllers').respond([model()]);
        objs = repo.find();
        $httpBackend.flush();
        expect(objs.length).toBe(1);
      });
      it('Should save object save ', function () {
        $httpBackend.expect('GET', '/controllers/12').respond(model());
        var obj = repo.find(12);
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
    });
  });
});
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
    repo = RestRepository.create(userSchema({ inherit: ControllerModel }));
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
    repo = RestRepository.create(userSchema({propertyModifier: function (prop, name) {
      if (!prop.remoteProperty) {
        prop.remoteProperty = name[0].toUpperCase() + name.slice(1);
      }
    }
    }));
    model = {
      Title      : 'Home 12',
      Description: 'Controller in the home',
      Devices    : [1, 2, 3],
      Id         : 12,
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
    module(function (RestConfigProvider) {
      RestConfigProvider.baseUrl = 'http://api.example.com:1209/api/';
    });
    inject(function (RestRepository, $httpBackend) {
      var obj, repo = RestRepository.create(userSchema());
      $httpBackend.expect('GET', 'http://api.example.com:1209/api/controllers/12').respond(model());
      obj = repo.find(12);
      $httpBackend.flush();
      expect(obj.id).toBe(12);
    });
  });
});