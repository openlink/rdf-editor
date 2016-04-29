/*
 *  This file is part of the OpenLink RDF Editor
 *
 *  Copyright (C) 2014-2016 OpenLink Software
 *
 *  This project is free software; you can redistribute it and/or modify it
 *  under the terms of the GNU General Public License as published by the
 *  Free Software Foundation; only version 2 of the License, dated June 1991.
 *
 *  This program is distributed in the hope that it will be useful, but
 *  WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 *  General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License along
 *  with this program; if not, write to the Free Software Foundation, Inc.,
 *  51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA
 *
 */

if (typeof String.prototype.startsWith != 'function') {
  // see below for better implementation!
  String.prototype.startsWith = function(str) {
    return this.indexOf(str) == 0;
  };
}

if (!window.RDFE)
  window.RDFE = {};

RDFE.Editor = function(params, callback) {
  var self = this;
  var options = $.extend({"initOntologyManager": true}, params["options"]);

  // initialize our ontology manager
  self.ontologyManager = new RDFE.OntologyManager(params["config"].options);
  if (options.initOntologyManager === true) {
    self.ontologyManager.init();
  }
  self.config = params["config"];
  self.maxLength = self.config.options["maxLabelLength"];
  self.spinner = 0;

  // create our main document
  var docParams = {
    "config": params["config"],
    "documentTree": params["documentTree"],
    "ontologyManager": self.ontologyManager
  };
  new RDFE.Document(docParams, function(doc) {
    self.doc = doc;

    // store the config for future access
    $(self.doc).on('docChanged', function(e, doc) {
      self.docChanged();
    });

    if (callback) {
      callback(self);
    }
  });
};

RDFE.Editor.prototype.namingSchema = function() {
  return this.config.options[this.config.options["namingSchema"]];
};

RDFE.Editor.prototype.nodeFormatter = function(value) {
  var self = this;

  if (value.interfaceName == "Literal") {
    if (value.datatype == 'http://www.w3.org/2001/XMLSchema#dateTime') {
      return (new Date(value.nominalValue)).toString();
    }
    return RDFE.Utils.strAbbreviate(value.nominalValue, self.maxLength);
  }
  return RDFE.Utils.uriAbbreviate(value.toString(), self.maxLength);
};

RDFE.Editor.prototype.countFormatter = function(value, row, index) {
  return row.items.length;
};

RDFE.Editor.prototype.editableSubject = function(editor) {
  return function(triple) {
    return {
      "mode": "inline",
      "type": "rdfnode",
      "rdfnode": {
        "config": $.extend({}, editor.config.options, {"dereferenceLink": editor.dereference()}),
        "type": 'http://www.w3.org/1999/02/22-rdf-syntax-ns#Resource',
        "dereferenceLink": editor.dereference()
      },
      "value": triple["subject"]
    }
  };
};

RDFE.Editor.prototype.editablePredicate = function(editor) {
  return function(triple) {
    return {
      "mode": "inline",
      "type": "propertyBox",
      "propertyBox": {
        "ontologyManager": editor.ontologyManager,
        "dereferenceLink": editor.dereference()
      },
      "value": triple["predicate"].nominalValue
    };
  };
};

RDFE.Editor.prototype.editableObject = function(editor, predicate) {
  return function(triple) {
    return {
      "mode": "inline",
      "type": "rdfnode",
      "rdfnode": {
        "config": $.extend({}, editor.config.options, {"dereferenceLink": editor.dereference()}),
        "predicate": (predicate)? predicate(triple): null,
        "document": editor.doc,
        "ontologyManager": editor.ontologyManager,
        "dereferenceLink": editor.dereference()
      },
      "value": triple["object"]
    }
  };
};

RDFE.Editor.prototype.render = function(container) {
  this.container = container;

  this.container.empty();

  this.listContainer = $(document.createElement('div')).appendTo(this.container);
  this.formContainer = $(document.createElement('div')).appendTo(this.container);

  // this.toggleView(this.config.options.defaultView);
};

RDFE.Editor.prototype.docChanged = function() {
  var self = this;

  self.doc.store.graph(self.doc.graph, function(success, graph){
    var serialized = '<![CDATA[' + graph.toNT() + ']]>';
    $('body').find('script[type="text/turtle"][id="document"]').text(serialized);
  });
};

