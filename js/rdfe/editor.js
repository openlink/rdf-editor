if (typeof String.prototype.startsWith != 'function') {
  // see below for better implementation!
  String.prototype.startsWith = function(str) {
    return this.indexOf(str) == 0;
  };
}

if(!window.RDFE)
  window.RDFE = {};

RDFE.Editor = function(doc, ontoMan, params) {
  var self = this;

  this.doc = doc;
  this.ontologyManager = ontoMan;
};

RDFE.Editor.prototype.createTripleList = function(container, callback) {
  var self = this;

  if(!this.tripleView) {
    this.tripleView = new RDFE.TripleView(this.doc, this.ontologyManager);
    $(self.tripleView).on('rdf-editor-error', function(e, d) {
      $(self).trigger('rdf-editor-error', d);
    }).on('rdf-editor-success', function(e, d) {
      $(self).trigger('rdf-editor-success', d);
    });
  }
  this.tripleView.render(container, callback);
};

RDFE.Editor.prototype.createNewStatementEditor = function(container) {
  var self = this;

  if (!this.doc)
    return false;

  container.html(' \
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
        <a href="#" class="btn btn-primary triple-action triple-action-new-save">Save</a></div></div> \
      </form></div></div>\n');

  var objEd = container.find('input[name="object"]').rdfNodeEditor();
  var propEd = container.find('select[name="predicate"]').propertyBox({
    ontoManager: self.ontologyManager
  }).on('changed', function(e, p) {
    console.log('changed', p)
    var cn = objEd.getValue(), n;
    if(objEd.isLiteralType(p.range)) {
      n = new RDFE.RdfNode('literal', cn.value, p.range, cn.language);
    }
    else if(self.ontologyManager.ontologyClassByURI(p.range)) {
      n = new RDFE.RdfNode('uri', cn.value);
    }
    else {
      n = new RDFE.RdfNode('literal', cn.value, null, '');
    }
    objEd.setValue(n);
  });

  container.find('a.triple-action-new-cancel').click(function(e) {
    container.empty();
  });

  container.find('a.triple-action-new-save').click(function(e) {
    var s = container.find('input[name="subject"]').val();
    var p = propEd.selectedURI();
    var o = objEd.getValue();
    var t = self.doc.store.rdf.createTriple(self.doc.store.rdf.createNamedNode(s), self.doc.store.rdf.createNamedNode(p), o.toStoreNode(self.doc.store));
    self.doc.addTriple(t, function() {
      container.empty();

      if (self.tripleView) {
        self.tripleView.addTriple(t);
      }
      $(self).trigger('rdf-editor-success', {
        "type": "triple-insert-success",
        "message": "Successfully added new triple."
      });
    }, function() {
      $(self).trigger('rdf-editor-error', {
        "type": 'triple-insert-failed',
        "message": "Failed to add new triple to store."
      });
    });
  });
};

RDFE.Editor.prototype.createNewEntityEditor = function(container, manager) {
  var self = this;
  var $ontologiesSelect, ontologiesSelect;
  var $classesSelect, classesSelect;

  var classesList = function (e) {
    var ontology = manager.ontologyByURI(e.currentTarget.selectedOntologyURI());
    classesSelect.clearOptions();
    classesSelect.addOption(ontology ? ontology.classesAsArray() : self.ontologyManager.allClasses());
  };

  if (!this.doc) {
    return false;
  }

  container.html(
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
    '      <a href="#" class="btn btn-primary triple-action triple-action-new-save">Save</a> ' +
    '    </div> ' +
    '  </div> ' +
    '</div></div></div>\n');

  ontologiesSelect = $('#ontology').ontoBox({ "ontoManager": manager });
  ontologiesSelect.on('changed', classesList);

  // FIXME: this is all pretty much the same as in the PropertyBox
  $classesSelect = $('#class').selectize({
    create: true,
    valueField: 'URI',
    labelField: 'URI',
    searchField: [ "title", "label", "prefix", "URI" ],
    sortField: [ "prefix", "URI" ],
    options: self.ontologyManager.allClasses(),
    create: function(input, cb) {
      // search for and optionally create a new class
      cb(self.options.ontoManager.OntologyClass(null, self.options.ontoManager.uriDenormalize(input)));
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
        var url = self.options.ontoManager.uriDenormalize(data.input);
        if (url != data.input)
          return '<div class="create">Add <strong>' + escape(data.input) + '</strong> <small>(' + escape(url) + ')</small>&hellip;</div>';
        else
          return '<div class="create">Add <strong>' + escape(url) + '</strong>&hellip;</div>';
      }
    }
  });
  classesSelect = $classesSelect[0].selectize;

  container.find('a.triple-action-new-cancel').click(function(e) {
    container.empty();
  });

  container.find('a.triple-action-new-save').click(function(e) {
    var uri = container.find('input[name="subject"]').val();
    var o = self.doc.store.rdf.createNamedNode(container.find('#class')[0].selectize.getValue()),
        p = self.doc.store.rdf.createNamedNode(self.ontologyManager.uriDenormalize('rdf:type')),
        s = self.doc.store.rdf.createNamedNode(uri);
    var t = self.doc.store.rdf.createTriple(s, p, o);

    self.doc.addTriple(t, function() {
      container.empty();

      if (self.entityView) {
        self.entityView.addEntity({"uri": uri, "label": uri});
      }

      $(self).trigger('rdf-editor-success', {
        "type": "entity-insert-success",
        "message": "Successfully created new entity."
      });
    }, function() {
      $(self).trigger('rdf-editor-error', {
        "type": 'triple-insert-failed',
        "message": "Failed to add new triple to store."
      });
    });
  });
};

RDFE.Editor.prototype.createEntityList = function(container, callback) {
  var self = this;
  if(!self.entityView) {
    self.entityView = new RDFE.EntityView(this.doc, this.ontologyManager);
    $(self.entityView).on('rdf-editor-error', function(e) {
      $(self).trigger('rdf-editor-error', d);
    }).on('rdf-editor-success', function(e, d) {
      $(self).trigger('rdf-editor-success', d);
    });
  }
  self.entityView.render(container, callback);
};
