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
        case 'SPO':
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

  function getIO(accept, ioType, sparqlEndpoint, ioTimeout) {
    var authFunction;
    if (DocumentTree.getAuthInfo) {
      authFunction = function(url, success, fail) {
        DocumentTree.getAuthInfo(url, true).then(success, fail);
      };
    }

    var io = RDFE.IO.createIO(ioType, {
      "sparqlEndpoint": sparqlEndpoint,
      "gspEndpoint": $('#gspEndpoint').val(),
      "ioTimeout": ioTimeout,
      "accept": accept
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
    else if (view) {
      $scope.viewMode = view;
    }
    if (!uiMode) {
      if      (['triples', 'subjects', 'predicates', 'objects'].indexOf($scope.viewMode) > -1) {
        $scope.editor.config.options.namingSchema = 'SPO';
      }
      else if (['statements', 'entities', 'entities', 'values'].indexOf($scope.viewMode) > -1) {
        $scope.editor.config.options.namingSchema = 'EAV';
      }
    }

    if (!$scope.viewMode) {
      $scope.viewMode = $scope.editor.config.defaultView;
      if (!$scope.viewMode) {
        $scope.viewMode = 'statements';
      }
    }

    $scope.editor.toggleView($scope.viewMode)
    if      ($scope.viewMode === 'statements') {
      $scope.viewMode = 'triples';
    }
    else if ($scope.viewMode === 'entities') {
      $scope.viewMode = 'subjects';
    }
    else if ($scope.viewMode === 'attributes') {
      $scope.viewMode = 'predicates';
    }
    else if ($scope.viewMode === 'values') {
      $scope.viewMode = 'objects';
    }
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
      s = $scope.editor.ontologyManager.uriDenormalize(s || e);
      $scope.editor.editSubject(s, newStatement);
    }
    else if ((p || a) && (!view || view === 'predicates'|| view === 'attributes')) {
      p = $scope.editor.ontologyManager.uriDenormalize(p || a);
      $scope.editor.editPredicate(p, newStatement);
    }
    else if ((o || v) && (!view || view === 'objects' || view === 'values')) {
      $scope.editor.editObject(o || v, newStatement);
    }
    else if ((s || p || o || e || a || v || newStatement) && (!view || view === 'statements' || view === 'triples')) {
      $scope.editor.editTriple(s || e, p || a, o || v, newStatement);
    }
  }

  function verifyParams() {
    var errors = {
      "params": [],
      "paramValues": [],
      "paramMixed": []
    };
    var colectParamError = function(hasError, key) {
      if (hasError)
        errors.params.push(key);

      return hasError;
    };
    var colectParamValueError = function(hasError, key) {
      if (hasError)
        errors.paramValues.push(key);

      return hasError;
    };
    var colectParamMixedError = function(hasError, key) {
      if (hasError)
        errors.paramValues.push(key);

      return hasError;
    };
    var paramDescriptions = {
      "uiMode": {
        "defaultValue": function () {
          var v;
          for (var key in $routeParams) {
            if (!$routeParams.hasOwnProperty(key))
              continue;

            var paramDescription = paramDescriptions[key];
            if (!paramDescription)
              continue;

            var paramReference = paramDescription["paramReference"];
            if (paramReference && (paramReference === 'uiMode')) {
              if (typeof paramDescription["value"] === 'string') {
                if (colectParamMixedError(v && (v !== paramDescription["value"]), key))
                  return;

                v = paramDescription["value"];
              }
              if (typeof paramDescription["value"] === 'object') {
                for (var keyValue in paramDescription["value"]) {
                  var values = paramDescription["value"][keyValue];
                  for (var i = 0; i < values.length; i++) {
                    if ($routeParams[key] === values[i]) {
                      if (colectParamMixedError(v && (v !== keyValue), key))
                        return;

                      v = keyValue;
                    }
                  }
                }
              }
            }
          }

          if (!v)
            v = 'EAV';

          return v;
        },
        "value": ['EAV', 'SPO']
      },
      "view": {
        "paramReference": 'uiMode',
        "value": {
          "eav": ['statements', 'entities', 'attributes', 'values'],
          "spo": ['triples', 'subjects', 'predicates', 'objects']
        }
      },

      "triple:subject": {
        "paramReference": 'uiMode',
        "value": 'SPO'
      },
      "spo:subject": {
        "paramReference": 'uiMode',
        "value": 'SPO'
      },
      "triple:predicate": {
        "paramReference": 'uiMode',
        "value": 'SPO'
      },
      "spo:predicate": {
        "paramReference": 'uiMode',
        "value": 'SPO'
      },
      "triple:object": {
        "paramReference": 'uiMode',
        "value": 'SPO'
      },
      "spo:object": {
        "paramReference": 'uiMode',
        "value": 'SPO'
      },

      "statement:entity": {
        "paramReference": 'uiMode',
        "value": 'EAV'
      },
      "eav:entity": {
        "paramReference": 'uiMode',
        "value": 'EAV'
      },
      "statement:attribute": {
        "paramReference": 'uiMode',
        "value": 'EAV'
      },
      "eav:attribute": {
        "paramReference": 'uiMode',
        "value": 'EAV'
      },
      "statement:value": {
        "paramReference": 'uiMode',
        "value": 'EAV'
      },
      "eav:value": {
        "paramReference": 'uiMode',
        "value": 'EAV'
      },

      "uri": {},
      "accept": ['text/turtle', 'application/ld+json'],
      "ioType": ['http', 'ldp', 'webdav', 'sparql'],
      "ioTimeout": {},
      "sparqlEndpoint": {},

      "newDocument": ['true', 'false'],
      "saveDocument": ['true', 'false'],

      "newStatement": ['true', 'false']
    };
    for (var key in $routeParams) {
      if (!$routeParams.hasOwnProperty(key))
        continue;

      var keyValue = $routeParams[key];
      var paramDescription = paramDescriptions[key];

      // Is parameter exists
      if (colectParamError(paramDescription === undefined, key))
        continue;

      if (paramDescription instanceof Array) {
        for (var i = 0; i < paramDescription.length; i++) {
          if (keyValue === paramDescription[i])
            break;
        }
        if (colectParamValueError(i === paramDescription.length, key))
          continue;
      }
      else if (typeof paramDescription === 'object') {
        // No special validations
        if ($.isEmptyObject(paramDescription))
          continue;

        var paramReference = paramDescription["paramReference"];
        if (paramReference) {
          var paramReferenceValue = $routeParams[paramReference];
          if (!paramReferenceValue) {
            paramReferenceValue = paramDescriptions[paramReference]["defaultValue"]();
            if (!paramReferenceValue)
              break;
          }

          // Param is enabled only when param reference value is ...
          if (typeof paramDescription["value"] === 'string') {
            colectParamError(paramDescription["value"] !== paramReferenceValue, key);
            continue;
          }

          // Param is enabled only when param reference value is ...
          if (typeof paramDescription["value"] === 'object') {
            var values = paramDescription["value"][paramReferenceValue];
            if (!values)
              contimue;

            for (var i = 0; i < values.length; i++) {
              if (keyValue === values[i])
                break;
            }
            if (colectParamValueError(i === values.length, key))
              continue;
          }
        }
      }
    }

    if (errors.params.length || errors.paramValues.length || errors.paramMixed.length) {
      var delimiter;
      var msg = 'Params validation errors:'
      if (errors.params.length) {
        msg += ' <br/>&nbsp;&nbsp;Unsupported or mixed parameters: ';
        delimiter = '';
        for (var i = 0; i < errors.params.length; i++) {
          msg += delimiter + errors.params[i];
          delimiter = ', ';
        }
      }
      if (errors.paramValues.length) {
        msg += ' <br/>&nbsp;&nbsp;Bad values for parameters: ';
        delimiter = '';
        for (var i = 0; i < errors.paramValues.length; i++) {
          msg += delimiter + '[' + errors.paramValues[i] + '=' + $routeParams[errors.paramValues[i]] + ']';
          delimiter = ', ';
        }
      }
      if (errors.paramMixed.length) {
        msg += ' <br/>&nbsp;&nbsp;Mixed parameters: ';
        delimiter = '';
        for (var i = 0; i < errors.paramMixed.length; i++) {
          msg += delimiter + errors.paramMixed[i];
          delimiter = ', ';
        }
      }
      Notification.notify('error', msg);
    }

  }

  function processParams() {
    var uri = $routeParams.uri;
    var accept = $routeParams.accept;
    if (accept === 'turtle') {
      accept = 'text/turtle';
    }
    else if (accept === 'jsonld') {
      accept = 'application/ld+json';
    }
    var ioType = $routeParams.ioType || 'http';
    var ioTimeout = $routeParams.ioTimeout || $scope.editor.config.options['ioTimeout'];
    var sparqlEndpoint = $routeParams.sparqlEndpoint;
    var newDocument = $routeParams.newDocument;

    $scope.doc = $scope.editor.doc;
    $scope.editor.render($("#contents"));

    // the browser requested that we save the current document
    if ($routeParams.saveDocument === "true") {
      $scope.doc.url = uri;
      $scope.doc.io = getIO(accept, ioType, sparqlEndpoint, ioTimeout);
      $scope.saveDocument();
      $scope.editor.updateView();
    }

    // and if we are told, then we create a new document by clearing the old one
    else if ((newDocument === "true") || ((newDocument === "false") && !uri)) {
      $scope.doc.new(function() {
        toggleView();
        $scope.editor.saveSubject = null;
        $scope.editor.updateView();
        $timeout(function() {
          // Any code in here will automatically have an $scope.apply() run afterwards
          if ((newDocument !== "false") && uri) {
            $scope.doc.url = uri;
            $scope.doc.io = getIO(accept, ioType, sparqlEndpoint, ioTimeout);
          }
        });
        showViewEditor();
      }, function() {
        Notification.notity('error', "Failed to clear Document for unknown reasons.");
      });
    }

    // otherwise we try to load the requested document
    else if (uri) {
      var content = $.jStorage.get('rdfe:savedDocument', null);
      if (content) {
        $scope.doc.store.clear(function() {
          $scope.doc.store.loadTurtle(content, $scope.doc.graph, $scope.doc.graph, null, function(error) {
            if (!error) {
              toggleView();
              $scope.editor.saveSubject = null;
              $scope.editor.updateView();
              $timeout(function() {
                // this is essentially a no-op to force the ui to update the url view
                $scope.doc.dirty = true;
                if (newDocument === "false") {
                  $scope.doc.url = null;
                }
                else {
                  $scope.doc.url = uri;
                  $scope.doc.io = getIO(accept, ioType, sparqlEndpoint, ioTimeout);
                }
              });
              showViewEditor();
            }
          });
        });
      }
      else {
        try {
          var io = getIO(accept, ioType, sparqlEndpoint, ioTimeout);
          var loadUrl= function(url, io) {
            $scope.editor.toggleSpinner(true);
            $scope.doc.load(url, io, function() {
              toggleView();
              $scope.editor.updateView();
              $scope.$apply(function() {
                // this is essentially a no-op to force the ui to update the url view
                if (newDocument === "false") {
                  $scope.doc.url = null;
                }
                else {
                  $scope.doc.url = uri;
                  $scope.doc.io = io;
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
            DocumentTree.getAuthInfo(uri, false).then(function(authInfo) {
              if (authInfo) {
                io_rdfe.options.username = authInfo.username;
                io_rdfe.options.password = authInfo.password;
              }
              loadUrl(uri, io);
            });
          }
          else {
            loadUrl(uri, io);
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

    $scope.ontologyView = new RDFE.OntologyView($scope.editor);
    $scope.ontologyView.render($('#container-ontologies'));
    $('#ontology-add').click(function (e) {
      e.stopPropagation();
      $scope.ontologyView.editor();
    });
  }

  function saveCheck(cbSave, myUrl, myIo) {
    if (!myUrl) {
      myUrl = $scope.doc.url;
    }
    if (!myIo) {
      myIo = $scope.doc.io;
    }
    var mySave = function (data, status, xhr) {
      if (status === 'success') {
        if ((!$scope.doc.url || ($scope.doc.io && ($scope.doc.io !== myIo))) && data.length)  {
          bootbox.confirm("Target document exists. Do you really want to overwrite it?", function(result) {
            if (result)
              cbSave(myUrl, myIo);
          });

          return;
        }
        if ($scope.doc.srcParams && (($scope.doc.srcParams.length !== data.length) || ($scope.doc.srcParams.md5 !== $.md5(data)))) {
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
    if($scope.doc.dirty) {
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
    if ($scope.doc.url) {
      var cbSave = function () {
        $scope.editor.toggleSpinner(true);
        $scope.doc.save(function() {
          $scope.editor.toggleSpinner(false);
          Notification.notify('success', "Successfully saved document to <code>" + $scope.doc.url + "</code>");
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
    $scope.doc.store.graph($scope.doc.graph, function(success, graph){
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
    if($scope.doc.dirty) {
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

  // Create editor instance
  if ($scope.editor) {
    processParams();
  }
  else {
    RDFEditor.getEditor().then(function(editor) {
      $rootScope.editor = editor;
      $scope.editor = editor;

      verifyParams();
      processParams();
    });
  }

}]);
