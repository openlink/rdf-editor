'use strict';

// Declare app level module which depends on views, and components
angular.module('myApp', [
  'ngRoute',
  'myApp.welcome',
  'myApp.editor',
  'myApp.fileBrowser',
  'myApp.version'
])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.otherwise({redirectTo: '/welcome'});
}])

.factory('Profile', ['$q', function($q) {
  var val = new VAL();

  /**
   * Fetch the profile of the authenticated user.
   */
  val.getProfile = function() {
    var self = this;
    if(self.profileData) {
      return $q.when(self.profileData);
    }
    else {
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
    }
  };

  return val;
}])

.factory('DocumentTree', ['$q', 'Profile', function($q, Profile) {
  function loadRecentDocs() {
    var r = new RDFE.IO.Folder();
    r.name = r.path = "Recent Documents";

    var recentDocs = $.jStorage.get('rdfe:recentDocuments');
    if(recentDocs) {
      for(var i = 0; i < recentDocs.length && i < 10; i++) {
        if(recentDocs[i]) {
          var d = new RDFE.IO.File(recentDocs[i].url);
          d.ioType = recentDocs[i].ioType;
          d.name = recentDocs[i].title || d.name;
          d.sparqlEndpoint = recentDocs[i].sparqlEndpoint;
          r.children.push(d);
        }
      }
    }

    return r;
  }

  var locations = [];

  function getLocations() {
    // if we already extracted the profile locations just return them
    if(locations.length) {
      return $q.when(locations);
    }

    // extract the locations from the profile
    else {
      locations = [
        loadRecentDocs()
      ];

      return $q(function(resolve, reject) {
        Profile.getProfile().then(function(pd) {
          if(pd.storage) {
            RDFE.Utils.resolveStorageLocations(pd.storage, function(files) {
              $.merge(locations, files);
              resolve(locations);
            });
          }
          else {
            resolve(locations);
          }
        }, function() {
          // failed to get profile
          resolve(locations);
        });
      });
    }
  }

  // Service API
  return {
    getLocations: getLocations
  };
}]);
