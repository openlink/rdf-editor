'use strict';

angular.module('myApp.editor', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider
  .when('/editor', {
    "templateUrl": 'views/editor.html',
    "controller": 'EditorCtrl',
    "reloadOnSearch": false
  });
}])

.run(function($rootScope) {
  $rootScope.eav2spo = {
    "statements": 'triples',
    "entities": 'subjects',
    "attributes": 'predicates',
    "values": 'objects',
    "triples": 'triples',
    "subjects": 'subjects',
    "predicates": 'predicates',
    "objects": 'objects'
  };
  $rootScope.spo2eav = {
    "triples": 'statements',
    "subjects": 'entities',
    "predicates": 'attributes',
    "objects": 'values',
    "statements": 'statements',
    "entities": 'entities',
    "attributes": 'attributes',
    "values": 'values'
  };
})

.factory('RDFEditor', ['$q', '$rootScope', '$location', "$timeout", "usSpinnerService", 'RDFEConfig', 'Notification', 'DocumentTree', function($q, $rootScope, $location, $timeout, usSpinnerService, RDFEConfig, Notification, DocumentTree) {
  var editor = null;

  function getEditor() {
    if (editor) {
      return $q.when(editor);
    }

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
          }).on('rdf-editor-spinner-start', function(e, spinner) {
            if (spinner === 'editor-spinner') {
              editor.spinner++;
              if (editor.spinner === 1) {
                usSpinnerService.spin(spinner);
              }
            }
            if (spinner === 'export-spinner') {
              usSpinnerService.spin(spinner);
            }
          }).on('rdf-editor-spinner-done', function(e, spinner) {
            if (spinner === 'editor-spinner') {
              if (editor.spinner > 0) {
                editor.spinner--;
              }
              if (editor.spinner === 0) {
                usSpinnerService.stop('editor-spinner');
              }
            }
            if (spinner === 'export-spinner') {
              usSpinnerService.stop(spinner);
            }
          }).on('rdf-editor-page', function(e, pageParams) {
            var pageSettings = editor.config.options.pageSettings;
            var pageSearches = $location.search();
            if (pageParams["view"] && (pageSearches["view"] !== pageParams["view"])) {
              $location.search('view', pageParams["view"]);
              $location.search('pageNo', null);
              $location.search('sortName', null);
              $location.search('sortOrder', null);
              pageSettings["pageNo"] = null;
              pageSettings["sortName"] = null;
              pageSettings["sortOrder"] = null;
            }
            if (pageParams["pageNo"] && (pageSettings["pageNo"] !== pageParams["pageNo"])) {
              $location.search('pageNo', pageParams["pageNo"]);
              pageSettings["pageNo"] = pageParams["pageNo"];
            }
            if (pageParams["pageSize"] && (pageSettings["pageSize"] !== pageParams["pageSize"])) {
              $location.search('pageSize', pageParams["pageSize"]);
              pageSettings["pageSize"] = pageParams["pageSize"];
            }
            if (pageParams["sortName"] && (pageSettings["sortName"] !== pageParams["sortName"])) {
              $location.search('sortName', pageParams["sortName"]);
              pageSettings["sortName"] = pageParams["sortName"];
            }
            if (pageParams["sortOrder"] && (pageSettings["sortOrder"] !== pageParams["sortOrder"])) {
              $location.search('sortOrder', pageParams["sortOrder"]);
              pageSettings["sortOrder"] = pageParams["sortOrder"];
            }
            var pageSearch = '';
            pageSearches = $location.search();
            for (var key in pageSearches) {
              pageSearch += '&' + key + '=' + encodeURIComponent(pageSearches[key]);
            }
            var newUrl = $location.path() + '?' + pageSearch;
            $timeout(function() {
              $location.url(newUrl)
            });
          }).on('rdf-editor-namingSchema', function(e, params) {
            var newKey;
            var newValue;
            var transformArray = {
              "triple:subject":      'statement:entity',
              "triple:predicate":    'statement:attribute',
              "triple:object":       'statement:value',
              "spo:subject":         'eav:attribute',
              "spo:predicate":       'eav:entity',
              "spo:object":          'eav:value',
              "statement:entity":    'triple:subject',
              "statement:attribute": 'triple:predicate',
              "statement:value":     'triple:object',
              "eav:attribute":       'spo:subject',
              "eav:entity":          'spo:predicate',
              "eav:value":           'spo:object'
            };
            var uiMode = params["uiMode"];
            var viewMode = params["viewMode"];
            var pageSearch = '';
            var pageSearches = $location.search();
            for (var key in pageSearches) {
              newKey = key;
              newValue = pageSearches[key];
              if (key === 'view') {
                newValue = (uiMode === 'EAV')? $rootScope.spo2eav[newValue]: $rootScope.eav2spo[newValue];
              }
              else if (transformArray[key]) {
                newKey = transformArray[key];
              }
              pageSearch += '&' + newKey + '=' + newValue;
            }
            var newUrl = $location.path() + '?' + pageSearch;
            $rootScope.uiMode = uiMode;
            $rootScope.viewMode = (uiMode === 'EAV')? $rootScope.spo2eav[viewMode]: $rootScope.eav2spo[viewMode];
            $rootScope.radioViewMode = $rootScope.viewMode;

            $timeout(function() {
              $location.url(newUrl)
            });
          });

          resolve(editor);
        });
      });
    });
  }

  return {
    "getEditor": getEditor
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
  'EditorCtrl',
  ['$rootScope', '$scope', '$routeParams', '$location', '$timeout', "usSpinnerService", 'RDFEditor', 'DocumentTree', 'Notification',
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
    var viewMode;

    if (s) {
      viewMode = ((view === 'triples') || (view === 'statements'))? view :'subjects';
    }
    else if (p) {
      viewMode = ((view === 'triples') || (view === 'statements'))? view :'predicates';
    }
    else if (o) {
      viewMode = ((view === 'triples') || (view === 'statements'))? view :'objects';
    }
    else if (s || p || o) {
      viewMode = 'triples';
    }
    if (e) {
      viewMode = ((view === 'triples') || (view === 'statements'))? view :'entities';
    }
    else if (a) {
      viewMode = ((view === 'triples') || (view === 'statements'))? view :'entities';
    }
    else if (v) {
      viewMode = ((view === 'triples') || (view === 'statements'))? view :'values';
    }
    else if (e || a || v) {
      viewMode = 'statements';
    }
    else if (view) {
      viewMode = view;
    }

    if (!uiMode) {
      if      (['triples', 'subjects', 'predicates', 'objects'].indexOf(viewMode) > -1) {
        uiMode = 'SPO';
      }
      else if (['statements', 'entities', 'entities', 'values'].indexOf(viewMode) > -1) {
        uiMode = 'EAV';
      }
      if (!uiMode) {
        var settings = $.jStorage.get('rdfe:settings', {});
        uiMode = settings["namingSchema"];
      }
      if (!uiMode) {
        uiMode = $scope.editor.config.options.namingSchema;
      }
    }

    if (!viewMode) {
      viewMode = $scope.editor.config.defaultView;
      if (!viewMode) {
        viewMode = 'statements';
      }
    }

    // page settings params
    var pageSettings = $scope.editor.config.options.pageSettings;
    if ($routeParams["pageNo"]) {
      var tmp = parseInt($routeParams["pageNo"]);
      if (tmp !== NaN) {
        pageSettings.pageNo = tmp;
      }
    }

    if ($routeParams["pageSize"]) {
      var tmp = parseInt($routeParams["pageSize"]);
      if (tmp !== NaN) {
        pageSettings.pageSize = tmp;
      }
    }

    if ($routeParams["sortName"]) {
      pageSettings.sortName = $routeParams["sortName"];
    }

    if ($routeParams["sortOrder"]) {
      pageSettings.sortOrder = $routeParams["sortOrder"];
    }

    $scope.editor.config.options.namingSchema = uiMode;

    $rootScope.uiMode = uiMode;
    $rootScope.viewMode = (uiMode === 'EAV')? $scope.spo2eav[viewMode]: $scope.eav2spo[viewMode];
    $rootScope.radioViewMode = $scope.viewMode;
    $scope.editor.toggleView($scope.viewMode, $scope.uiMode)
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

          return (v)? v: 'EAV';
        },
        "value": ['EAV', 'SPO']
      },
      "view": {
        "paramReference": 'uiMode',
        "value": {
          "EAV": ['statements', 'entities', 'attributes', 'values'],
          "SPO": ['triples', 'subjects', 'predicates', 'objects']
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

      "pageNo": {},
      "pageSize": {},
      "sortName": {},
      "sortOrder": {},

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
              continue;

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

    if (!$scope.ontologyView) {
      $scope.ontologyView = new RDFE.OntologyView($scope.editor);
      $scope.ontologyView.render($('#container-ontologies'));
      $('#ontology-add').click(function (e) {
        e.stopPropagation();
        $scope.ontologyView.editor();
      });
    }

    // watch changes in the view mode to update the editor
    $scope.$watch(function(scope) {
      return scope.radioViewMode;
    }, function(mode) {
      if (!mode)
        return;

      var viewMode = $scope.viewMode;
      $scope.viewMode = ($scope.uiMode === 'EAV')? $scope.spo2eav[mode]: $scope.eav2spo[mode];
      $scope.radioViewMode = $scope.eav2spo[$scope.radioViewMode];
      if (viewMode !== $scope.viewMode)
        $scope.editor.toggleView($scope.viewMode, $scope.uiMode);
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

  $scope.settings = function() {
    $scope.editor.settingsForm();
  };

  $scope.signDocument = function() {
    $scope.editor.signDocumentForm();
  };

  $scope.importInto = function() {
    $scope.editor.importForm();
  };

  $scope.exportInto = function() {
    $scope.editor.exportForm();
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
  if (!$scope.editor) {
    RDFEditor.getEditor().then(function(editor) {
      $rootScope.editor = editor;

      verifyParams();
      processParams();
    });
  }
  else {
    processParams();
  }

}]);
