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

RDFE.Editor.io_strip_URL_quoting = function(str) {
  return (str.replace(RegExp('^<(.*)>$'), '$1'));
};

RDFE.Editor.prototype.makeTriple = function(s, p, o) {
  ss = this.doc.store.rdf.createNamedNode(RDFE.Editor.io_strip_URL_quoting(s));
  pp = this.doc.store.rdf.createNamedNode(RDFE.Editor.io_strip_URL_quoting(p));
  // let's be dumb about this for now
  o = RDFE.Editor.io_strip_URL_quoting(o);
  if (o.startsWith("http") || o.startsWith("urn")) {
    oo = this.doc.store.rdf.createNamedNode(o);
  } else {
    oo = this.doc.store.rdf.createLiteral(o, null, null);
  }
  return (this.doc.store.rdf.createTriple(ss, pp, oo));
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
      <div class="col-sm-10"><input name="predicate" class="form-control" /></div></div> \
      <div class="form-group"><label for="object" class="col-sm-2 control-label">Object</label> \
      <div class="col-sm-10"><input name="object" class="form-control" /></div></div> \
      <div class="form-group"><div class="col-sm-10 col-sm-offset-2"><a href="#" class="btn btn-default triple-action triple-action-new-cancel">Cancel</a> \
        <a href="#" class="btn btn-primary triple-action triple-action-new-save">Save</a></div></div> \
      </form></div></div>\n');

  container.find('a.triple-action-new-cancel').click(function(e) {
    container.empty();
  });

  container.find('a.triple-action-new-save').click(function(e) {
    // FIXME: use the same editors we use in the tables
    // FIXME: get the range of the property and convert the object accordingly
    var s = container.find('input[name="subject"]').val();
    var p = container.find('input[name="predicate"]').val();
    var o = container.find('input[name="object"]').val();
    var t = self.makeTriple(s, p, o);
    self.doc.addTriple(t, function() {
      container.empty();

      if (self.tripleTable) {
        var i = self.tripleTable.data('maxindex');
        i += 1;
        self.tripleTable.bootstrapTable('append', $.extend(t, {
          id: i
        }));
        self.tripleTable.data('maxindex', i);
      }
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
  var ontologiesList = function () {
    var items = [];
    var ontologies = manager.ontologiesAsArray();
    for (var i = 0, l = ontologies.length; i < l; i++) {
      items.push({"uri": ontologies[i].URI});
    }
    return items;
  };

  var classesList = function (e) {
    var ontoBox = e.currentTarget;
    var ontology;
    var classItems = function() {
      var items = [];
      if (ontology) {
        var clases = ontology.classesAsArray();
        for (var i = 0, l = clases.length; i < l; i++) {
          items.push({"uri": clases[i].URI});
        }
      }
      return items;
    }

    classesSelect.clearOptions();
    classesSelect.addOption([]);
    ontology = manager.ontologyByURI(ontoBox.selectedOntologyURI());
    if (ontology) {
      classesSelect.addOption(classItems());
    }
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

  $classesSelect = $('#class').selectize({
    create: true,
    valueField: 'uri',
    labelField: 'uri',
    options: []
  });
  classesSelect = $classesSelect[0].selectize;

  container.find('a.triple-action-new-cancel').click(function(e) {
    container.empty();
  });

  container.find('a.triple-action-new-save').click(function(e) {
    var o = $('#ontology')[0].selectize.getValue();
    var c = $('#class')[0].selectize.getValue();
    var s = container.find('input[name="subject"]').val();
    var t = self.makeTriple(s, self.ontologyManager.uriDenormalize('rdf:type'), c);
    self.doc.addTriple(t, function() {
      container.empty();

      if (self.entityView) {
        self.entityView.addEntity({"uri": s, "label": s});
      }
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