/**
 * Get the name of the current view mode.
 *
 * @return The current view mode which is either @p entites,
 * @p triples or @p undefined in case render() has not been
 * called yet.
 */
RDFE.Editor.prototype.currentView = function() {
  return this._currentView || this.config.options.defaultView;
};

/**
 * Toggle editor spinner.
 */
RDFE.Editor.prototype.toggleSpinner = function(on) {
  var self = this;

  if (on) {
    $(self).trigger('rdf-editor-start');
  }
  else {
    $(self).trigger('rdf-editor-done');
  }
};

/**
 * Toggle the view to the given @p view mode.
 * Nothing is done if the given @p view is already
 * the current one.
 */
RDFE.Editor.prototype.toggleView = function(view) {
  var self = this;

  if (view !== self._currentView) {
    if ((view === 'subjects') || (view === 'entities')) {
      if (self.config.options['useEntityEditor'] === true) {
        self.createEntityList();
      }
      else {
        self.createSubjectList();
      }
      self._currentView = view;
    }
    else if ((view === 'predicates') || ((view === 'attributes'))) {
      self.createPredicateList();
      self._currentView = view;
    }
    else if ((view === 'objects') || (view === 'values')) {
      self.createObjectList();
      self._currentView = view;
    }
    else {
      self.createTripleList();
      self._currentView = "triples";
    }
  }
};

/**
 * Forcefully update the contents in the current view.
 */
RDFE.Editor.prototype.updateView = function() {
  var self = this;

  if ((self._currentView === 'subjects') || (self._currentView === 'entities')) {
    if (self.config.options['useEntityEditor'] === true) {
      self.createEntityList();
    }
    else {
      self.createSubjectList();
    }
  }
  else if ((self._currentView === 'predicates') || (self._currentView === 'attributes')) {
    self.createPredicateList();
  }
  else if ((self._currentView === 'objects') || (self._currentView === 'values')) {
    self.createObjectList();
  }
  else {
    self.createTripleList();
  }
};

/**
 * Import RDF Turtle content into document.
 */
RDFE.Editor.prototype.importForm = function() {
  var self = this;
  var $form = $("#importModal");
  $form.find('#content').val('');
  $form.find('#contentType').val('text/turtle');

  $form.modal();
  $form.find('.ok').off();
  $form.find('.ok').on("click", function (e) {
    e.preventDefault();

    var content = $form.find('#content').val();
    var contentType = $form.find('#contentType').val();
    var success = function (result) {
      $form.modal('hide');
      self.updateView();
      self.docChanged();
      $(self).trigger('rdf-editor-success', {
        "type": "rdf-editor-success",
        "message": "Successfully imported RDF data."
      });
    };
    var fail = function (error) {
      $(self).trigger('rdf-editor-error', {
        "type": "rdf-editor-error",
        "message": "Failed to import RDF data. <br /> " + error.message
      });
    };
    self.doc.import(content, success, fail);
  });
};

/**
 * Sign document.
 */
