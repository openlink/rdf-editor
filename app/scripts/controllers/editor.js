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
    if (editor) {
      return $q.when(editor);
    }
    else {
      return $q(function(resolve, reject) {
        RDFEConfig.getConfig().then(function(config) {
          var params = {
            "config": config,
            "documentTree": DocumentTree
          };
          new RDFE.Editor(params, function(editor) {
            // subscribe to editor events FIXME: a service does not seem like the best place to do this
            $(editor).on('rdf-editor-success', function(e, d) {
              Notification.notify('success', d.message);
            }).on('rdf-editor-error', function(e, d) {
              Notification.notify('error', d.message);
            }).on('rdf-editor-start', function(e, d) {
              editor.spinner++;
              if (editor.spinner === 1) {
                usSpinnerService.spin('editor-spinner');
              }
            }).on('rdf-editor-done', function(e, d) {
              if (editor.spinner > 0) {
                editor.spinner--;
              }
              if (editor.spinner === 0) {
                usSpinnerService.stop('editor-spinner');
              }
            });

            resolve(editor);
          });
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
    if (scope.editor) {
      var namingSchema = scope.editor.namingSchema();
      return namingSchema[input][(plural === true) ? 1 : 0];
    }
  };
})

.filter('namingSchemaTitle', function() {
  return function(input, scope) {
    if (scope.editor) {
      var namingSchema = scope.editor.namingSchema();

      switch(input) {
        case 'spo':
          return (namingSchema === 'SPO')? 'RDF Statement Graph Representation [Data]': 'Entity Relationship Representation  [Data]';
        case 's':
          return (namingSchema === 'SPO')? 'Items described by sentence Predicate & Object pairs in this document': 'Items described by Attribute & Value pairs in this document';
        case 'p':
          return (namingSchema === 'SPO')? 'How Sentence Subjects and Objects are associated': 'How Entities and their Attribute Values are associated';
        case 'o':
          return (namingSchema === 'SPO')? 'Objects & Data Types associated with a  Sentence Subject via its Predicate': 'Values & Data Types associated with an Entity Attribute';
        default:
          return input;
      }
    }
  };
})

.controller(
  'EditorCtrl', [
  '$rootScope', '$scope', '$routeParams', '$location', '$timeout', "usSpinnerService", 'RDFEditor', 'DocumentTree', 'Notification',
  function($rootScope, $scope, $routeParams, $location, $timeout, usSpinnerService, RDFEditor, DocumentTree, Notification) {

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

  function toggleView() {
    var s = $routeParams["triple:subject"]      || $routeParams["spo:subject"];
    var p = $routeParams["triple:predicate"]    || $routeParams["spo:predicate"];
    var o = $routeParams["triple:object"]       || $routeParams["spo:object"];
    var e = $routeParams["statement:entity"]    || $routeParams["eav:entity"];    ;
    var a = $routeParams["statement:attribute"] || $routeParams["eav:attribute"];
    var v = $routeParams["statement:value"]     || $routeParams["eav:value"];
    var view = $routeParams["view"];
    var uiMode = $routeParams["uiMode"];

    if (s) {
      $scope.viewMode = ((view === 'triples') || (view === 'statements'))? view :'subjects';
    }
    else if (p) {
      $scope.viewMode = ((view === 'triples') || (view === 'statements'))? view :'predicates';
    }
    else if (o) {
      $scope.viewMode = ((view === 'triples') || (view === 'statements'))? view :'objects';
    }
    else if (s || p || o) {
      $scope.viewMode = 'triples';
    }
    if (e) {
      $scope.viewMode = ((view === 'triples') || (view === 'statements'))? view :'entities';
    }
    else if (a) {
      $scope.viewMode = ((view === 'triples') || (view === 'statements'))? view :'entities';
    }
    else if (v) {
      $scope.viewMode = ((view === 'triples') || (view === 'statements'))? view :'values';
    }
    else if (e || a || v) {
      $scope.viewMode = 'statements';
    }
    else if ((view === 'subjects') || (view === 'entities')) {
      $scope.viewMode = view;
    }
    else if ((view === 'predicates') || (view === 'attributes')) {
      $scope.viewMode = view;
    }
    else if ((view === 'objects') || (view === 'values')) {
      $scope.viewMode = view;
    }
    if (!uiMode) {
      if      (['triples', 'subjects', 'predicates', 'objects'].indexOf($scope.viewMode) > -1) {
        $scope.editor.config.options.namingSchema = 'SPO';
        $scope.namingSchema = $scope.editor.config.options['SPO'];
      }
      else if (['statements', 'entities', 'entities', 'values'].indexOf($scope.viewMode) > -1) {
        $scope.editor.config.options.namingSchema = 'EAV';
        $scope.namingSchema = $scope.editor.config.options['EAV'];
      }
    }

    if (!$scope.viewMode) {
      $scope.viewMode = $scope.editor.config.defaultView;
      if (!$scope.viewMode) {
        $scope.viewMode = 'statements';
      }
    }

    $scope.editor.toggleView($scope.viewMode)
  }

  function showViewEditor() {
    var newStatement = $routeParams["newStatement"];
    var s = $routeParams["triple:subject"]      || $routeParams["spo:subject"];
    var p = $routeParams["triple:predicate"]    || $routeParams["spo:predicate"];
    var o = $routeParams["triple:object"]       || $routeParams["spo:object"];
    var e = $routeParams["statement:entity"]    || $routeParams["eav:entity"];    ;
    var a = $routeParams["statement:attribute"] || $routeParams["eav:attribute"];
    var v = $routeParams["statement:value"]     || $routeParams["eav:value"];
    var view = $scope.viewMode;

    if      ((s || e) && (!view || view === 'subjects' || view === 'entities')) {
      s = $scope.ontologyManager.uriDenormalize(s || e);
      $scope.editor.editSubject(s, newStatement);
    }
    else if ((p || a) && (!view || view === 'predicates'|| view === 'attributes')) {
      p = $scope.ontologyManager.uriDenormalize(p || a);
      $scope.editor.editPredicate(p, newStatement);
    }
    else if ((o || v) && (!view || view === 'objects' || view === 'values')) {
      $scope.editor.editObject(o || v, newStatement);
    }
    else if ((s || p || o || newStatement) && (!view || view === 'triples')) {
      $scope.editor.editTriple(s, p, o, newStatement);
    }
    else if ((e || a || v || newStatement) && (!view || view === 'statements')) {
      $scope.editor.editTriple(e, a, v, newStatement);
    }
  }

  RDFEditor.getEditor().then(function(editor) {
    $rootScope.editor = editor;
    $scope.editor = editor;
    $scope.namingSchema = editor.namingSchema;
    $scope.mainDoc = $scope.editor.doc;
    $scope.ontologyManager = $scope.editor.ontologyManager;
    $scope.editor.render($("#contents"));

    // the browser requested that we save the current document
    if ($routeParams.saveDocument === "true") {
      $scope.mainDoc.url = $routeParams.uri;
      $scope.mainDoc.io = getIO($routeParams.ioType, $routeParams.sparqlEndpoint, editor.config.options['ioTimeout']);
      $scope.saveDocument();
      $scope.editor.updateView();
    }

    // and if we are told, then we create a new document by clearing the old one
    else if (($routeParams.newDocument === "true") || (($routeParams.newDocument === "false") && !$routeParams.uri)) {
      $scope.mainDoc.new(function() {
        toggleView();
        $scope.editor.saveSubject = null;
        $scope.editor.updateView();
        $timeout(function() {
          // Any code in here will automatically have an $scope.apply() run afterwards
          if (($routeParams.newDocument !== "false") && $routeParams.uri) {
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
          $scope.mainDoc.store.loadTurtle(content, $scope.mainDoc.graph, $scope.mainDoc.graph, null, function(error) {
            if (!error) {
              toggleView();
              $scope.editor.saveSubject = null;
              $scope.editor.updateView();
              $timeout(function() {
                // this is essentially a no-op to force the ui to update the url view
                $scope.mainDoc.dirty = true;
                if ($routeParams.newDocument === "false") {
                  $scope.mainDoc.url = null;
                }
                else {
                  $scope.mainDoc.url = $routeParams.uri;
                  $scope.mainDoc.io = getIO($routeParams.ioType, $routeParams.sparqlEndpoint, editor.config.options['ioTimeout']);
                }
              });
              showViewEditor();
            }
          });
        });
      }
      else {
        try {
          var io = getIO($routeParams.ioType || 'http', $routeParams.sparqlEndpoint, editor.config.options['ioTimeout']);
          var loadUrl= function(url, io) {
            $scope.editor.toggleSpinner(true);
            $scope.mainDoc.load(url, io, function() {
              toggleView();
              $scope.editor.updateView();
              $scope.$apply(function() {
                // this is essentially a no-op to force the ui to update the url view
                if ($routeParams.newDocument === "false") {
                  $scope.mainDoc.url = null;
                }
                else {
                  $scope.mainDoc.url = $routeParams.uri;
                  $scope.mainDoc.io = io;
                }
              });
              showViewEditor();
              $scope.editor.docChanged();
              $scope.editor.toggleSpinner(false);
            }, function(state, data, status, xhr) {
              var msg = (state && state.message)? state.message: 'Failed to load document';
              Notification.notify('error', msg);
              $scope.editor.toggleSpinner(false);
            });
          };

          // see if we have auth information cached
          if (DocumentTree.getAuthInfo) {
            DocumentTree.getAuthInfo($routeParams.uri, false).then(function(authInfo) {
              if (authInfo) {
                io_rdfe.options.username = authInfo.username;
                io_rdfe.options.password = authInfo.password;
              }
              loadUrl($routeParams.uri, io);
            });
          }
          else {
            loadUrl($routeParams.uri, io);
          }
        }
        catch(e) {
          Notification.notify('error', e);
        }
      }
    }
    else {
      toggleView();
      showViewEditor();
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

  $scope.saveDocument = function() {
    if ($scope.mainDoc.url) {
      var cbSave = function () {
        $scope.editor.toggleSpinner(true);
        $scope.mainDoc.save(function() {
          $scope.editor.toggleSpinner(false);
          Notification.notify('success', "Successfully saved document to <code>" + $scope.mainDoc.url + "</code>");
        }, function(err) {
          $scope.editor.toggleSpinner(false);
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

  $scope.signDocument = function() {
    $scope.editor.signDocumentForm();
  };

  $scope.importInto = function() {
    $scope.editor.importForm();
  };

  $scope.unsignDocument = function() {
    $scope.editor.unsignDocumentForm();
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
