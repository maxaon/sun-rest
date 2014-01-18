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
  beforeEach(inject(function (_$httpBackend_, _RestRepository_) {
    $httpBackend = _$httpBackend_;
    RestRepository = _RestRepository_;
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
      it('should make teo responses', function () {
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
        obj.title = 'New title';
        $httpBackend
          .expect('PUT', '/controllers/12', model({title: 'New title'}))
          .respond(model({title: 'ServerSideTitle'}));
        obj.mngr.save();
        $httpBackend.flush();
        expect(obj.title).toBe('ServerSideTitle');
      });
    });
  });
});
describe('Rest custom creation', function () {
  'use strict';
  var $httpBackend, RestRepository;
  beforeEach(module('sun.rest'));
  beforeEach(inject(function (_$httpBackend_, _RestRepository_) {
    $httpBackend = _$httpBackend_;
    RestRepository = _RestRepository_;
  }));
  it('should create custom property object', function () {
    var obj, repo, ControllerModel;
    ControllerModel = function (data) {
      //noinspection JSLint
      this.super.constructor.call(this, data);
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
  it('should create mng method', function () {
    var obj, repo, ControllerModel;
    ControllerModel = function (data) {
      //noinspection JSLint
      this.super.constructor.call(this, data);
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
});