RDFE.Editor.prototype.signDocumentForm = function() {
  var self = this;
  var $form = $("#signModal");
  var $formBody = $form.find('.modal-body');

  $formBody.empty();

  // Document is signed?
  self.doc.checkForSignature();

  var val = angular.element('[ng-controller=AuthHeaderCtrl]').scope();
  if (!val.profile) {
    // Sign is not possible - VAL is not installed or user is not logged
    $formBody.html('\
      <div class="form-group"> \
        <label class="col-sm-2 control-label">Signature</label> \
        <div class="col-sm-10"> \
          <p class="form-control-static">The user is not logged. Please, login and try again.</p> \
        </div> \
      </div>\
    ');
    $form.find('.ok').hide();;
  }
  else {
    // Sign is possible
    $formBody.html('\
      <div class="form-group"> \
        <label class="col-sm-2 control-label">Signature</label> \
        <div class="col-sm-10"> \
          <input type="text" class="form-control" name="signatureDocURI" id="signatureDocURI" value="{0}">\
        </div> \
      </div>\
    '.format((self.doc.signature)? self.doc.signature: self.doc.url+',signature'));
    $form.find('.ok').show();
    $form.find('.ok').off();
    $form.find('.ok').on("click", (function ($form) {
      return function (e) {
        e.preventDefault();

        var rdf = self.doc.store.rdf;
        var signatureDocURI = $form.find('#signatureDocURI').val();
        var triple = rdf.createTriple(rdf.createNamedNode(self.doc.url), rdf.createNamedNode('http://www.openlinksw.com/schemas/cert#hasSignature'), rdf.createNamedNode(signatureDocURI));
        var tripleExists;
        self.doc.checkTriple(triple, function(result){tripleExists = result;}, function(result){tripleExists = result;});
        var successTriple = function (s, results) {
          // sign the new content
          self.doc.store.graph(self.doc.graph, function(success, graph) {
            var content = graph.toNT();
            var callback = function(data, status, xhr) {
              if (status === 'error') {
                failTriple();
              }
              else {
                // save signature file
                var params = {
                  "contentType": 'text/plain',
                  "success": function() {
                    $form.modal('hide');

                    // update current list
                    self.updateView();
                    $(self).trigger('rdf-editor-success', {
                      "type": "rdf-editor-success",
                      "message": "Successfully signed document."
                    });
                  },
                  "error": failTriple
                }
                var io = RDFE.IO.createIO('webdav');
                io.type = 'webdav';
                io.insert(signatureDocURI, data, params);
              }
            };
            $.get('/ods/api/signature?content=' + content).done(function(data, status, xhr) {
              callback(data, status, xhr);
            }).fail(function(data, status, xhr) {
              callback(data, status, xhr);
            });
          });
        };
        var failTriple = function (s, results) {
          if (!tripleExists) {
            self.doc.deleteTriples(triple);
          }
          $(self).trigger('rdf-editor-error', {
            "type": "rdf-editor-error",
            "message": "Failed to sign document."
          });
        };
        if (tripleExists) {
          successTriple();
        }
        else {
          self.doc.addTriples(triple, successTriple, failTriple);
        }
      };
    })($form)
    );
  }
  $form.modal();
};

/**
 * Unsign document.
 */
RDFE.Editor.prototype.unsignDocumentForm = function() {
  var self = this;
  var $form = $("#unsignModal");
  var $formBody = $form.find('.modal-body');

  $formBody.empty();

  // Document is signed?
  self.doc.checkForSignature();

  if (self.doc.signature) {
    // Signed documents
    $formBody.html('\
      <div class="form-group"> \
        <label class="col-sm-2 control-label">Signature</label> \
        <div class="col-sm-10"> \
          <p class="form-control-static">{0}</p> \
        </div> \
      </div>\
      <div class="form-group"> \
        <label class="col-sm-2"></label> \
        <div class="col-sm-10 checkbox"> \
          <label><input type="checkbox" name="deleteSignature" id="deleteSignature" value="on"><strong>Delete Signature File</strong></label>\
        </div> \
      </div>\
    '.format(self.doc.signature));
    $form.find('.ok').show();;
    $form.find('.ok').off();
    $form.find('.ok').on("click", (function ($form) {
      return function (e) {
        e.preventDefault();

        var successTriple = function () {
          $form.modal('hide');
          self.updateView();
          $(self).trigger('rdf-editor-success', {
            "type": "rdf-editor-success",
            "message": "Successfully unsigned document."
          });
        };
        var failTriple = function () {
          $(self).trigger('rdf-editor-error', {
            "type": "rdf-editor-error",
            "message": "Failed to unsign document."
          });
        };
        var deleteSignatureTriple = function () {
          var rdf = self.doc.store.rdf;
          var triple = rdf.createTriple(rdf.createNamedNode(self.doc.url), rdf.createNamedNode('http://www.openlinksw.com/schemas/cert#hasSignature'), rdf.createNamedNode(self.doc.signature));
          self.doc.deleteTriples(triple, successTriple, failTriple);
        };
        if ($form.find('#deleteSignature').checked) {
          var params = {
            "success": deleteSignatureTriple,
            "error": failTriple
          };
          var io = RDFE.IO.createIO('webdav');
          io.type = 'webdav';
          io.delete(self.doc.signature);
        }
        else {
          deleteSignatureTriple();
        }
      };
    })($form)
    );
  }
  else {
    // Unsigned documents
    $formBody.html('\
      <div class="form-group"> \
        <label class="col-sm-2 control-label">Signature</label> \
        <div class="col-sm-10"> \
          <p class="form-control-static">Document has not signature</p> \
        </div> \
      </div>\
    ');
    $form.find('.ok').hide();;
  }
  $form.modal();
};

