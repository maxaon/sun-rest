/**
 * Created by maxaon on 16.01.14.
 */
describe('Router buildConfig test', function () {
  'use strict';
  var Router;
  beforeEach(module('sun.rest.router'));
  beforeEach(inject(function (_Router_) {
    Router = _Router_;
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