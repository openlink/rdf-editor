'use strict';

// Declare app level module which depends on views, and components
angular.module('myApp', [
  'ngRoute',
  'angularSpinner',
  'myApp.welcome',
  'myApp.editor',
  'myApp.fileBrowser'
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
      if (!self.promise) {
        self.promise = $q(function(resolve, reject) {
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
      return self.promise;
    }
  };

  return val;
}])

.controller('AuthInfoDialogCtrl', ["$scope", "$modalInstance", "url", function($scope, $modalInstance, url) {
  $scope.username = "";
  $scope.password = "";
  $scope.url = url;

  $scope.ok = function() {
    $modalInstance.close({
      username: $scope.username,
      password: $scope.password
    });
  };

  $scope.cancel = function() {
    $modalInstance.dismiss();
  };
}])

.factory('DocumentTree', ['$q', "$modal", 'Profile', 'RDFEConfig', function($q, $modal, Profile, RDFEConfig) {
  var locations = [],
      authCache = {};

  /**
   * Authentication function which requests a username and pwd from the user
   * to provide to the @p success function. If the user canceles the @p fail
   * callback will be invoked instead.
   */
  function getAuthInfo(url, forceUpdate) {
    var cached = authCache[url];
    // try the parent folder in case we have that
    // FIXME: how about mapping into locations and then attaching the cached auth info directly to the RDFE.IO.Resource objects
    if(!cached && url[url.length-1] !== '/') {
      cached = authCache[url.substring(0, url.lastIndexOf('/')+1)];
    }
    if(forceUpdate !== false && (forceUpdate === true || !cached)) {
      return $q(function(resolve, reject) {
        $modal.open({
          templateUrl: 'tmpl/authinfodlg.html',
          controller: 'AuthInfoDialogCtrl',
          resolve: {
            url: function() {
              return url;
            }
          }
        }).result.then(function(result) {
          authCache[url] = result;
          resolve(result);
        }, reject);
      });
    }
    else {
      return $q.when(cached);
    }
  };

  function loadRecentDocs() {
    var r = new RDFE.IO.Folder();

    r.name = r.path = "Recent Documents";
    r.comment = 'Documents you recently opened';
    r.children = getRecentDocs();

    return r;
  }


  function getRecentDocs() {
    var items = []
    var recentDocs = $.jStorage.get('rdfe:recentDocuments');

    if (recentDocs) {
      for (var i = 0; i < recentDocs.length && i < 10; i++) {
        var recentDoc = recentDocs[i];
        if (recentDoc) {
          var item = new RDFE.IO.File(recentDoc.url);
          item.ioType = recentDoc.ioType;
          item.name = recentDoc.title || item.name;
          item.sparqlEndpoint = recentDoc.sparqlEndpoint;
          items.push(item);
    }
      }
    }
    return items;
  }


  function getLocations() {
    // if we already extracted the profile locations just return them
    if (locations.length) {
      return $q.when(locations);
    }

    // extract the locations from the profile
    else {
      var storage;
      locations = [
        loadRecentDocs()
      ];

      return $q(function(resolve, reject) {
        RDFEConfig.getConfig().then(function(config) {
          storage = config.options.storage || [];

          return Profile.getProfile();
        }).then(function(profile) {
          var profileStorage = profile.profileData.storage || [];
          for (var i = 0; i < profileStorage.length; i++) {
            if (_.isEmpty(_.where(storage, {"uri": profileStorage[i].uri}))) {
              storage = storage.concat(profileStorage[i]);
            }
          }
          if (storage.length) {
            RDFE.Utils.resolveStorageLocations(storage, function(files) {
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

  function addRecentDoc(url, ioType) {
    var notFound = true;
    var recentDoc;

    var recentDocs = $.jStorage.get('rdfe:recentDocuments');
    if (!recentDocs) {
      recentDocs = [];
    }

    for (var i = 0; i < recentDocs.length; i++) {
      recentDoc = recentDocs[i];
      if ((recentDoc.url === url) && (recentDoc.ioType === ioType)) {
        notFound = false;
        recentDocs.splice(i, 1);
        recentDocs.unshift(recentDoc);
        break;
      }
    }

    if (notFound) {
      recentDoc = new RDFE.IO.File(url);
      recentDoc.ioType = ioType;
      recentDocs.unshift(recentDoc);
      if (recentDocs.length > 10) {
        recentDocs.splice(recentDocs.length-1, 1);
      }
    }

    $.jStorage.set('rdfe:recentDocuments', recentDocs);
  }


  // Service API
  return {
    getLocations: getLocations,
    getAuthInfo: getAuthInfo,
    getRecentDocs: getRecentDocs,
    addRecentDoc: addRecentDoc
  };
}])

.factory('RDFEConfig', ['$q', 'Notification', function($q, Notification) {
  var config = null;

  function getConfig() {
    if(config) {
      return $q.when(config);
    }
    else {
      return $q(function(resolve, reject) {
        var urlParams = RDFE.Utils.uriParams();
        var configSource = (urlParams['config'])? urlParams['config']: 'config.json';
        config = new RDFE.Config(configSource, function(config) {
          resolve(config);
        }, function() {
          Notification.notify('error', 'Failed to load Editor configuration');
        });
      });
    }
  }

  return {
    getConfig: getConfig
  };
}])

.controller('AuthHeaderCtrl', ['$rootScope', '$scope', '$window', 'Profile', function($rootScope, $scope, $window, Profile) {
  function updateProfileData(profile) {
    $scope.userProfile = profile
    $scope.profile = profile.profileData
  }

  function saveDocument() {
    if ($rootScope.editor && $rootScope.editor.doc && $rootScope.editor.doc.dirty) {
      var doc = $rootScope.editor.doc;
      doc.store.graph(doc.graph, function(success, result) {
        if (success) {
          var content = result.toNT();
          $.jStorage.set('rdfe:savedDocument', content);
        }
      });
    }
  }

  $scope.login = function(e) {
    saveDocument();
    $window.location = $scope.userProfile.config.host + $scope.userProfile.config.loginLink + '?returnto=' + encodeURIComponent(window.location.href);
  }

  $scope.logout = function(e) {
    saveDocument();
    $window.location = $scope.userProfile.config.host + $scope.userProfile.config.logoutLink + '?returnto=' + encodeURIComponent(window.location.href);
  }

  Profile.getProfile().then(updateProfileData, updateProfileData);
}]);