RDFE.Editor.prototype.dereference = function() {
  var self = this;

  return function(editor) {
    return function(url) {
      if (!url)
        return;

      if (url.startsWith('#')) {
        if (!editor.doc.url) {
          return;
        }

        url = editor.doc.url + url;
      }

      if (url.startsWith('http')) {
        var win = window.open(url, '_blank');
        win.focus();
      }
    };
  }(self);
};

RDFE.Editor.prototype.createTripleList = function() {
  var self = this;

  self.toggleSpinner(true);

  if (!self.tripleView) {
    self.tripleView = new RDFE.TripleView(self);
  }

  self.formContainer.hide();
  self.listContainer.empty().show();

  setTimeout(function() {
    self.tripleView.render(self.listContainer, function() {
      self.toggleSpinner(false);
    });
  }, 0);
};

RDFE.Editor.prototype.editTriple = function(s, p, o) {
  var self = this;

  if (!self.doc) {
    return false;
  }

  self.listContainer.hide();
  self.formContainer.html(
    '<div class="panel panel-default">' +
    '  <div class="panel-heading"><h3 class="panel-title">Add new ' + RDFE.Utils.namingSchemaLabel('spo', self.namingSchema()) + '</h3></div>' +
    '  <div class="panel-body">' +
    '    <form class="form-horizontal">' +
    '      <div class="form-group"><label for="subject" class="col-sm-2 control-label">' + RDFE.Utils.namingSchemaLabel('s', self.namingSchema()) + '</label>' +
    '        <div class="col-sm-10"><input name="subject" class="form-control" /></div>' +
    '      </div>' +
    '      <div class="form-group"><label for="predicate" class="col-sm-2 control-label">' + RDFE.Utils.namingSchemaLabel('p', self.namingSchema()) + '</label>' +
    '        <div class="col-sm-10"><select name="predicate" class="form-control"></select></div>' +
    '      </div>' +
    '      <div class="form-group"><label for="object" class="col-sm-2 control-label">' + RDFE.Utils.namingSchemaLabel('o', self.namingSchema()) + '</label>' +
    '        <div class="col-sm-10"><input name="object" class="form-control" /></div>' +
    '      </div>' +
    '      <div class="form-group">' +
    '        <div class="col-sm-10 col-sm-offset-2">' +
    '          <button type="button" class="btn btn-default triple-action triple-action-new-cancel">Cancel</button> ' +
    '          <button type="submit" class="btn btn-primary triple-action triple-action-new-save">OK</button> ' +
    '        </div>' +
    '      </div>' +
    '    </form>' +
    '  </div>' +
    '</div>'
  ).show();

  var subjectEditor = self.formContainer.find('input[name="subject"]');
  // Set focus
  subjectEditor.focus();

  if (s || self.saveSubject) {
    self.formContainer.find('input[name="subject"]').val(s || self.saveSubject);
  }

 var objectEditor = self.formContainer.find('input[name="object"]').rdfNodeEditor(self.config.options);
  // Set object value
  if (o) {
    objectEditor.setValue(new RDFE.RdfNode('literal', o, null, ''));
  }

  var predicateEditor = self.formContainer.find('select[name="predicate"]').propertyBox({
    "ontologyManager": self.ontologyManager
  }).on('changed', function(e, p) {
    self.changeObjectType(p, objectEditor);
  });

  // Set predicate value
  if (p) {
    predicateEditor.setPropertyURI(p);
  }

  self.formContainer.find('button.triple-action-new-cancel').click(function(e) {
    e.preventDefault();
    self.createTripleList();
  });

  self.formContainer.find('button.triple-action-new-save').click(function(e) {
    e.preventDefault();

    var s = subjectEditor.val();
    s = RDFE.Utils.trim(RDFE.Utils.trim(s, '<'), '>')
    if (!RDFE.Validate.check(subjectEditor, s))
      return;

    var p = predicateEditor.selectedURI();
    p = RDFE.Utils.trim(RDFE.Utils.trim(p, '<'), '>')
    if (!RDFE.Validate.check(predicateEditor.sel, p))
      return;

    var o = objectEditor.getValue();
    if (o.type == 'uri') {
      o.value = self.ontologyManager.uriDenormalize(o.value);
    }
    if (!RDFE.Validate.check(objectEditor.getField(), o.value))
      return;

    var t = self.doc.store.rdf.createTriple(self.doc.store.rdf.createNamedNode(s), self.doc.store.rdf.createNamedNode(p), o.toStoreNode(self.doc.store));
    self.doc.addTriples([t], function() {
      if (self.tripleView) {
        self.tripleView.addTriple(t);
      }
      $(self).trigger('rdf-editor-success', {
        "type": "triple-insert-success",
        "message": "Successfully added new triple."
      });
      self.saveSubject = s;
      self.createTripleList();
    }, function() {
      $(self).trigger('rdf-editor-error', {
        "type": 'triple-insert-failed',
        "message": "Failed to add new triple to store."
      });
    });
  });
};

