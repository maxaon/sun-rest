/**
 * Created by maxaon on 16.01.14.
 */
xdescribe('ngResource', function () {
  beforeEach(module('ngResource'))

  var $resource, $httpBackend;
  beforeEach(inject(function (_$resource_, _$httpBackend_) {
    $resource = _$resource_;
    $httpBackend = _$httpBackend_
  }));
  it('should create ngresouice', function () {
    var res = $resource("/controllers/:id");
    $httpBackend.when("GET", "/controllers/2").respond({id: 2, hell: 3});
    res.get({id: 2});
    $httpBackend.flush();

  });

});