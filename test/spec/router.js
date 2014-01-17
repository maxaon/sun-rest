/**
 * Created by maxaon on 16.01.14.
 */
describe('Router test', function () {
  beforeEach(module('sun.rest.router'));
  var Router;
  beforeEach(inject(function (_Router_) {
    Router = _Router_;
  }));
  it('should make simple route', function () {
    var router = new Router("/controllers/:id");
    var config;

    function call(params, actionUrl) {
      var config = {};
      router.buildConfig(config, params, actionUrl);
      return config;
    }

    expect(call().url).toBe("/controllers");
    expect(call({url: "name"}).url).toBe("/controllers/name");
    expect(call({id: 12}).url).toBe("/controllers/12");
    expect(call({id: 12, url: "action"}).url).toBe("/controllers/12/action");
    expect(call({id: 12}, "action").url).toBe("/controllers/12/action");

    config = call({id: 12, filter_by: "name"}, "action");
    expect(config.url).toBe("/controllers/12/action");
    expect(config.params.filter_by).toBe("name");
  });
});