// Entities
RDFE.Editor.prototype.createNewEntityEditor = function(forcedType) {
  var self = this;

  var $ontologiesSelect, ontologiesSelect;
  var $classesSelect, classesSelect;

  var classesList = function (e) {
    var ontology = self.ontologyManager.ontologyByURI(e.currentTarget.selectedOntologyURI());
    classesSelect.clearOptions();
    classesSelect.addOption(ontology ? ontology.classesAsArray() : self.ontologyManager.allClasses());
  };

  if (!self.doc) {
    return false;
  }

  self.listContainer.hide();
  self.formContainer.show();

  if (!forcedType) {
    self.formContainer.html(
      '<div class="panel panel-default">' +
      '<div class="panel-heading"><h3 class="panel-title">Add new ' + RDFE.Utils.namingSchemaLabel('s', self.namingSchema()) + '</h3></div>' +
      '<div class="panel-body"><div class="form-horizontal"> ' +
      '  <div class="form-group"> ' +
      '    <label for="ontology" class="col-sm-2 control-label">Vocabulary</label> ' +
      '    <div class="col-sm-10"> ' +
      '      <select name="ontology" id="ontology" class="form-control" /> ' +
      '    </div> ' +
      '  </div> ' +
      '  <div class="form-group"> ' +
      '    <label for="class" class="col-sm-2 control-label">Type</label> ' +
      '    <div class="col-sm-10"> ' +
      '      <select name="class" id="class" class="form-control" /> ' +
      '    </div> ' +
      '  </div> ' +
      '  <div class="form-group"> ' +
      '     <label for="subject" class="col-sm-2 control-label">' + RDFE.Utils.namingSchemaLabel('s', self.namingSchema()) + ' URI</label> ' +
      '     <div class="col-sm-10"> ' +
      '       <input name="subject" id="subject" class="form-control" /> ' +
      '     </div> ' +
      '  </div> ' +
      '  <div class="form-group"> ' +
      '    <div class="col-sm-10 col-sm-offset-2"> ' +
      '      <button type="button" class="btn btn-default triple-action triple-action-new-cancel">Cancel</button> ' +
      '      <button type="submit" class="btn btn-primary triple-action triple-action-new-save">OK</button> ' +
      '    </div> ' +
      '  </div> ' +
      '</div></div></div>\n');

    ontologiesSelect = $('#ontology').ontoBox({ "ontologyManager": self.ontologyManager });
    ontologiesSelect.on('changed', classesList);
    ontologiesSelect.sel.focus();

    // FIXME: this is all pretty much the same as in the PropertyBox, in any case it should be moved into a separate class/file
    $classesSelect = $('#class').selectize({
      create: true,
      valueField: 'URI',
      labelField: 'URI',
      searchField: [ "title", "label", "prefix", "URI" ],
      sortField: [ "prefix", "URI" ],
      options: self.ontologyManager.allClasses(),
      create: function(input, cb) {
        // search for and optionally create a new class
        cb(self.ontologyManager.ontologyClassByURI(self.ontologyManager.uriDenormalize(input), true));
      },
      render: {
        item: function(item, escape) {
          var x = item.title || item.label || name.curi || item.name;
          if(item.curi && item.curi != x) {
            x = escape(x) + ' <small>(' + escape(item.curi) + ')</small>';
          }
          else {
            x = escape(x);
          }
          return '<div>' + x + '</div>';
        },
        option: function(item, escape) {
          return '<div>' + escape(item.title || item.label || name.curi || item.name) + '<br/><small>(' + escape(item.URI) + ')</small></div>';
        },
        'option_create': function(data, escape) {
          var url = self.ontologyManager.uriDenormalize(data.input);
          if (url != data.input)
            return '<div class="create">Add <strong>' + escape(data.input) + '</strong> <small>(' + escape(url) + ')</small>&hellip;</div>';
          else
            return '<div class="create">Add <strong>' + escape(url) + '</strong>&hellip;</div>';
        }
      }
    });
    classesSelect = $classesSelect[0].selectize;
  }
  else {
    var forcedTypeRes = self.ontologyManager.ontologyClassByURI(forcedType);
    var forcedTypeLabel = forcedTypeRes ? forcedTypeRes.label : RDFE.Utils.uri2name(forcedType);
    self.formContainer.html(
      '<div class="panel panel-default">' +
      '<div class="panel-heading"><h3 class="panel-title">Add new ' + RDFE.Utils.namingSchemaLabel('s', self.namingSchema()) + '</h3></div>' +
      '<div class="panel-body"><div class="form-horizontal"> ' +
      '  <div class="form-group"> ' +
      '    <label for="class" class="col-sm-2 control-label">Type</label> ' +
      '    <div class="col-sm-10"> ' +
      '      <p class="form-control-static" title="' + forcedType + '">' + forcedTypeLabel + '</p>' +
      '    </div> ' +
      '  </div> ' +
      '  <div class="form-group"> ' +
      '     <label for="subject" class="col-sm-2 control-label">' + RDFE.Utils.namingSchemaLabel('s', self.namingSchema()) + ' URI</label> ' +
      '     <div class="col-sm-10"> ' +
      '       <input name="subject" id="subject" class="form-control" /> ' +
      '     </div> ' +
      '  </div> ' +
      '  <div class="form-group"> ' +
      '    <div class="col-sm-10 col-sm-offset-2"> ' +
      '      <button type="button" class="btn btn-default triple-action triple-action-new-cancel">Cancel</button> ' +
      '      <button type="submit" class="btn btn-primary triple-action triple-action-new-save">OK</button> ' +
      '    </div> ' +
      '  </div> ' +
      '</div></div></div>\n');
    self.formContainer.find('input#subject').focus();
  }

  // if we have an entity uri template we ask the user to provide a nem instead of the uri
  if (self.config.options.entityUriTmpl) {
    self.formContainer.find('label[for="subject"]').text(RDFE.Utils.namingSchemaLabel('s', self.namingSchema()) + ' Name');
  }

  self.formContainer.find('button.triple-action-new-cancel').click(function(e) {
    e.preventDefault();
    self.listContainer.show();
    self.formContainer.hide();
  });

  var saveFct = function() {
    var uri = self.formContainer.find('input[name="subject"]').val(),
        name = null,
        type = forcedType || self.formContainer.find('#class')[0].selectize.getValue();

    uri = RDFE.Utils.trim(RDFE.Utils.trim(uri, '<'), '>')
    if(self.config.options.entityUriTmpl) {
      name = uri;
      uri = null;
    }

    self.doc.addEntity(uri, name, type, function(ent) {
      if (self.entityView) {
        self.entityView.addEntity(ent);
      }

      $(self).trigger('rdf-editor-success', {
        "type": "entity-insert-success",
        "message": "Successfully created new entity."
      });

      // once the new entity is created we open the editor
      self.editEntity(ent.uri);
    }, function() {
      $(self).trigger('rdf-editor-error', {
        "type": 'triple-insert-failed',
        "message": "Failed to add new triple to store."
      });
    });
  };

  self.formContainer.find('button.triple-action-new-save').click(function(e) {
    e.preventDefault();

    saveFct();
  });

  self.formContainer.find('input#subject').keypress(function(e) {
    if(e.which === 13) {
      saveFct();
    }
  })
};

