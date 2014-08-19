/*global require*/
var sharedConfig = require('./karma-shared.conf');
module.exports = function (config) {
  'use strict';
  sharedConfig(config);

  config.set({
    preprocessors: {
      // source files, that you wanna generate coverage for
      // do not include tests or libraries
      // (these files will be instrumented by Istanbul)
      'src/*.js': ['coverage']
    },
    files        : config.files.concat([
      'src/sun-rest.js',
      'src/**/*.js',
      'test/mock/**/*.js',
      'test/spec/**/*.js'
    ])
  });
};
