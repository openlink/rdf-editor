'use strict';

angular.module('myApp.editor', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/editor', {
    templateUrl: 'views/editor.html',
    controller: 'EditorCtrl'
  });
}])

.factory('RDFEditor', ['$q', "usSpinnerService", 'RDFEConfig', 'Notification', 'DocumentTree', function($q, usSpinnerService, RDFEConfig, Notification, DocumentTree) {
  var editor = null;

  function getEditor() {
    if(editor) {
      return $q.when(editor);
    }
    else {
      return $q(function(resolve, reject) {
        RDFEConfig.getConfig().then(function(config) {
          editor = new RDFE.Editor(config, DocumentTree);

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

.filter('namingSchemaLabel', function() {
  return function(input, scope, plural, lowercase) {
    if (scope.namingSchema) {
      var ndx = (plural === true) ? 1 : 0;
      return scope.namingSchema[input][ndx];
    }
  };
})

.filter('viewModeKey', function() {
  return function(input) {
    switch(input) {
      case 'triples':
        return 'spo';
      case 'predicates':
        return 'p';
      case 'entities':
        return 's';
      case 'values':
        return 'o';
      default:
        return input;
    }
  };
})

.controller(
  'EditorCtrl', [
  '$rootScope', '$scope', '$routeParams', '$location', '$timeout', "usSpinnerService", 'RDFEditor', 'DocumentTree', 'Notification',
  function($rootScope, $scope, $routeParams, $location, $timeout, usSpinnerService, RDFEditor, DocumentTree, Notification) {

  function toggleSpinner(on) {
    if(on) {
      usSpinnerService.spin('editor-spinner');
    }
    else {
      usSpinnerService.stop('editor-spinner');
    }
  }

  function getIO(ioType, sparqlEndpoint, ioTimeout) {
    var authFunction;
    if (DocumentTree.getAuthInfo) {
      authFunction = function(url, success, fail) {
        DocumentTree.getAuthInfo(url, true).then(success, fail);
      };
    }

    var io = RDFE.IO.createIO(ioType, {
      "sparqlEndpoint": sparqlEndpoint,
      "gspEndpoint": $('#gspEndpoint').val(),
      "ioTimeout": ioTimeout
    });
    io.type = ioType;
    io.options.authFunction = authFunction;

    return io;
  }

  function ioRetrieve(url, type, sparqlEndpoint, ioTimeout) {
    var io_rdfe;
    try {
      io_rdfe = getIO(type || "sparql", sparqlEndpoint, ioTimeout);

      // see if we have auth information cached
      var loadUrl= function(url, io_rdfe) {
        toggleSpinner(true);
        $scope.mainDoc.load(url, io_rdfe, function() {
          toggleView();
          $scope.editor.updateView();
          $scope.$apply(function() {
            // this is essentially a no-op to force the ui to update the url view
            $scope.mainDoc.url = url;
          });
          showViewEditor();
          $scope.editor.docChanged();
        }, function(state) {
          var msg = (state && state.message)? state.message: 'Failed to load document';
          Notification.notify('error', msg);
          toggleSpinner(false);
        });
      };
      if (DocumentTree.getAuthInfo) {
        DocumentTree.getAuthInfo(url, false).then(function(authInfo) {
          if(authInfo) {
            io_rdfe.options.username = authInfo.username;
            io_rdfe.options.password = authInfo.password;
          }
          loadUrl(url, io_rdfe);
        });
      }
      else {
        loadUrl(url, io_rdfe);
      }
    }
    catch(e) {
      Notification.notify('error', e);
      return;
    }

  }

  function toggleView() {
    var s = $routeParams["statement:subject"];
    var p = $routeParams["statement:predicate"];
    var o = $routeParams["statement:object"];

    if (s) {
      $scope.viewMode = ($routeParams["view"] === 'statements')? 'triples' :'entities';
    }
    else if (p) {
      $scope.viewMode = ($routeParams["view"] === 'statements')? 'triples' :'predicates';
    }
    else if (o) {
      $scope.viewMode = ($routeParams["view"] === 'statements')? 'triples' :'values';
    }
    else if (s || p || o) {
      $scope.viewMode = 'triples';
    }
    $scope.editor.toggleView($scope.viewMode)
  }

  function showViewEditor() {
    var newStatement = $routeParams["newStatement"];
    var s = $routeParams["statement:subject"];
    var p = $routeParams["statement:predicate"];
    var o = $routeParams["statement:object"];
    var view = $routeParams["view"];

    if (s && (!view || view === 'entities')) {
      $scope.editor.editSubject(s, newStatement);
    }
    else if (p && (!view || view === 'predicates')) {
      $scope.editor.editPredicate(p, newStatement);
    }
    else if (o && (!view || view === 'values')) {
      $scope.editor.editObject(o, newStatement);
    }
    else if ((s || p || o || newStatement) && (!view || view === 'statements')) {
      $scope.editor.editTriple(s, p, o, newStatement);
    }
  }

  RDFEditor.getEditor().then(function(editor) {
    $rootScope.editor = editor;
    $scope.editor = editor;
    $scope.namingSchema = editor.config.options[editor.config.options["namingSchema"]];
    $scope.mainDoc = $scope.editor.doc;
    $scope.ontologyManager = $scope.editor.ontologyManager;
    $scope.editor.render($("#contents"));

    // the browser requested that we save the current document
    if ($routeParams.saveDocument) {
      $scope.mainDoc.url = $routeParams.uri;
      $scope.mainDoc.io = getIO($routeParams.ioType, $routeParams.sparqlEndpoint, editor.config.options['ioTimeout']);
      $scope.saveDocument();
      $scope.editor.updateView();
    }

    // and if we are told, then we create a new document by clearing the old one
    else if ($routeParams.newDocument) {
      $scope.mainDoc.new(function() {
        toggleView();
        $scope.editor.updateView();
        $timeout(function() {
          // Any code in here will automatically have an $scope.apply() run afterwards
          if ($routeParams.uri) {
            $scope.mainDoc.url = $routeParams.uri;
            $scope.mainDoc.io = getIO($routeParams.ioType, $routeParams.sparqlEndpoint, editor.config.options['ioTimeout']);
          }
        });
        showViewEditor();
      }, function() {
        Notification.notity('error', "Failed to clear Document for unknown reasons.");
      });
    }

    // otherwise we try to load the requested document
    else if ($routeParams.uri) {
      var content = $.jStorage.get('rdfe:savedDocument', null);
      if (content) {
        $scope.mainDoc.store.clear(function() {
          $scope.mainDoc.store.loadTurtle(content, $scope.mainDoc.graph, $scope.mainDoc.graph, function(success, r) {
            if (success) {
              toggleView();
              $scope.editor.updateView();
              $timeout(function() {
                // this is essentially a no-op to force the ui to update the url view
                $scope.mainDoc.dirty = true;
                $scope.mainDoc.url = $routeParams.uri;
                $scope.mainDoc.io = getIO($routeParams.ioType, $routeParams.sparqlEndpoint, editor.config.options['ioTimeout']);
              });
              showViewEditor();
            }
          });
        });
      }
      else {
        ioRetrieve($routeParams.uri, $routeParams.ioType, $routeParams.sparqlEndpoint, editor.config.options['ioTimeout']);
      }
    }
    $.jStorage.deleteKey('rdfe:savedDocument');

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

  $scope.downloadDocumentAs = function() {
    // redirect to the browser and ask it for a uri to save to
    function download(filename, text) {
      var pom = document.createElement('a');
      pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
      pom.setAttribute('download', filename);

      if (document.createEvent) {
        var event = document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        pom.dispatchEvent(event);
      }
      else {
        pom.click();
      }
    }
    $scope.mainDoc.store.graph($scope.mainDoc.graph, function(success, graph){
      var serialized = graph.toNT();
      download('document.ttl', serialized);
    });
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
