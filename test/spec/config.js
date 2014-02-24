/**
 * Created by root on 1/19/14.
 */
describe('Rest Config', function () {
  'use strict';
  beforeEach(module('sun.rest'));

  it('should change baseUrl', function () {
    module(function (sunRestConfigProvider) {
      sunRestConfigProvider.baseUrl = '/api/';
    });
    inject(function (sunRestConfig) {
      expect(sunRestConfig.baseUrl).toBe('/api');
      expect(function () {
        sunRestConfig.baseUrl = 'Bla';
      }).toThrow();
    });
  });
  it('should change absolute baseUrl', function () {
    module(function (sunRestConfigProvider) {
      sunRestConfigProvider.baseUrl = 'http://api.example.com:1209/api/';
    });
    inject(function (sunRestConfig) {
      expect(sunRestConfig.baseUrl).toBe('http://api.example.com:1209/api');
    });
  });
});
