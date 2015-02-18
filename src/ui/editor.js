if (typeof String.prototype.startsWith != 'function') {
  // see below for better implementation!
  String.prototype.startsWith = function(str) {
    return this.indexOf(str) == 0;
  };
}

if(!window.RDFE)
  window.RDFE = {};

RDFE.Editor = function(config, options) {
  var self = this;
  var options = $.extend({"initOntologyManager": true}, options);

  // initialize our ontology manager
  this.ontologyManager = new RDFE.OntologyManager(config.options);
  if (options.initOntologyManager === true) {
    this.ontologyManager.init();
  }

  // create our main document
  this.doc = new RDFE.Document(this.ontologyManager, config);

  // store the config for future access
  this.config = config;
};

RDFE.Editor.prototype.render = function(container) {
  this.container = container;

  this.container.empty();

  this.listContainer = $(document.createElement('div')).appendTo(this.container);
  this.formContainer = $(document.createElement('div')).appendTo(this.container);

  this.toggleView(this.config.options.defaultView);
};

/**
 * Get the name of the current view mode.
 *
 * @return The current view mode which is either @p entites,
 * @p triples or @p undefined in case render() has not been
 * called yet.
 */
RDFE.Editor.prototype.currentView = function() {
  return this._currentView;
};

/**
 * Toggle the view to the given @p view mode.
 * Nothing is done if the given @p view is already
 * the current one.
 */
RDFE.Editor.prototype.toggleView = function(view) {
  if(view !== this._currentView) {
    if (view === 'triples') {
      this.createTripleList();
      this._currentView = "triples";
    }
    else {
      this.createEntityList();
      this._currentView = "entities";
    }
  }
};

/**
 * Forcefully update the contents in the current view.
 */
RDFE.Editor.prototype.updateView = function() {
  if(this._currentView === 'triples') {
    this.createTripleList();
  }
  else if(this._currentView === 'entities') {
    this.createEntityList();
  }
};

RDFE.Editor.prototype.createTripleList = function() {
  var self = this;

  $(self).trigger('rdf-editor-start', {
    "id": "render-triple-list",
    "message": "Loading Triples..."
  });

  if(!this.tripleView) {
    this.tripleView = new RDFE.TripleView(this.doc, this.ontologyManager);
    $(self.tripleView).on('rdf-editor-error', function(e, d) {
      $(self).trigger('rdf-editor-error', d);
    }).on('rdf-editor-success', function(e, d) {
      $(self).trigger('rdf-editor-success', d);
    });
  }
  this.formContainer.hide();
  this.listContainer.empty().show();
  this.tripleView.render(self.listContainer, function() {
    $(self).trigger('rdf-editor-done', { "id": "render-triple-list" });
  });
};

RDFE.Editor.prototype.createNewStatementEditor = function() {
  var self = this;

  if (!this.doc) {
    return false;
  }

  self.listContainer.hide();
  self.formContainer.html(' \
      <div class="panel panel-default"> \
      <div class="panel-heading"><h3 class="panel-title">Add new Triple</h3></div> \
      <div class="panel-body"><div class="form-horizontal"> \
      <div class="form-group"><label for="subject" class="col-sm-2 control-label">Subject</label> \
      <div class="col-sm-10"><input name="subject" class="form-control" /></div></div> \
      <div class="form-group"><label for="predicate" class="col-sm-2 control-label">Predicate</label> \
      <div class="col-sm-10"><select name="predicate" class="form-control"></select></div></div> \
      <div class="form-group"><label for="object" class="col-sm-2 control-label">Object</label> \
      <div class="col-sm-10"><input name="object" class="form-control" /></div></div> \
      <div class="form-group"><div class="col-sm-10 col-sm-offset-2"><a href="#" class="btn btn-default triple-action triple-action-new-cancel">Cancel</a> \
        <a href="#" class="btn btn-primary triple-action triple-action-new-save">OK</a></div></div> \
      </form></div></div>\n').show();

  var objEd = self.formContainer.find('input[name="object"]').rdfNodeEditor();
  var propEd = self.formContainer.find('select[name="predicate"]').propertyBox({
    ontoManager: self.ontologyManager
  }).on('changed', function(e, p) {
    console.log('changed', p)
    var cn = objEd.getValue(), n;
    var range = p.getRange();
    if(objEd.isLiteralType(range)) {
      n = new RDFE.RdfNode('literal', cn.value, range, cn.language);
    }
    else if(self.ontologyManager.ontologyClassByURI(range)) {
      n = new RDFE.RdfNode('uri', cn.value);
    }
    else {
      n = new RDFE.RdfNode('literal', cn.value, null, '');
    }
    objEd.setValue(n);
  });

  self.formContainer.find('a.triple-action-new-cancel').click(function(e) {
    self.createTripleList();
  });

  self.formContainer.find('a.triple-action-new-save').click(function(e) {
    var s = self.formContainer.find('input[name="subject"]').val();
    var p = propEd.selectedURI();
    var o = objEd.getValue();
    var t = self.doc.store.rdf.createTriple(self.doc.store.rdf.createNamedNode(s), self.doc.store.rdf.createNamedNode(p), o.toStoreNode(self.doc.store));
    self.doc.addTriples([t], function() {
      if (self.tripleView) {
        self.tripleView.addTriple(t);
      }
      $(self).trigger('rdf-editor-success', {
        "type": "triple-insert-success",
        "message": "Successfully added new triple."
      });

      self.createTripleList();
    }, function() {
      $(self).trigger('rdf-editor-error', {
        "type": 'triple-insert-failed',
        "message": "Failed to add new triple to store."
      });
    });
  });
};

