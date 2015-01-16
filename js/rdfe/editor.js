if (typeof String.prototype.startsWith != 'function') {
  // see below for better implementation!
  String.prototype.startsWith = function(str) {
    return this.indexOf(str) == 0;
  };
}

RDFE.Editor = function(params) {
  var self = this;

  // empty default doc
  this.doc = new RDFE.Document();
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

RDFE.Editor.prototype.nodeFormatter = function(value) {
  if (value.interfaceName == "Literal") {
    if (value.datatype == 'http://www.w3.org/2001/XMLSchema#dateTime')
      return (new Date(value.nominalValue)).toString();
    else
      return value.nominalValue;
  } else {
    return value.toString();
  }
};

RDFE.Editor.prototype.createEditorUi = function(doc, container, callback) {
  var self = this;
  this.doc = doc;

  var tripleEditorDataSetter = function(triple, field, newValue) {
    var newNode = newValue;

    if (newValue.toStoreNode) {
      newNode = newValue.toStoreNode(self.doc.store);
    }
    else if (field != 'object' ||
      triple.object.interfaceName == 'NamedNode') {
      newNode = self.doc.store.rdf.createNamedNode(RDFE.Editor.io_strip_URL_quoting(newValue));
    }
    else if (triple.object.datatype == 'http://www.w3.org/2001/XMLSchema#dateTime') {
      var d = new Date(newValue);
      newNode = self.doc.store.rdf.createLiteral(d.toISOString(), triple.object.language, triple.object.datatype);
    }
    else {
      newNode = self.doc.store.rdf.createLiteral(newValue, triple.object.language, triple.object.datatype);
    }

    self.doc.store.delete(self.doc.store.rdf.createGraph([triple]), self.doc.graph, function(success) {
      if (success) {
        console.log("Successfully deleted old triple")

        self.doc.dirty = true;

          // update data in the bootstrap-table array
        triple[field] = newNode;

        self.doc.store.insert(self.doc.store.rdf.createGraph([triple]), self.doc.graph, function(success) {
          if (!success) {
            console.log('Failed to add new triple to store.');
            // FIXME: Error handling!!!
          }
        });
      } else {
        console.log('Failed to add delete old triple from store.');
        // FIXME: Error handling!!!
      }
    });
  };

  doc.listProperties(function (pl) {
    console.log('Found existing predicates: ', pl);
    doc.store.graph(doc.graph, function(success, g) {
      if(success) {
        container.empty();
        var $list = $(document.createElement('table')).addClass('table');
        container.append($list);

        // add index to triples for identification
        var triples = g.toArray();
        for(var i = 0; i < triples.length; i+=1)
          triples[i].id = i;
        // remember last index for triple adding
        $list.data('maxindex', i);

        $list.bootstrapTable({
          striped:true,
          sortName:'s',
          pagination:true,
          search:true,
          searchAlign: 'left',
          showHeader: true,
          editable: true,
          data: triples,
          dataSetter: tripleEditorDataSetter,
          columns: [{
            field: 'subject',
            title: 'Subject',
            aligh: 'left',
            sortable: true,
            editable: function(triple) {
              return {
                mode: "inline",
                type: "rdfnode",
                rdfnode: {
                  type: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#Resource'
                },
                value: triple.subject
              }
            },
            formatter: RDFE.Editor.prototype.nodeFormatter
          }, {
            field: 'predicate',
            title: 'Predicate',
            align: 'left',
            sortable: true,
            editable: {
              mode: "inline",
              name: 'predicate',
              type: "typeaheadjs",
              placement: "right",
              typeahead: {
                name: 'predicate',
                local: [
                  "http://www.w3.org/2002/07/owl#",
                  "http://www.w3.org/2000/01/rdf-schema#",
                  "http://xmlns.com/foaf/0.1/",
                  "http://rdfs.org/sioc/ns#",
                  "http://purl.org/dc/elements/1.1/",
                ].concat(pl)
              }
            },
            formatter: RDFE.Editor.prototype.nodeFormatter
          }, {
            field: 'object',
            title: 'Object',
            align: 'left',
            sortable: true,
            editable: function(triple) {
              return {
                mode: "inline",
                type: "rdfnode",
                value: triple.object
              };
            },
            formatter: RDFE.Editor.prototype.nodeFormatter
          }, {
            field: 'actions',
            title: 'Actions',
            align: 'center',
            valign: 'middle',
            clickToSelect: false,
            editable: false,
            formatter: function(value, row, index) {
              return [
                '<a class="remove ml10" href="javascript:void(0)" title="Remove">',
                '<i class="glyphicon glyphicon-remove"></i>',
                '</a>'
              ].join('');
            },
            events: {
              'click .remove': function (e, value, row, index) {
                var triple = row;
                self.doc.store.delete(self.doc.store.rdf.createGraph([triple]), self.doc.graph, function(success) {
                  if(success) {
                    $list.bootstrapTable('remove', {
                      field: 'id',
                      values: [row.id]
                    });

                    self.doc.dirty = true;
                  }
                  else {
                    $(self).trigger('rdf-editor-error', { "type": 'triple-delete-failed', "message": 'Failed to delete triple.' });
                  }
                });
              }
            }
          }]
        });

        self.tripleTable = $list;

        if (callback)
          callback();
      } else {
        // FIXME: error handling.
        console.log('Failed to query triples in doc.');
      }
    });
  });
};

RDFE.Editor.prototype.createNewStatementEditor = function(container) {
  var self = this;

  if (!this.doc)
    return false;

  container.html(' \
      <div class="form-horizontal"> \
      <div class="form-group"><label for="subject" class="col-sm-2 control-label">Subject</label> \
      <div class="col-sm-10"><input name="subject" class="form-control" /></div></div> \
      <div class="form-group"><label for="predicate" class="col-sm-2 control-label">Predicate</label> \
      <div class="col-sm-10"><input name="predicate" class="form-control" /></div></div> \
      <div class="form-group"><label for="object" class="col-sm-2 control-label">Object</label> \
      <div class="col-sm-10"><input name="object" class="form-control" /></div></div> \
      <div class="form-group"><div class="col-sm-10 col-sm-offset-2"><a href="#" class="btn btn-default triple-action triple-action-new-cancel">Cancel</a> \
        <a href="#" class="btn btn-primary triple-action triple-action-new-save">Save</a></div></div> \
      </form>\n');

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
    self.doc.store.insert(self.doc.store.rdf.createGraph([t]), self.doc.graph, function(success) {
      if (success) {
        self.doc.dirty = true;

        container.empty();

        if (self.tripleTable) {
          var i = self.tripleTable.data('maxindex');
          i += 1;
          self.tripleTable.bootstrapTable('append', $.extend(t, {
            id: i
          }));
          self.tripleTable.data('maxindex', i);
        }
      } else {
        console.log('Failed to add new triple to store.');
        // FIXME: Error handling!!!
      }
    });
  });
};

