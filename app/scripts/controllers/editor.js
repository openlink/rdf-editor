'use strict';

angular.module('myApp.editor', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/editor', {
    templateUrl: 'views/editor.html',
    controller: 'EditorCtrl'
  });
}])

.factory('RDFEditor', ['$q', "usSpinnerService", 'RDFEConfig', 'Notification', function($q, usSpinnerService, RDFEConfig, Notification) {
  var editor = null;

  function getEditor() {
    if(editor) {
      return $q.when(editor);
    }
    else {
      return $q(function(resolve, reject) {
        RDFEConfig.getConfig().then(function(config) {
          editor = new RDFE.Editor(config);

          // subscribe to editor events FIXME: a service does not seem like the best place to do this
          $(editor).on('rdf-editor-success', function(e, d) {
            Notification.notify('success', d.message);
          }).on('rdf-editor-error', function(e, d) {
            Notification.notify('error', d.message);
          }).on('rdf-editor-start', function(e, d) {
            usSpinnerService.spin('editor-spinner');
          }).on('rdf-editor-done', function(e, d) {
            usSpinnerService.stop('editor-spinner');
          });

          resolve(editor);
        });
      });
    }
  }

  return {
    getEditor: getEditor
  };
}])

.filter('viewModeLabel', function() {
  return function(input) {
    switch(input) {
      case 'triples':
        return 'Statement';
      case 'predicates':
        return 'Predicate';
      case 'entities':
        return 'Entity';
      default:
        return input;
    }
  };
})

