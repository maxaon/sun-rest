/**
 * Created by root on 1/19/14.
 */
describe('Rest Config', function () {
  'use strict';
  beforeEach(module('sun.rest.config'));

  it('should change baseUrl', function () {
    module(function (RestConfigProvider) {
      RestConfigProvider.baseUrl = '/api/';
    });
    inject(function (RestConfig) {
      expect(RestConfig.baseUrl).toBe('/api');
      expect(function () {
        RestConfig.baseUrl = 'Bla';
      }).toThrow();
    });
  });
  it('should change absolute baseUrl', function () {
    module(function (RestConfigProvider) {
      RestConfigProvider.baseUrl = 'http://api.example.com:1209/api/';
    });
    inject(function (RestConfig) {
      expect(RestConfig.baseUrl).toBe('http://api.example.com:1209/api');
    });
  });
});