RDFE.Editor.prototype.createEntityList = function() {
  var self = this;

  self.toggleSpinner(true);

  if (!self.entityView) {
    self.entityView = new RDFE.EntityView(self.doc, self.ontologyManager, self, {
      editFct: function(uri) {
        self.editEntity.call(self, uri);
      }
    });
    $(self.entityView).on('rdf-editor-error', function(e) {
      $(self).trigger('rdf-editor-error', d);
    }).on('rdf-editor-success', function(e, d) {
      $(self).trigger('rdf-editor-success', d);
    });
  }

  self.formContainer.hide();
  self.listContainer.empty().show();
  setTimeout(function() {
    self.entityView.render(self.listContainer, function() {
      self.toggleSpinner(false);
    });
  }, 0);
};

RDFE.Editor.prototype.editEntity = function(uri) {
  var self = this;

  if (!self.entityEditor) {
    self.entityEditor = new RDFE.EntityEditor(self.doc, self.ontologyManager);
    $(self.entityEditor).on('rdf-editor-error', function(e) {
      $(self).trigger('rdf-editor-error', d);
    }).on('rdf-editor-success', function(e, d) {
      $(self).trigger('rdf-editor-success', d);
    });
  }

  // render the entity editor and re-create the entity list once the editor is done
  self.listContainer.hide();
  self.formContainer.show();
  self.entityEditor.render(self.formContainer, uri, function() {
    self.formContainer.hide();
    self.listContainer.show();
    self.entityView.updateEntity(uri);
  });
};