.controller(
  'EditorCtrl', [
  '$scope', '$routeParams', '$location', "usSpinnerService", 'RDFEditor', 'DocumentTree', 'Notification',
  function($scope, $routeParams, $location, usSpinnerService, RDFEditor, DocumentTree, Notification) {

  function toggleSpinner(on) {
    if(on) {
      usSpinnerService.spin('editor-spinner');
    }
    else {
      usSpinnerService.stop('editor-spinner');
    }
  }

  function getIO(ioType, sparqlEndpoint) {
    var io = RDFE.IO.createIO(ioType, {
      "sparqlEndpoint": sparqlEndpoint,
      "gspEndpoint": $('#gspEndpoint').val()
    });
    io.type = ioType;
    io.options.authFunction = function(url, success, fail) {
      DocumentTree.getAuthInfo(url, true).then(success, fail);
    };
    return io;
  }

  function ioRetrieve(url, type, sparqlEndpoint) {
    var io_rdfe;
    try {
      io_rdfe = getIO(type || "sparql", sparqlEndpoint);

      // see if we have auth information cached
      DocumentTree.getAuthInfo(url, false).then(function(authInfo) {
        if(authInfo) {
          io_rdfe.options.username = authInfo.username;
          io_rdfe.options.password = authInfo.password;
        }

        toggleSpinner(true);
        $scope.mainDoc.load(url, io_rdfe, function() {
          $scope.editor.updateView();
          $scope.$apply(function() {
            $scope.documentUrl = url;
          });
        }, function() {
          Notification.notify('error', 'Failed to load document');
          toggleSpinner(false);
        });
      });
    }
    catch(e) {
      Notification.notify('error', e);
      return;
    }

  }

  RDFEditor.getEditor().then(function(editor) {
    $scope.editor = editor;
    $scope.mainDoc = $scope.editor.doc;
    $scope.ontologyManager = $scope.editor.ontologyManager;
    $scope.editor.render($("#contents"));

    // the browser requested that we save the current document
    if($routeParams.saveDocument) {
      $scope.mainDoc.url = $routeParams.uri;
      $scope.mainDoc.io = getIO($routeParams.ioType, $routeParams.sparqlEndpoint);
      $scope.saveDocument();
      $scope.editor.updateView();
    }

    // and if we are told, then we create a new document by clearing the old one
    else if($routeParams.newDocument) {
      $scope.mainDoc.new(function() {
        if($routeParams.uri) {
          $scope.mainDoc.url = $routeParams.uri;
          $scope.mainDoc.io = getIO($routeParams.ioType, $routeParams.sparqlEndpoint);
        }
        $scope.editor.updateView();

        $scope.$apply(function() {
          $scope.documentUrl = undefined;
        });
      }, function() {
        Notification.notity('error', "Failed to clear Document for unknown reasons.");
      });
    }

    // otherwise we try to load the requested document
    else if($routeParams.uri) {
      ioRetrieve($routeParams.uri, $routeParams.ioType, $routeParams.sparqlEndpoint);
    }



    // Editor view mode controls
    // ----------------------------
    // default view mode
    $scope.viewMode = $scope.editor.currentView();

    // watch changes in the view mode to update the editor
    $scope.$watch(function(scope) {
      return scope.viewMode;
    }, function(mode) {
      $scope.editor.toggleView(mode);
    });


    $scope.ontologyView = new RDFE.OntologyView($scope.ontologyManager);
    $scope.ontologyView.render($('#container-ontologies'));
    $('#ontology-add').click(function (e) {
      e.stopPropagation();
      $scope.ontologyView.editor();
    });
  });

  $scope.newTripleEntityOrPredicate = function() {
    if ($scope.editor.currentView() === 'entities') {
      $scope.editor.createNewEntityEditor();
    }
    else if ($scope.editor.currentView() === 'triples') {
      $scope.editor.createNewStatementEditor();
    }
    else {
      $scope.editor.createNewPredicateEditor();
    }
  };

  function saveCheck(cbSave, myUrl, myIo) {
    if (!myUrl) {
      myUrl = $scope.mainDoc.url;
    }
    if (!myIo) {
      myIo = $scope.mainDoc.io;
    }
    var mySave = function (data, status, xhr) {
      if (status === 'success') {
        if ((!$scope.mainDoc.url || ($scope.mainDoc.io && ($scope.mainDoc.io !== myIo))) && data.length)  {
          bootbox.confirm("Target document exists. Do you really want to overwrite it?", function(result) {
            if (result)
              cbSave(myUrl, myIo);
          });

          return;
        }
        if ($scope.mainDoc.srcParams && (($scope.mainDoc.srcParams.length !== data.length) || ($scope.mainDoc.srcParams.md5 !== $.md5(data)))) {
          bootbox.confirm("Target document was updated after last open/save. Do you really want to overwrite it?", function(result) {
            if (result)
              cbSave(myUrl, myIo);
          });

          return;
        }
      }
      cbSave(myUrl, myIo);
    }
    myIo.retrieve(myUrl, {
      "success": mySave,
      "error": mySave
    });
  }

  $scope.saveDocument = function() {
    if ($scope.mainDoc.url) {
      var cbSave = function () {
        toggleSpinner(true);
        $scope.mainDoc.save(function() {
          toggleSpinner(false);
          Notification.notify('success', "Successfully saved document to <code>" + $scope.mainDoc.url + "</code>");
        }, function(err) {
          toggleSpinner(false);
          Notification.notify('error', (err ? err.message || err : "An unknown error occured"));
        });
      };
      saveCheck(cbSave);
    }
    else {
      $scope.saveDocumentAs();
    }
  };

  $scope.saveDocumentAs = function() {
    // redirect to the browser and ask it for a uri to save to
    $location.url('/browser?mode=save');
  };

  $scope.openDocument = function() {
    function doOpen() {
      $location.url('/browser');
    };
    if($scope.mainDoc.dirty) {
      bootbox.confirm("Your document has unsaved changes. Do you really want to open another document?", function(r) {
        if(r) {
          $scope.$apply(doOpen);
        }
      });
    }
    else {
      doOpen();
    }
  };

  $scope.closeDocument = function() {
    // return to welcome page
    function doClose() {
      $location.url('/');
    };
    if($scope.mainDoc.dirty) {
      bootbox.confirm("Your document has unsaved changes. Do you really want to close the document?", function(r) {
        if(r) {
          $scope.$apply(doClose);
        }
      });
    }
    else {
      doClose();
    }
  };

  $scope.toggleOntologyView = function() {
    var $elHeading = $('#panel-ontologies').find('.panel-heading');
    $elHeading.find('.up').toggle();
    $elHeading.find('.down').toggle();
    $('#container-ontologies').toggle();
    $('#ontology-add').toggle();
  };
}]);