RDFE.Editor.prototype.createNewEntityEditor = function(container, manager) {
  var self = this;
  var $classesSelect, classesSelect;
  var ontologiesList = function () {
    var items = [];
    for (var i = 0, l = manager.ontologies.length; i < l; i++) {
      items.push({"uri": manager.ontologies[i].URI});
    }
    return items;
  };

  var classesList = function (ontology) {
    var items = [];

    classesSelect.clearOptions();
    if (ontology) {
      for (var i = 0, l = ontology.classes.length; i < l; i++) {
        items.push({"uri": ontology.classes[i].URI});
      }
    }
    classesSelect.addOption(items);
  };

  if (!this.doc) {
    return false;
  }

  container.html(
    '<div class="form-horizontal"> ' +
    '  <div class="form-group"> ' +
    '    <label for="ontology" class="col-sm-2 control-label">Ontology</label> ' +
    '    <div class="col-sm-10"> ' +
    '      <select name="ontology" id="ontology" class="form-control" /> ' +
    '    </div> ' +
    '  </div> ' +
    '  <div class="form-group"> ' +
    '    <label for="class" class="col-sm-2 control-label">Class</label> ' +
    '    <div class="col-sm-10"> ' +
    '      <select name="class" id="class" class="form-control" /> ' +
    '    </div> ' +
    '  </div> ' +
    '  <div class="form-group"> ' +
    '     <label for="subject" class="col-sm-2 control-label">Subject</label> ' +
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
    '</div>\n');

  $('#ontology').selectize({
    create: true,
    valueField: 'uri',
    labelField: 'uri',
    options: ontologiesList(),
    onChange: function(value) {
      if (!value.length) {
        classesList();
      } else {
        manager.ontologyParse(value, {
          "success": function (ontology) {
            classesList(ontology);
          }
        });
      }
    }
  });

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
    var t = self.makeTriple(s, RDFE.uriDenormalize('rdf:type'), c);
    self.doc.store.insert(self.doc.store.rdf.createGraph([t]), self.doc.graph, function(success) {
      if (success) {
        self.doc.dirty = true;

        container.empty();

        if (self.entityTable) {
          var i = self.entityTable.data('maxindex');
          self.entityTable.bootstrapTable('append', {"uri": s, "label": s, "id": i});
          self.entityTable.data('maxindex', i+1);
        }
      } else {
        console.log('Failed to add new triple to store.');
        // FIXME: Error handling!!!
      }
    });
  });
};