RDFE.Editor.prototype.createNewEntityEditor = function(forcedType) {
  var self = this;
  var $ontologiesSelect, ontologiesSelect;
  var $classesSelect, classesSelect;

  var classesList = function (e) {
    var ontology = self.ontologyManager.ontologyByURI(e.currentTarget.selectedOntologyURI());
    classesSelect.clearOptions();
    classesSelect.addOption(ontology ? ontology.classesAsArray() : self.ontologyManager.allClasses());
  };

  if (!this.doc) {
    return false;
  }


  this.listContainer.hide();
  this.formContainer.show();

  if (!forcedType) {
    self.formContainer.html(
      '<div class="panel panel-default">' +
      '<div class="panel-heading"><h3 class="panel-title">Add new Entity</h3></div>' +
      '<div class="panel-body"><div class="form-horizontal"> ' +
      '  <div class="form-group"> ' +
      '    <label for="ontology" class="col-sm-2 control-label">Ontology</label> ' +
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
      '     <label for="subject" class="col-sm-2 control-label">Entity URI</label> ' +
      '     <div class="col-sm-10"> ' +
      '       <input name="subject" id="subject" class="form-control" /> ' +
      '     </div> ' +
      '  </div> ' +
      '  <div class="form-group"> ' +
      '    <div class="col-sm-10 col-sm-offset-2"> ' +
      '      <a href="#" class="btn btn-default triple-action triple-action-new-cancel">Cancel</a> ' +
      '      <a href="#" class="btn btn-primary triple-action triple-action-new-save">OK</a> ' +
      '    </div> ' +
      '  </div> ' +
      '</div></div></div>\n');

    ontologiesSelect = $('#ontology').ontoBox({ "ontoManager": self.ontologyManager });
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
        cb(self.ontologyManager.OntologyClass(null, self.ontologyManager.uriDenormalize(input)));
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
      '<div class="panel-heading"><h3 class="panel-title">Add new Entity</h3></div>' +
      '<div class="panel-body"><div class="form-horizontal"> ' +
      '  <div class="form-group"> ' +
      '    <label for="class" class="col-sm-2 control-label">Type</label> ' +
      '    <div class="col-sm-10"> ' +
      '      <p class="form-control-static" title="' + forcedType + '">' + forcedTypeLabel + '</p>' +
      '    </div> ' +
      '  </div> ' +
      '  <div class="form-group"> ' +
      '     <label for="subject" class="col-sm-2 control-label">Entity URI</label> ' +
      '     <div class="col-sm-10"> ' +
      '       <input name="subject" id="subject" class="form-control" /> ' +
      '     </div> ' +
      '  </div> ' +
      '  <div class="form-group"> ' +
      '    <div class="col-sm-10 col-sm-offset-2"> ' +
      '      <a href="#" class="btn btn-default triple-action triple-action-new-cancel">Cancel</a> ' +
      '      <a href="#" class="btn btn-primary triple-action triple-action-new-save">OK</a> ' +
      '    </div> ' +
      '  </div> ' +
      '</div></div></div>\n');
    self.formContainer.find('input#subject').focus();
  }

  // if we have an entity uri template we ask the user to provide a nem instead of the uri
  if(this.config.options.entityUriTmpl) {
    self.formContainer.find('label[for="subject"]').text('Entity Name');
  }

  self.formContainer.find('a.triple-action-new-cancel').click(function(e) {
    self.listContainer.show();
    self.formContainer.hide();
  });

  var saveFct = function() {
    var uri = self.formContainer.find('input[name="subject"]').val(),
        name = null,
        type = forcedType || self.formContainer.find('#class')[0].selectize.getValue();

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

  self.formContainer.find('a.triple-action-new-save').click(function(e) {
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

  $(self).trigger('rdf-editor-start', {
    "id": "render-entity-list",
    "message": "Loading Entities..."
  });

  if(!self.entityView) {
    self.entityView = new RDFE.EntityView(this.doc, this.ontologyManager, {
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
  self.entityView.render(self.listContainer, function() {
    $(self).trigger('rdf-editor-done', {
      "id": "render-entity-list"
    });
  });
};

RDFE.Editor.prototype.editEntity = function(uri) {
  var self = this;
  if(!self.entityEditor) {
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
