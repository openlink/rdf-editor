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

.factory('Notification', function() {
  // set defaults
  $.growl(false, {
    placement: {
      from: "top",
      align: "center"
    },
    "z_index": 1050,
    template: '<div data-growl="container" class="alert" role="alert"> \
      <button type="button" class="close" data-growl="dismiss"> \
        <span aria-hidden="true">×</span> \
        <span class="sr-only">Close</span> \
      </button> \
      <span data-growl="icon"></span> \
      <span data-growl="title"></span> \
      &nbsp;<span data-growl="message"></span>&nbsp; \
    </div>'
  });

  function notify(type, msg, icon) {
    var o = {
      message: msg
    };
    if(type === 'error') {
      type = 'danger';
    }
    if(!icon && type === 'danger') {
      icon = 'fire';
    }
    if(icon) {
      o.icon = "glyphicon glyphicon-" + icon;
    }

    $.growl(o, {
      type: type
    });
  }

  return {
    notify: notify
  };
})

.factory('Profile', ['$q', function($q) {
  var val = new VAL();

  /**
   * Fetch the profile of the authenticated user.
   */
  val.getProfile = function() {
    var self = this;
    if(self.profileData) {
      return $q.when(self);
    }
    else {
      return $q(function(resolve, reject) {
        self.profile(function(success, pd) {
          if(success) {
            resolve(self);
          }
          else {
            reject(self);
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
        Profile.getProfile().then(function(profile) {
          if(profile.profileData.storage) {
            RDFE.Utils.resolveStorageLocations(profile.profileData.storage, function(files) {
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
}])

.controller('AuthHeaderCtrl', ['$scope', 'Profile', function($scope, Profile) {
  function updateProfileData(profile) {
    $scope.profile = profile.profileData;
    $scope.logoutLink = profile.config.host + profile.config.logoutLink + '?returnto=' + encodeURIComponent(window.location.href);
    $scope.loginLink = profile.config.host + profile.config.loginLink + '?returnto=' + encodeURIComponent(window.location.href);
  }

  Profile.getProfile().then(updateProfileData, updateProfileData);
}]);
