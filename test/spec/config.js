/**
 * Created by root on 1/19/14.
 */
describe('should create rest configuration', function () {
  'use strict';
  var RestConfig;
  beforeEach(module('sun.rest.config'));
  beforeEach(module(function (RestConfigProvider) {
    RestConfigProvider.baseUrl = '/api/';
  }));

  it('should write rest', inject(function (RestConfig) {
    expect(RestConfig.baseUrl).toBe('/api');
    expect(function () {
      RestConfig.baseUrl = 'Bla';
    }).toThrow();


  }));

});