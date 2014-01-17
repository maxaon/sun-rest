/**
 * Created by maxaon on 14.01.14.
 */
'use strict';
jasmine.Matchers.prototype.toBeInstanceOf = function (expected) {
  this.message = function () {
    return "Expected " + (this.actual) + (this.isNot ? " not" : "") + " to be instance of " + (expected);
  }.bind(this);
  return this.actual instanceof expected;
};


ddescribe('Rest creation', function () {
  var $httpBackend, RestRepository;
  beforeEach(module('sun.rest'));
  beforeEach(inject(function (_$httpBackend_, _RestRepository_) {
    $httpBackend = _$httpBackend_;
    RestRepository = _RestRepository_;
  }));

  var UserSchema = {
    name      : 'User',
    route     : "/controllers/:id",
    properties: {
      title      : {},
      description: {},
      devices    : {},
      id         : {}
    }
  };
  it('should create repository', function () {
    var repo = RestRepository(UserSchema);

    describe('should make rest requests', function () {
      var model = {title: "Home 1", description: "Controller in the home", devices: [1, 2, 3], id: 12};

      it('should retrieve object', function () {
        $httpBackend.expect("GET", "/controllers").respond([model]);
        var obj = repo.find();
        expect(obj.length).toBe(0);
        $httpBackend.flush();
        expect(obj.length).toBe(1);
        expect(obj[0]).toBeInstanceOf(repo.model);
        expect(obj[0].title).toBe("Home 1");
        expect(obj[0].devices).toEqual([1, 2, 3]);
      });
      it('should create new object', function () {
        var obj = new repo.model();
        expect(obj.mngr.state).toBe(obj.mngr.NEW);
        angular.extend(obj, model);
        obj.id = undefined;
        $httpBackend.expect("POST", "/controllers").respond([model]);
        obj.mngr.save();
        $httpBackend.flush();
      });
      it('should make teo responses', function () {
        $httpBackend.expect("GET", "/controllers").respond([model]);
        var objs = repo.find();
        $httpBackend.flush();
        expect(objs.length).toBe(1);
        $httpBackend.expect("GET", "/controllers").respond([model]);
        objs = repo.find();
        $httpBackend.flush();
        expect(objs.length).toBe(1);
      });
      it('Should save object save ', function () {
        $httpBackend.expect("GET", "/controllers/12").respond(model);
        var obj = repo.find(12);
        $httpBackend.flush();
        obj.title = "New title";
        var n = obj.mngr.toJSON();
        $httpBackend.expect("PUT", "/controllers/12", n).respond(angular.extend({}, n, {title: "ServerSideTitle"}));
        obj.mngr.save();
        $httpBackend.flush();
        expect(obj.title).toBe("ServerSideTitle");
      });
    });
  });
  it('should create custom property object', function () {
    var U
    var repo = RestRepository(UserSchema);
  });


});