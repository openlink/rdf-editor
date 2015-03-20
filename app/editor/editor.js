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

.controller('EditorCtrl', ['$scope', '$routeParams', 'RDFEditor', 'DocumentTree', function($scope, $routeParams, RDFEditor, DocumentTree) {
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
  });
}]);
