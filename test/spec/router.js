/**
 * Created by maxaon on 16.01.14.
 */
describe('Router buildConfig test', function () {
  'use strict';
  var Router;
  beforeEach(module('sun.rest'));
  beforeEach(inject(function (_sunRestRouter_) {
    Router = _sunRestRouter_;
  }));
  it('should make simple route', function () {
    var config,
      router = new Router('/controllers/:id');

    function call(params, actionUrl) {
      return router.buildConfig({}, params, actionUrl);
    }

    expect(call().url).toBe('/controllers');
    expect(call({url: 'name'}).url).toBe('/controllers/name');
    expect(call({id: 12}).url).toBe('/controllers/12');
    expect(call({id: 12, url: 'action'}).url).toBe('/controllers/12/action');
    expect(call({id: 12}, 'action').url).toBe('/controllers/12/action');

    config = call({id: 12, filterBy: 'name'}, 'action');
    expect(config.url).toBe('/controllers/12/action');
    expect(config.params.filterBy).toBe('name');
  });
});

describe("Nested router", function () {
  var Router, RouterNested;
  beforeEach(module('sun.rest'));
  beforeEach(inject(function (_sunRestRouter_, _sunRestRouterNested_) {
    Router = _sunRestRouter_;
    RouterNested = _sunRestRouterNested_;
  }));

  it('should make correct one level nested routes', function () {
    var baseRouter = new Router("/base/:id"),
      baseDefaults = {},
      instanceRouter = new RouterNested(baseRouter, baseDefaults, "/child/:id");
    baseDefaults.id = 11;
    expect(instanceRouter.buildConfig().url).toBe("/base/11/child");
    expect(instanceRouter.buildConfig({}, {id: 123}).url).toBe("/base/11/child/123");
    expect(instanceRouter.buildConfig({}, {id: 123}, "action").url).toBe("/base/11/child/123/action");
    baseDefaults.id = 14;
    expect(instanceRouter.buildConfig({}, {id: 123}, "action").url).toBe("/base/14/child/123/action");

  });


})