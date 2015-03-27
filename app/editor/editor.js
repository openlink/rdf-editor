'use strict';

angular.module('myApp.editor', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/editor', {
    templateUrl: 'editor/editor.html',
    controller: 'EditorCtrl'
  });
}])

.factory('RDFEditor', ['$q', 'RDFEConfig', function($q, RDFEConfig) {
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
            $.growl({
              message: d.message
            }, {
              type: "success"
            });
          }).on('rdf-editor-error', function(e, d) {
            $.growl({
              message: d.message
            }, {
              type: "danger"
            });
          })/*.on('rdf-editor-start', function(e, d) {
            toggleSpinner(true);
          }).on('rdf-editor-done', function(e, d) {
            toggleSpinner(false);
          })*/;

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

.controller('EditorCtrl', ['$scope', '$routeParams', '$location', 'RDFEditor', 'DocumentTree', function($scope, $routeParams, $location, RDFEditor, DocumentTree) {
  function getIO(ioType, sparqlEndpoint) {
    var io = RDFE.IO.createIO(ioType, {
      "sparqlEndpoint": sparqlEndpoint,
      "gspEndpoint": $('#gspEndpoint').val()
    });
    io.type = ioType;
    return io;
  }

  function ioRetrieve(url, type, sparqlEndpoint) {
    var io_rdfe;
    try {
      io_rdfe = getIO(type || "sparql", sparqlEndpoint);
      io_rdfe.options.authFunction = function(url, success, fail) {
        DocumentTree.getAuthInfo(url, true).then(success, fail);
      };

      // see if we have auth information cached
      DocumentTree.getAuthInfo(url, false).then(function(authInfo) {
        if(authInfo) {
          io_rdfe.options.username = authInfo.username;
          io_rdfe.options.password = authInfo.password;
        }

        //toggleSpinner(true);
        $scope.mainDoc.load(url, io_rdfe, function() {
          $scope.editor.updateView();
          //$('#docUrl').text(url);
          //toggleView("document");
          //addRecentDoc(url, io_rdfe.type, sparqlEndpoint);
          //$.jStorage.set("editor-document-url", url);
          //$.jStorage.set("editor-document-io-type", type);
        }, function() {
          $.growl({
            message: 'Failed to load document',
            icon: "glyphicon glyphicon-fire"
          }, {
            type: 'danger'
          });
          //toggleSpinner(false);
        });
      });
    }
    catch(e) {
      $.growl({
        message: e
      }, {
        type: "danger"
      });
      return;
    }

  }

  RDFEditor.getEditor().then(function(editor) {
    $scope.editor = editor;
    $scope.mainDoc = $scope.editor.doc;
    $scope.ontologyManager = $scope.editor.ontologyManager;
    $scope.editor.render($("#contents"));

    if($routeParams.uri) {
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
}]);
