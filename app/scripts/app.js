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

.run(function($rootScope) {
  $rootScope.version = '##VERSION##';
})

.factory('Notification', function() {
  // set defaults
  $.notifyDefaults({
    "allow_dismiss": true,
    "placement": {
      "from": 'top',
      "align": 'center'
    },
    "template": ' \
      <div data-notify="container" class="col-xs-11 col-sm-6 alert alert-{0}" role="alert">\
      	<button type="button" aria-hidden="true" class="close" data-notify="dismiss">×</button>\
      	<span data-notify="icon"></span>\
      	<span data-notify="title">{1}</span>\
      	<span data-notify="message">{2}</span>\
      	<div class="progress" data-notify="progressbar">\
      		<div class="progress-bar progress-bar-{0}" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%;"></div>\
      	</div>\
      	<a href="{3}" target="{4}" data-notify="url"></a>\
      </div>',
    "z_index": 1050
  });

  function notify(type, msg, icon) {
    if (type === 'error') {
      type = 'danger';
    }
    var o = {
      "type": type
    };
    if (type === 'danger') {
      if (o.delay === undefined) {
        o.delay = 0;
      }
      if (!icon) {
        icon = 'fire';
      }
    }
    if (icon) {
      o.icon = "glyphicon glyphicon-" + icon;
    }

    $.notify(msg, o);
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

.controller('AuthInfoDialogCtrl', ["$scope", "$uibModalInstance", "url", function($scope, $uibModalInstance, url) {
  $scope.username = "";
  $scope.password = "";
  $scope.url = url;

  $scope.ok = function() {
    $uibModalInstance.close({
      username: $scope.username,
      password: $scope.password
    });
  };

  $scope.cancel = function() {
    $uibModalInstance.dismiss();
  };
}])

.factory('DocumentTree', ['$q', "$uibModal", 'usSpinnerService', 'Profile', 'RDFEConfig', function($q, $uibModal, usSpinnerService, Profile, RDFEConfig) {
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
        usSpinnerService.stop('editor-spinner');
        $uibModal.open({
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
    r.ioType = 'recent';
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

    // $.jStorage.deleteKey('rdfe:recentDocuments');
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
    "getLocations": getLocations,
    "getAuthInfo": getAuthInfo,
    "getRecentDocs": getRecentDocs,
    "addRecentDoc": addRecentDoc
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
    $scope.userProfile = profile;
    $scope.profile = profile.profileData;
    $rootScope.valInstalled = (profile)? profile.config.valInstalled: false;
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
    if ($scope.userProfile.config.valInstalled) {
      saveDocument();
      $window.location = $scope.userProfile.config.host + $scope.userProfile.config.loginLink + '?returnto=' + encodeURIComponent(window.location.href);
    }
  }

  $scope.logout = function(e) {
    if ($scope.userProfile.config.valInstalled) {
      saveDocument();
      $window.location = $scope.userProfile.config.host + $scope.userProfile.config.logoutLink + '?returnto=' + encodeURIComponent(window.location.href);
    }
  }

  Profile.getProfile().then(updateProfileData, updateProfileData);
}]);
