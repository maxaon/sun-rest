/**
 * Created by maxaon on 17.01.14.
 */
(function (angular) {
  'use strict';
  angular.module('app', ['sun.rest'])
    .config(function (RestConfigProvider) {
      RestConfigProvider.setBaseUrl('http://127.0.0.1:8000/');
    })
    .controller('DemoController', function ($scope, RestRepository) {
      var repo, model;
      repo = RestRepository.create({
        name      : 'User',
        route     : '/controllers/:id',
        properties: {
          title      : {},
          description: {},
          devices    : {},
          id         : {}
        }
      });
      model = $scope.model = repo.find(12);
      $scope.save = function () {
        model.title = 'New title';
        model.mngr.save();
      };

    });


}(angular));