RDFE.Editor.prototype.entityListActionsFormatter = function(value, row, index) {
  return [
    '<a class="edit ml10" href="javascript:void(0)" title="Edit">',
    '  <i class="glyphicon glyphicon-edit"></i>',
    '</a>',
    '<a class="remove ml10" href="javascript:void(0)" title="Remove">',
    '  <i class="glyphicon glyphicon-remove"></i>',
    '</a>'
  ].join('');
};

RDFE.Editor.prototype.createEntityList = function(doc, container, callback) {
  var self = this;
  this.doc = doc;

  doc.store.execute("select distinct ?s ?sl ?spl where { graph <" + self.doc.graph + "> { ?s ?p ?o . } . optional { graph <" + self.doc.graph + "> { ?s rdfs:label ?sl } } . optional { graph <" + self.doc.graph + "> { ?s skos:prefLabel ?spl } } } order by ?s ?t", function(success, r) {
    if (success) {
      self.entityTable = null;
      container.empty();

      var $list = $(document.createElement('table')).addClass('table');
      container.append($list);

      // create entries
      var entityData = [];
      for (var i = 0; i < r.length; i++) {
        var uri = r[i].s.value;
        var label = uri;
        if (r[i].spl)
          label = r[i].spl.value;
        else if (r[i].sl)
          label = r[i].sl.value;
        else
          label = label.split(/[/#]/).pop();
        entityData.push({
          'label': label,
          'uri': uri,
          'id': i
        });
      }
      $list.data('maxindex', i);

      var editFct = function(uri) {
        // open the editor and once its done re-create the entity list
        self.showEditor(container, uri, function() {
          self.createEntityList(doc, container);
        });
      };
      var deleteFct = function(uri) {
        self.doc.deleteEntity(uri, function() {
          $list.bootstrapTable('remove', {
            field: 'uri',
            values: [uri]
          });
          $(self).trigger('rdf-editor-success', {
            "type": 'entity-delete-done',
            "uri": uri,
            "message": "Successfully deleted entity " + uri + "."
          });
        }, function(msg) {
          $(self).trigger('rdf-editor-error', {
            "type": 'entity-delete-failed',
            "message": msg
          });
        });
      };

      $list.bootstrapTable({
        striped: true,
        sortName: 'label',
        pagination: true,
        search: true,
        searchAlign: 'left',
        showHeader: true,
        data: entityData,
        idField: 'uri',
        columns: [{
          field: 'label',
          title: 'Entity Name',
          aligh: 'left',
          sortable: true
        }, {
          field: 'actions',
          title: 'Actions',
          align: 'center',
          valign: 'middle',
          clickToSelect: false,
          formatter: RDFE.Editor.prototype.entityListActionsFormatter,
          events: {
            'click .edit': function(e, value, row, index) {
              editFct(row.uri);
            },
            'click .remove': function(e, value, row, index) {
              deleteFct(row.uri);
            }
          }
        }]
      });
      self.entityTable = $list;

      if (callback)
        callback();
    } else {
      // FIXME: error handling.
      console.log('Failed to query entities in doc.');
    }
  });
};

RDFE.Editor.prototype.createEntityListActions = function(container) {
  // TODO: maybe we could embed the action buttons into the panel header like done in http://stackoverflow.com/a/23831762/3596238
  // TODO: create filter dropdown which allows to select the type of resource to filter by
  // TODO: create search field to search the list of entities
};

RDFE.Editor.prototype.showEditor = function(container, url, closeCb) {
  var self = this;
  var model = new RDFE.Document.Model();
  model.setEntity(this.doc, url);
  model.docToModel(function() {
    var form = new Backbone.Form({
      "model": model
    });
    form.render();

    container.empty();

    // add a header to the form using the entity's label
    container.append('<h4>Editing <span class="entity-label">' + url.split(/[/#]/).pop() + '<span></h4><hr/>');
    self.doc.getEntityLabel(url, function(label) {
      container.find('h4 span').text(label);
    });

    // add the newly created form to the container
    container.append(form.el);

    // create buttons for the form
    var cancelBtn = $(document.createElement('button'));
    var saveBtn = $(document.createElement('button'));
    cancelBtn.addClass('btn').addClass('btn-default').addClass('pull-right').text('Cancel');
    saveBtn.addClass('btn').addClass('btn-primary').addClass('pull-right').text('OK');
    cancelBtn.click(function() {
      closeCb();
    });
    saveBtn.click(function() {
      form.commit();
      model.modelToDoc(function() {
        closeCb();
      }, function(msg) {
        $(self).trigger('rdf-editor-error', {
          "type": 'editor-form-save-failed',
          "message": msg
        });
      });
    });

    // add the buttons to the container
    container.find('h4').append(saveBtn).append(cancelBtn);
  }, function(msg) {
    $(self).trigger('rdf-editor-error', {
      "type": 'editor-form-creation-failed',
      "message": msg
    });
  });
};
