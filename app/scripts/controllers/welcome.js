'use strict';

angular.module('myApp.welcome', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/welcome', {
    templateUrl: 'views/welcome.html',
    controller: 'WelcomeCtrl'
  });
}])

.config(['$locationProvider', function($locationProvider) {
  $locationProvider.hashPrefix('');
}])

.controller('WelcomeCtrl', [function() {

}]);
