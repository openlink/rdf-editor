'use strict';

angular.module('myApp.fileBrowser', ['ngRoute', 'ui.bootstrap'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/browser', {
    templateUrl: 'browser/browser.html',
    controller: 'FileBrowserCtrl'
  });
}])

.filter('ioTypeLabel', function() {
  return function(input) {
    switch(input) {
      case 'webdav':
        return 'WebDAV Folder';
      case 'ldp':
        return 'LDP Location';
      case 'sparql':
        return 'SPARQL Endpoint';
      default:
        return input;
    }
  };
})

.filter('httpStatusLabel', function() {
  return function(input) {
    switch(input) {
      case 0:
        return 'Connection Refused';
      case 404:
        return 'Not Found';
      case 401:
        return 'Authorization Required';
      case 403:
        return 'Access Denied';
      default:
        return input;
    }
  };
})

.controller('FileBrowserCtrl', ["$scope", "DocumentTree", 'Notification', function($scope, DocumentTree, Notification) {
  // property to order files and folders by (fodlers are always first)
  $scope.orderProp = "name";

  // array of default locations
  $scope.locations = [];
  DocumentTree.getLocations().then(function(locations) {
    $scope.locations = locations;

    // browser state
    $scope.currentLocation = $scope.locations[0];
    $scope.currentFolder = $scope.currentLocation;
  });

  $scope.setCurrentLocation = function(location) {
    if(location != $scope.currentLocation) {
      if(location.httpStatus) {
        RDFE.IO.openUrl(location.url, {
          authFunction: function(url, success, fail) {
            DocumentTree.getAuthInfo(url, true).then(success, fail);
          },
          checkForFiles: true
        }, function(dir) {
          // success, we found a container
          $scope.$apply(function() {
            // replace the old location with the new one
            $scope.locations[$scope.locations.indexOf(location)] = dir;
            $scope.currentLocation = $scope.currentFolder = dir;
          });
        }, function(errMsg, status) {
          // even if there is an error we change the current location
          // the ui will show the error automatically
          location.httpStatus = status;
          location.errorMessage = errMsg;
          $scope.$apply(function() {
            $scope.currentLocation = $scope.currentFolder = location;
          });
        });
      }
      else {
        $scope.currentLocation = $scope.currentFolder = location;
      }
    }
  };

  $scope.changeDir = function(folder) {
    if(folder.dirty) {
      folder.update(function() {
        $scope.$apply(function() {
          $scope.currentFolder = folder;
        });
      }, function() {
        // even if there is an error we change the current folder
        // the ui will show the error automatically
        $scope.$apply(function() {
          $scope.currentFolder = folder;
        });
      });
    }
    else {
      $scope.currentFolder = folder;
    }
  };

  $scope.folderUp = function() {
    if($scope.currentFolder.parent) {
      $scope.currentFolder = $scope.currentFolder.parent;
    }
  };

  $scope.refresh = function() {
    $scope.currentFolder.update(true, function() {
      $scope.$apply(function() {
        $scope.currentFolder = $scope.currentFolder;
      });
    }, function() {
      // do nothing
    });
  };

  $scope.openFile = function(file) {
    window.location.href =
      window.location.protocol +
      '//' +
      window.location.host +
      window.location.pathname +
      '#/editor?uri=' + encodeURIComponent(file.url) +
      '&ioType=' + encodeURIComponent(file.ioType) +
      '&sparqlEndpoint=' + encodeURIComponent(file.sparqlEndpoint);
  };

  $scope.open = function(item) {
    if(item.type === 'file') {
      $scope.openFile(item);
    }
    else {
      $scope.changeDir(item);
    }
  };

  $scope.addLocation = function(location) {
    // replace the old location with the new one
    var i = $scope.locations.indexOf(location);
    if(i >= 0) {
      $scope.locations[i] = location;
    }
    else {
      $scope.locations.push(location);
    }
  };

  // controls for the UI element to add new locations
  $scope.addingLocation = false;
  $scope.showNewLocationUi = function() {
    $scope.addingLocation = true;
    $scope.newLocationUrl = '';
  };
  $scope.addNewLocation = function() {
    if($scope.newLocationUrl && $scope.newLocationUrl.length) {
      if($scope.newLocationIsSparql) {
        var sf = new RDFE.IO.Folder($scope.newLocationUrl);
        sf.ioType = "sparql";
        sf.sparqlEndpoint = $scope.newLocationUrl;
        $scope.addLocation(sf);
        $scope.currentLocation = $scope.currentFolder = sf;
        $scope.addingLocation = false;
      }
      else {
        RDFE.IO.openUrl($scope.newLocationUrl, {
          authFunction: function(url, success, fail) {
            DocumentTree.getAuthInfo(url, true).then(success, fail);
          },
          checkForFiles: true
        }, function(dir) {
          // success, we found a container
          $scope.$apply(function() {
            $scope.addingLocation = false;
            $scope.addLocation(dir);
            $scope.currentLocation = $scope.currentFolder = dir;
          });
        }, function(errMsg, status) {
          // show a notification and let the user try again
          Notification.notify('error', errMsg);
        });
      }
    }
  };

  // controls for the UI element to add new named graphs
  $scope.addingGraph = false;
  $scope.showNewGraphUi = function() {
    $scope.addingGraph = true;
    $scope.newGraphUri = '';
  };
  $scope.addNewGraph = function() {
    if($scope.newGraphUri && $scope.newGraphUri.length) {
      // add the new graph file item
      var gr = new RDFE.IO.File($scope.newGraphUri);
      gr.parent = $scope.currentFolder;
      gr.sparqlEndpoint = $scope.currentFolder.sparqlEndpoint;
      gr.ioType = 'sparql';
      $scope.currentFolder.children.push(gr);

      // open the file in the editor
      $scope.openFile(gr);
    }
  };
}]);