// Subjects
RDFE.Editor.prototype.createSubjectList = function() {
  var self = this;

  self.toggleSpinner(true);

  if (!self.subjectView) {
    self.subjectView = new RDFE.SubjectView(self, {
      "editFct": function(subject) {
        self.editSubject.call(self, subject);
      }
    });
  }

  self.formContainer.hide();
  self.listContainer.empty().show();
  setTimeout(function() {
    self.subjectView.render(self.listContainer, function() {
      self.toggleSpinner(false);
    });
  }, 0);
};

RDFE.Editor.prototype.editSubject = function(subject, newStatement) {
  var self = this;

  if (!self.subjectEditor) {
    self.subjectEditor = new RDFE.SubjectEditor(self);
  }

  // subject as URL parameter
  if (typeof subject === 'string') {
    subject = self.doc.newSubject(subject);
  }

  // render the entity editor and re-create the entity list once the editor is done
  self.listContainer.hide();
  self.formContainer.show();
  self.subjectEditor.subject = subject;
  self.subjectEditor.render(self, self.formContainer, newStatement, function() {
    self.formContainer.hide();
    self.listContainer.show();
    if (subject && subject.uri) {
      self.subjectView.updateSubject(subject.uri);
    }
  });
};

// Predicates
RDFE.Editor.prototype.createPredicateList = function() {
  var self = this;

  self.toggleSpinner(true);

  if (!self.predicateView) {
    self.predicateView = new RDFE.PredicateView(self, {
      editFct: function(predicate) {
        self.editPredicate.call(self, predicate);
      }
    });
  }

  self.formContainer.hide();
  self.listContainer.empty().show();
  setTimeout(function() {
    self.predicateView.render(self.listContainer, function() {
      self.toggleSpinner(false);
    });
  }, 0);
};

RDFE.Editor.prototype.editPredicate = function(predicate, newStatement) {
  var self = this;

  if (!self.predicateEditor) {
    self.predicateEditor = new RDFE.PredicateEditor(self);
  }

  // render the entity editor and re-create the entity list once the editor is done
  self.listContainer.hide();
  self.formContainer.show();

  // predicate as URL parameter
  if (typeof predicate === 'string') {
    predicate = self.doc.newPredicate(predicate);
  }

  if (predicate) {
    self.ontologyManager.ontologyPropertyByURI(predicate.uri, true);
  }

  self.predicateEditor.predicate = predicate;
  self.predicateEditor.render(self, self.formContainer, newStatement, function() {
    self.formContainer.hide();
    self.listContainer.show();
    if (predicate && predicate.uri) {
      self.predicateView.updatePredicate(predicate.uri);
    }
  });
};

// Predicates
RDFE.Editor.prototype.createObjectList = function() {
  var self = this;

  self.toggleSpinner(true);

  if (!self.objectView) {
    self.objectView = new RDFE.ObjectView(self, {
      editFct: function(object) {
        self.editObject.call(self, object);
      }
    });
  }

  self.formContainer.hide();
  self.listContainer.empty().show();
  setTimeout(function() {
    self.objectView.render(self.listContainer, function() {
      self.toggleSpinner(false);
    });
  }, 0);
};

