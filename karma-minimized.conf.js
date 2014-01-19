/*global require*/
var sharedConfig = require('./karma-shared.conf');
module.exports = function (config) {
  'use strict';
  sharedConfig(config);
  config.set({
    files    : config.files.concat([
      'dist/sun-rest.min.js',
      'test/mock/**/*.js',
      'test/spec/**/*.js'
    ]),
    singleRun: true
  });
};
