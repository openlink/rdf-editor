'use strict';

angular.module('myApp.fileBrowser', ['ngRoute', 'ui.bootstrap'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/browser', {
    templateUrl: 'views/browser.html',
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

.controller('FileBrowserCtrl', ["$rootScope", "$scope", '$routeParams', "$timeout", '$location', "usSpinnerService", "DocumentTree", 'Notification', function($rootScope, $scope, $routeParams, $timeout, $location, usSpinnerService, DocumentTree, Notification) {
  // browser mode
  if ($routeParams.mode === 'save') {
    $scope.mode = $routeParams.mode;
    $scope.title = 'Save Your Document';
  }
  else {
    $scope.mode = 'open';
    $scope.title = 'Open a Document';
  }

  // array of default locations
  $scope.locations = [];
  DocumentTree.getLocations().then(function(locations) {
    $scope.locations = locations;

    // browser state
    // replace the old location with the new one
    var ndx = 0;
    if ($rootScope.currentLocation) {
      for (var i = 0; i < $scope.locations.length; i++) {
        if ($scope.locations[i].url === $rootScope.currentLocation.url) {
          ndx = i;
          break;
        }
      }
    }
    $scope.updateCurrentLocation($scope.locations[ndx]);
    $scope.updateCurrentFolder($scope.currentLocation);

    usSpinnerService.stop('location-spinner');
  });

  $scope.setCurrentLocation = function(location) {
    $scope.resetUI();
    if (location !== $scope.currentLocation) {
      if (location.httpStatus) {
        var authFunction;
        if (DocumentTree.getAuthInfo) {
          authFunction = function(url, success, fail) {
            DocumentTree.getAuthInfo(url, true).then(success, fail);
          };
        }
        RDFE.IO.openUrl(location.url, {
          authFunction: authFunction,
          checkForFiles: true
        }, function(dir) {
          // success, we found a container
          $scope.$apply(function() {
            // replace the old location with the new one
            $scope.locations[$scope.locations.indexOf(location)] = dir;
            $scope.updateCurrentLocation(dir);
            $scope.updateCurrentFolder(dir);
          });
        }, function(errMsg, status) {
          location.httpStatus = status;
          location.errorMessage = errMsg;
          // sadly we can get this error sync or async. Thus, we ensure async
          // to avoid the $apply nesting
          $timeout(function() {
            $scope.updateCurrentLocation(location);
            $scope.updateCurrentFolder(location);
          });
        });
      }
      else {
        $scope.updateCurrentLocation(location);
        $scope.updateCurrentFolder(location);
      }
      DocumentTree.selectRecentLocation(location.url, location.ioType);
    }
  };

  $scope.updateCurrentLocation = function(location) {
    $scope.currentLocation = location;
    $rootScope.currentLocation = location;

    // property to order files and folders by (folders are always first)
    $scope.orderProp = (location.name === "Recent Documents")? null: "name";
  };

  $scope.updateCurrentFolder = function(folder) {
    $scope.currentFolder = folder;
    if ($scope.currentFolder && $scope.currentFolder.dirty)
      $scope.refresh();
  };

  $scope.changeDir = function(folder) {
    var applyFolder = function () {
      usSpinnerService.stop('refresh-spinner');
      $scope.currentFolder = folder;
    };
    $scope.resetUI();
    usSpinnerService.spin('refresh-spinner');
    if (folder.dirty) {
      folder.httpStatus = null;
      folder.errorMessage = null;
      folder.update(function() {
        $scope.$apply(function() {
          applyFolder();
        });
      }, function(folder, err, status) {
        // even if there is an error we change the current folder
        // the ui will show the error automatically
        folder.httpStatus = status;
        folder.errorMessage = err;
        $scope.$apply(function() {
          applyFolder();
        });
      });
    }
    else {
      applyFolder();
    }
  };

  $scope.folderUp = function() {
    if ($scope.currentFolder.parent) {
      $scope.updateCurrentFolder($scope.currentFolder.parent);
      $scope.resetUI();
    }
  };

  $scope.refresh = function() {
    $scope.resetUI();

    if ($scope.currentLocation.name === "Recent Documents") {
      $scope.currentLocation.children = DocumentTree.getRecentDocs();
      $scope.currentFolder = $scope.currentFolder;
    }
    else {
      usSpinnerService.spin('refresh-spinner');
      $scope.currentFolder.httpStatus = null;
      $scope.currentFolder.errorMessage = null;
      $scope.currentFolder.update(true, function() {
        $scope.$evalAsync(function() {
          $scope.currentFolder = $scope.currentFolder;
          $timeout(function() {
            usSpinnerService.stop('refresh-spinner');
          }, 1000);
        });
      }, function(folder, err, status) {
        usSpinnerService.stop('refresh-spinner');
        folder.httpStatus = status;
        folder.errorMessage = err;
        $scope.$apply();
      });
    }
  };

  $scope.openFile = function(file) {
    var uri = '/editor?uri=' + encodeURIComponent(file.url) + '&ioType=' + encodeURIComponent(file.ioType);
    if (file.sparqlEndpoint) {
      uri += '&sparqlEndpoint=' + encodeURIComponent(file.sparqlEndpoint);
    }

    // in save mode we need to tell the editor to save instead of loading
    if ($scope.mode === 'save') {
      uri += '&saveDocument=true';
    }
    // check if this is a new dummy file as created below
    else if (file.isNew) {
      uri += '&newDocument=true';
    }

    $location.url(uri);
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
    for (var i = 0; i < $scope.locations.length; i++) {
      if ($scope.locations[i].url === location.url) {
        $scope.locations[i] = location;
        return;
      }
    }
    $scope.locations.push(location);
    DocumentTree.addRecentLocation(location.url, location.ioType);
  };

  $scope.removeLocation = function(location) {
    for (var i = 0; i < $scope.locations.length; i++) {
      if ($scope.locations[i].url === location.url) {
        $scope.locations.splice(i, 1);
        if (location === $scope.currentLocation) {
          $scope.setCurrentLocation($scope.locations[0]);
        }
        DocumentTree.deleteRecentLocation(location.url, location.ioType);
        return;
      }
    }
  };

  // controls for the UI element to add new locations
  $scope.addingLocation = false;

  $scope.showNewLocationUi = function() {
    $scope.addingLocation = true;
    $scope.newLocationUrl = '';
  };

  $scope.addNewLocation = function() {
    if ($scope.newLocationUrl && $scope.newLocationUrl.length) {
      if ($scope.newLocationIsSparql) {
        var sf = new RDFE.IO.Folder($scope.newLocationUrl);
        sf.ioType = "sparql";
        sf.sparqlEndpoint = $scope.newLocationUrl;
        $scope.addLocation(sf);
        $scope.updateCurrentLocation(sf);
        $scope.currentFolder = sf;
        $scope.addingLocation = false;
      }
      else {
        usSpinnerService.spin('location-spinner');
        var authFunction;
        if (DocumentTree.getAuthInfo) {
          authFunction = function(url, success, fail) {
            DocumentTree.getAuthInfo(url, true).then(success, fail);
          };
        }
        RDFE.IO.openUrl($scope.newLocationUrl, {
          authFunction: authFunction,
          checkForFiles: true
        },
        function(dir) {
          // success, we found a container
          $scope.$apply(function() {
            $scope.addingLocation = false;
            $scope.addLocation(dir);
            $scope.updateCurrentLocation(dir);
            $scope.currentFolder = dir;
          });
          usSpinnerService.stop('location-spinner');
        },
        function(errMsg, status) {
          // show a notification and let the user try again
          Notification.notify('error', errMsg);
          usSpinnerService.stop('location-spinner');
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
    if ($scope.newGraphUri && $scope.newGraphUri.length) {
      // add the new graph file item
      var graph = new RDFE.IO.File($scope.newGraphUri);
      graph.parent = $scope.currentFolder;
      graph.sparqlEndpoint = $scope.currentFolder.sparqlEndpoint;
      graph.ioType = 'sparql';
      $scope.currentFolder.children.push(graph);

      // open the file in the editor
      $scope.openFile(graph);
    }
  };

  // controls for the UI element to add new files
  $scope.addingFile = false;
  $scope.newFileName = "myDocument.ttl";
  $scope.showNewFileUi = function() {
    $scope.addingFile = true;
    $scope.newFileName = "myDocument.ttl";
  };
  $scope.addNewFile = function() {
    if ($scope.newFileName && $scope.newFileName.length) {
      // force reload next time in case the doc will be saved
      $scope.currentFolder.dirty = true;

      // build new file url
      var uri = $scope.currentFolder.url + $scope.newFileName;

      // create a fake file object marked as being new
      var file = new RDFE.IO.File(uri);
      file.isNew = true;
      file.ioType = $scope.currentFolder.ioType;

      $scope.openFile(file);
    }
  };

  $scope.resetUI = function() {
    $scope.addingFile = false;
    $scope.addingGraph = false;
    $scope.addingLocation = false;
  };
}]);