RDFE.Editor.prototype.editObject = function(object, newStatement) {
  var self = this;

  if (!self.objectEditor) {
    self.objectEditor = new RDFE.ObjectEditor(self);
  }

  // subject as URL parameter
  if (typeof object === 'string') {
    object = self.doc.newObject(object);
  }

  // render the entity editor and re-create the entity list once the editor is done
  self.listContainer.hide();
  self.formContainer.show();
  self.objectEditor.object = object;
  self.objectEditor.render(self, self.formContainer, newStatement, function() {
    self.formContainer.hide();
    self.listContainer.show();
    if (object) {
      self.objectView.updateObject(object);
    }
  });
};

RDFE.Editor.prototype.changeObjectType = function (predicate, objectEditor) {
  var self = this;

  var node;
  var nodeItems;
  var range;
  var currentNode = objectEditor.getValue();
  if (predicate) {
    ranges = predicate.getRange();
    if (ranges) {
      nodeItems = self.doc.itemsByRange(ranges);
      if (nodeItems) {
        node = new RDFE.RdfNode('uri', currentNode.value);
        if (predicate.URI !== 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
          self.objectsLookup(objectEditor, ranges);
        }
      }
      else {
        for (var i = 0; i < ranges.length; i++) {
          if (objectEditor.isLiteralType(ranges[i])) {
            node = new RDFE.RdfNode('literal', currentNode.value, ranges[i], currentNode.language);
          }
        }
      }
    }
  }
  if (!node) {
    node = new RDFE.RdfNode('literal', currentNode.value, null, '');
  }
  objectEditor.setValue(node, nodeItems);
};

RDFE.Editor.prototype.objectsLookup = function (objectEditor, ranges) {
  var self = this;

  var objectLookups = self.config.options["objectLookups"];
  if (!objectLookups || !objectLookups.enabled) {
    return;
  }

  var sources = objectLookups.sources;
  if (!sources) {
    return;
  }
  var io = RDFE.IO.createIO('http');
  var store = self.doc.store;
  for (var i = 0; i < sources.length; i++) {
    for (var j = 0; j < ranges.length; j++) {
      var range = ranges[j];
      var graph = 'urn:__GRAPH__' + i + '_' + j;
      var url = sources[i].url.format(encodeURIComponent(range));
      var success = function(graph, range, label) {
        return function (data, status, xhr) {
          store.loadTurtle(data, graph, graph, null, function(error, result) {
            if (!error) {
              var sparql = 'select ?s from <{0}> where {?s a <{1}>}'.format(graph, range);
              store.execute(sparql, function (success, result) {
                var nodeItems = [];
                for (var l = 0; l < result.length; l++) {
                  nodeItems.push(new RDFE.RdfNode('uri', result[l].s.value));
                }
                objectEditor.updateSelection(label, nodeItems);
              });
            }
          });
          store.clear(graph, function(){});
        };
      }(graph, range, sources[i].label);
      var params = {
        "success": success
      };
      io.retrieveToStore(url, store, graph, params);
    }
  }
};

RDFE.Editor.prototype.dataSetter = function(field, oldTriple, newTriple) {
  var self = this;
  var node = newTriple[field];

  if      (field === 'subject') {
    node = self.doc.store.rdf.createNamedNode(node.value);
  }
  else if (field === 'predicate') {
    node = self.doc.store.rdf.createNamedNode(node);
  }
  else if (field === 'object') {
    if (node.type === 'uri') {
      node = self.doc.store.rdf.createNamedNode(node.value);
    }
    else if (node.type === 'http://www.w3.org/2001/XMLSchema#dateTime') {
      var dt = new Date(node.value);
      node = self.doc.store.rdf.createLiteral(dt.toISOString(), node.language, node.type);
    }
    else {
      node = self.doc.store.rdf.createLiteral(node.value, node.language, node.type);
    }
  }
  newTriple[field] = node;
  self.doc.updateTriple(oldTriple, newTriple, function(success) {
    // do nothing
    $(self).trigger('rdf-editor-success', {
      "type": 'triple-update-success',
      "message": "Successfully updated triple."
    });
  }, function(error) {
    $(self).trigger('rdf-editor-error', {
      "type": 'triple-update-error',
      "message": 'Failed to update triple.'
    });
  });
};
