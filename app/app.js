'use strict';

// Declare app level module which depends on views, and components
angular.module('myApp', [
  'ngRoute',
  'myApp.welcome',
  'myApp.editor',
  'myApp.fileBrowser',
  'myApp.version'
]).
config(['$routeProvider', function($routeProvider) {
  $routeProvider.otherwise({redirectTo: '/welcome'});
}])
.factory('Profile', ['$q', function($q) {
  var val = new VAL();
  val.getProfile = function() {
    var self = this;
    return $q(function(resolve, reject) {
      self.profile(function(success, pd) {
        if(success) {
          resolve(pd);
        }
        else {
          reject();
        }
      });
    });
  };
  return val;
}]);
