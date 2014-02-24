/*global require*/
var sharedConfig = require('./karma-shared.conf');
module.exports = function (config) {
  'use strict';
  sharedConfig(config);
  config.set({
    files: config.files.concat([
      'src/sun-rest.js',
      'src/**/*.js',
      'test/mock/**/*.js',
      'test/spec/**/*.js'
    ])
  });
};
