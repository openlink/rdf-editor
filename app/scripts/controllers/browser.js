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

.controller('FileBrowserCtrl', ["$scope", '$routeParams', "$timeout", '$location', "usSpinnerService", "DocumentTree", 'Notification', function($scope, $routeParams, $timeout, $location, usSpinnerService, DocumentTree, Notification) {
  // browser mode
  $scope.mode = 'open';
  $scope.title = 'Open a Document';
  if($routeParams.mode === 'save') {
    $scope.mode = $routeParams.mode;
    $scope.title = 'Save Your Document';
  }

  // array of default locations
  $scope.locations = [];
  DocumentTree.getLocations().then(function(locations) {
    $scope.locations = locations;

    // browser state
    $scope.updateCurrentLocation($scope.locations[0]);
    $scope.currentFolder = $scope.currentLocation;

    usSpinnerService.stop('location-spinner');
  });

  $scope.setCurrentLocation = function(location) {
    if(location != $scope.currentLocation) {
      $scope.resetUi();
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
            $scope.updateCurrentLocation(dir);
            $scope.currentFolder = dir;
          });
        }, function(errMsg, status) {
          location.httpStatus = status;
          location.errorMessage = errMsg;
          // sadly we can get this error sync or async. Thus, we ensure async
          // to avoid the $apply nesting
          $timeout(function() {
            $scope.updateCurrentLocation(location);
            $scope.currentFolder = location;
        });
        });
      }
      else {
        $scope.updateCurrentLocation(location);
        $scope.currentFolder = location;
      }
    }
  };

  $scope.updateCurrentLocation = function(location) {
    $scope.currentLocation = location;

    // property to order files and folders by (folders are always first)
    $scope.orderProp = (location.name === "Recent Documents")? null: "name";
  };

  $scope.changeDir = function(folder) {
    $scope.resetUi();

    // FIXME: apparently this update does not always work after having created a new file via addFile()
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
      $scope.resetUi();
    }
  };

  $scope.refresh = function() {
    $scope.resetUi();

    if ($scope.currentLocation.name === "Recent Documents") {
      $scope.currentLocation.children = DocumentTree.getRecentDocs();
        $scope.currentFolder = $scope.currentFolder;
    }
    else {
      usSpinnerService.spin('refresh-spinner');
      $scope.currentFolder.update(true, function() {
        $scope.$evalAsync(function() {
          $scope.currentFolder = $scope.currentFolder;
        $timeout(function() {
          usSpinnerService.stop('refresh-spinner');
        }, 1000);
      });
    }, function() {
      // do nothing
    });
    }
  };

  $scope.openFile = function(file) {
    var uri = '/editor?uri=' + encodeURIComponent(file.url) +
      '&ioType=' + encodeURIComponent(file.ioType);
    if(file.sparqlEndpoint) {
      uri += '&sparqlEndpoint=' + encodeURIComponent(file.sparqlEndpoint);
    }

    // in save mode we need to tell the editor to save instead of loading
    if($scope.mode === 'save') {
      uri += '&saveDocument=true';
    }
    // check if this is a new dummy file as created below
    else if(file.isNew) {
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
        $scope.updateCurrentLocation(sf);
        $scope.currentFolder = sf;
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
            $scope.updateCurrentLocation(dir);
            $scope.currentFolder = dir;
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

  // controls for the UI element to add new files
  $scope.addingFile = false;
  $scope.newFileName = "myDocument.ttl";
  $scope.showNewFileUi = function() {
    $scope.addingFile = true;
    $scope.newFileName = "myDocument.ttl";
  };
  $scope.addNewFile = function() {
    if($scope.newFileName && $scope.newFileName.length) {
      // force reload next time in case the doc will be saved
      $scope.currentFolder.dirty = true;

      // build new file url
      var uri = $scope.currentFolder.url + $scope.newFileName;

      // create a fake file object marked as being new
      var newF = new RDFE.IO.File(uri);
      newF.isNew = true;
      newF.ioType = $scope.currentFolder.ioType;

      $scope.openFile(newF);
    }
  };

  $scope.resetUi = function() {
    $scope.addingFile = false;
    $scope.addingGraph = false;
    $scope.addingLocation = false;
  };
}]);
