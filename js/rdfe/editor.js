if (typeof String.prototype.startsWith != 'function') {
    // see below for better implementation!
    String.prototype.startsWith = function (str){
        return this.indexOf(str) == 0;
    };
}

RDFE.Editor = function(params) {
  var self = this;

  // empty default doc
  this.doc = new RDFE.Document();
};

// draw_graph_contents() { }
// insert() { }
// delete() { }
// update() { delete(); insert() ; draw_graph_contents() }

// useful functions
RDFE.Editor.escapeHTML = function(str) {
    return (str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') );
};

// rdf_store bits
RDFE.Editor.io_strip_URL_quoting = function(str) {
    return(str.replace(RegExp('^<(.*)>$'), '$1'));
};

RDFE.Editor.io_strip_litstr_quoting = function(str) {
    return(str.replace(RegExp('^"(.*)"$'), '$1'));
};

/**
 * Parse a string into a node object.
 */
RDFE.Editor.prototype.parseNTNode = function(s) {
    if(s[0] == '<')
        return this.doc.store.rdf.createNamedNode(RDFE.Editor.io_strip_URL_quoting(s));
    else if(s.startsWith('_:'))
        return this.doc.store.rdf.createNamedNode(s); // FIXME: blank nodes are so much trouble. We need to find a way to handle them properly
    else {
        var l = this.doc.store.parseLiteral(s);
        return this.doc.store.rdf.createLiteral(l.value, l.lang, l.type);
    }
};

RDFE.Editor.prototype.makeTriple = function(s, p, o) {
    ss=this.doc.store.rdf.createNamedNode(RDFE.Editor.io_strip_URL_quoting(s));
    pp=this.doc.store.rdf.createNamedNode(RDFE.Editor.io_strip_URL_quoting(p));
    // let's be dumb about this for now
    o = RDFE.Editor.io_strip_URL_quoting (o);
    if(o.startsWith("http") || o.startsWith("urn")) {
        oo=this.doc.store.rdf.createNamedNode(o);
    }
    else {
        var l = this.doc.store.parseLiteral(o);
        oo = this.doc.store.rdf.createLiteral(l.value, l.lang, l.type);
    }
    return(this.doc.store.rdf.createTriple(ss, pp, oo));
};


RDFE.Editor.prototype.getOldTriple = function(el) {
    var s=unescape(el.attr("data-statement-s-old"));
    var p=unescape(el.attr("data-statement-p-old"));
    var o=unescape(el.attr("data-statement-o-old"));
    return this.doc.store.rdf.createTriple(this.parseNTNode(s), this.parseNTNode(p), this.parseNTNode(o));
};

RDFE.Editor.prototype.getNewTriple = function(el) {
    var s=el.find("td[data-title='Subject'] a").text();
    var p=el.find("td[data-title='Predicate'] a").text();
    var o=el.find("td[data-title='Object'] a").text();
    return(this.makeTriple(s,p,o));
};

RDFE.Editor.prototype.saveTripleToElem = function(tripleTr, triple) {
    tripleTr.attr ('data-statement-s-old', escape(triple.subject.toNT()));
    tripleTr.attr ('data-statement-p-old', escape(triple.predicate.toNT()));
    tripleTr.attr ('data-statement-o-old', escape(triple.object.toNT()));
    //tripleTr.attr ('data-statement-o-old', escape(triple.object.toString()));
};

RDFE.Editor.prototype.createTripleRow = function(t, container) {
    var s=t.subject;
    var p=t.predicate;
    var o=t.object;
    var oVal = RDFE.Editor.escapeHTML(o.toString());
    var oDataType = 'text';
    var datatype = '';
    var interfaceName = '';

    if (o.datatype == 'http://www.w3.org/2001/XMLSchema#dateTime') {
        oVal = (new Date(o.nominalValue)).toISOString();
        oDataType = 'datetime';
    }
    else {
        oVal = RDFE.Editor.escapeHTML(o.nominalValue);
    }
    if (o.datatype)
        datatype = ' dtype="'+ o.datatype +'" ';

    if (o.interfaceName)
        interfaceName = ' interfaceName="'+ o.interfaceName +'" ';

    container.append(' \
        <tr class="triple" \
        data-statement-s-old="' + escape(s.toNT()) + '" \
        data-statement-p-old="' + escape(p.toNT()) + '" \
        data-statement-o-old="' + escape(o.toNT()) + '"> \
        <td data-title="Subject"><a href="#" data-type="text" class="triple editable editable-click s">' + RDFE.Editor.escapeHTML(s.toString()) + '</a></td> \
        <td data-title="Predicate"><a href="#" name="predicate" data-type="typeaheadjs" data-placement="right" class="triple editable editable-click p">' + RDFE.Editor.escapeHTML(p.toString())+ '</a></td> \
        <td data-title="Object"><a href="#" data-type="'+ oDataType +'"'+ datatype + interfaceName + ' class="triple editable editable-click '+ oDataType +' o">' + oVal + '</a></td> \
        <td><a href="#" class="btn btn-danger btn-xs triple-action triple-action-delete">Delete</a></td> \
        </tr>\n');

    return container.find('tr.triple').last();
};

RDFE.Editor.prototype.createTripleActions = function(tripleRow, graphUri) {
    var self = this;

    var editable_opts = { mode: "inline" };
    var existingPredicates = [];
    $(".triple .p").each( function() { existingPredicates.push($(this).text().toString()) } );

    var editable_dt_opts = {
        format: 'yyyy-mm-ddThh:ii:ssZ',
        viewformat: 'yyyy-mm-ddThh:ii:ssZ',
        datetimepicker: {
            weekStart: 1
        }
    };

    tripleRow.find('.p.editable').editable({
      name: 'predicate',
      typeahead: {
          name: 'predicate',
          local: [
            "http://www.w3.org/2002/07/owl#",
            "http://www.w3.org/2000/01/rdf-schema#",
            "http://xmlns.com/foaf/0.1/",
            "http://rdfs.org/sioc/ns#",
            "http://purl.org/dc/elements/1.1/",
          ].concat(existingPredicates) }
      });

    tripleRow.find('.editable:not(.datetime)').editable(editable_opts);
    tripleRow.find('.editable.datetime').editable(editable_dt_opts);
    tripleRow.find('.editable').on('save', function(e, params) {
        var $this = $(this);
        var $tripleTr = $this.closest('tr');

        var newOVal = params.newValue;
        if ($this.attr('data-type') == 'datetime') {
            var d = new Date(params.newValue);
            newOVal = d.toISOString();
        }
        if ($this.attr('interfaceName') == 'Literal') {
            newOVal = '"'+ newOVal + '"';
            if ($this.attr('dtype'))
                newOVal = newOVal + '^^<' + $this.attr('dtype') + '>';
        }

        var updated_field = $this.hasClass("o") ? 'o' : $this.hasClass("s") ? 's' : $this.hasClass("p") ? 'p' : '';
        var s = updated_field == 's' ? params.newValue : $tripleTr.find('a.s').text();
        var p = updated_field == 'p' ? params.newValue : $tripleTr.find('a.p').text();
        var o = updated_field == 'o' ? newOVal : $tripleTr.find('a.o').text();

        self.doc.store.delete(self.doc.store.rdf.createGraph([self.getOldTriple($tripleTr)]), graphUri, function(success) {
            if(success) {
                console.log("Successfully deleted old triple")
                var newTriple = self.makeTriple(s, p, o);
                self.doc.store.insert(self.doc.store.rdf.createGraph([newTriple]), graphUri, function(success){
                    if(success) {
                        // we simply update the old triple values in the tr tag
                        console.log( "TRIPLE:\n"+newTriple );
                        self.saveTripleToElem($tripleTr, newTriple);
                    }
                    else {
                        console.log('Failed to add new triple to store.');
                        // FIXME: Error handling!!!
                    }
                });
            }
            else {
              console.log('Failed to add delete old triple from store.');
                // FIXME: Error handling!!!
            }
        });
    });

    tripleRow.find('.triple-action-delete').on("click", function(e) {
        var $this = $(this);
        var $tripleTr = $this.closest('tr');
        self.doc.store.delete(self.doc.store.rdf.createGraph([self.getOldTriple($tripleTr)]), graphUri, function(success){
            if(success) {
                $tripleTr.remove();
            }
            else {
                // FIXME: Error handling!!!
            }
        });
    });
};

RDFE.Editor.prototype.nodeFormatter = function(value) {
    console.log('Formatting: ', value, value.toNT(), value.toString());
    if(value.interfaceName == "Literal")
        return value.nominalValue;
    else
        return value.toString();
};

RDFE.Editor.prototype.createEditorUi = function(doc, container) {
    var self = this;
    this.doc = doc;

    var tripleEditorDataSetter = function(triple, field, newValue) {
        var newNode = newValue;

        if (field != 'object' ||
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
            if(success) {
                console.log("Successfully deleted old triple")
                // update data in the bootstrap-table array
                triple[field] = newNode;

                self.doc.store.insert(self.doc.store.rdf.createGraph([triple]), self.doc.graph, function(success){
                    if(!success) {
                        console.log('Failed to add new triple to store.');
                        // FIXME: Error handling!!!
                    }
                });
            }
            else {
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
                $list.bootstrapTable({
                  striped:true,
                  sortName:'s',
                  pagination:true,
                  search:true,
                  searchAlign: 'left',
                  showHeader: true,
                  editable: true,
                  data: g.toArray(),
                  dataSetter: tripleEditorDataSetter,
                  columns: [{
                    field: 'subject',
                    title: 'Subject',
                    aligh: 'left',
                    sortable: true,
                    editable: {
                      mode: "inline"
                    },
                    formatter: RDFE.Editor.prototype.nodeFormatter
                  }, {
                    field: 'predicate',
                    title: 'Predicate',
                    aligh: 'left',
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
                    aligh: 'left',
                    sortable: true,
                    editable: {
                      mode: "inline"
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
                            self.doc.store.delete(self.doc.store.rdf.createGraph([value]), graphUri, function(success) {
                                if(!success) {
                                    $(self).trigger('rdf-editor-error', { "type": 'triple-delete-failed', "message": 'Failed to delete triple.' });
                                }
                            });
                        }
                    }
                  }]
                });
            }
            else {
                // FIXME: error handling.
              console.log('Failed to query triples in doc.');
            }
        });
    });
};

RDFE.Editor.prototype.createNewStatementEditor = function(container) {
  var self = this;

  if(!this.doc)
    return false;

  container.prepend(' \
      <tr class="triple triple-new"> \
      <td data-title="Subject"><a href="#" data-type="text" class="triple editable editable-click s">' + '' + '</a></td> \
      <td data-title="Predicate"><a href="#" data-type="text" class="triple editable editable-click p">' + '' + '</a></td> \
      <td data-title="Object"><a href="#" data-type="text" class="triple editable editable-click o">' + '' + '</a></td> \
      <td><a href="#" class="btn btn-primary btn-xs triple-action triple-action-new-cancel">Cancel<br></a> \
        <a href="#" class="btn btn-default btn-xs triple-action triple-action-new-save">Save<br></a></td> \
      </tr>\n');
  var $newTripleTr = container.find('tr.triple-new');

  $newTripleTr.find('.editable').editable({ mode: "inline" });

  $newTripleTr.find('a.triple-action-new-cancel').click(function(e) {
      $newTripleTr.remove();
  });

  $newTripleTr.find('a.triple-action-new-save').click(function(e) {
      var t = self.getNewTriple($newTripleTr);
      self.doc.store.insert(self.doc.store.rdf.createGraph([t]), self.doc.graph, function(success){
          if(success) {
              $newTripleTr.remove();
              self.createTripleActions(self.createTripleRow(t, container), self.doc.graph);
          }
          else {
              console.log('Failed to add new triple to store.');
              // FIXME: Error handling!!!
          }
      });
  });
};

RDFE.Editor.prototype.entityListActionsFormatter = function(value, row, index) {
    return [
        '<a class="edit ml10" href="javascript:void(0)" title="Edit">',
            '<i class="glyphicon glyphicon-edit"></i>',
        '</a>',
        '<a class="remove ml10" href="javascript:void(0)" title="Remove">',
            '<i class="glyphicon glyphicon-remove"></i>',
        '</a>'
    ].join('');
};

RDFE.Editor.prototype.createEntityList = function(doc, container) {
    var self = this;
    this.doc = doc;

    doc.store.execute("select distinct ?s ?sl ?spl where { graph <" + self.doc.graph + "> { ?s ?p ?o . } . optional { graph <" + self.doc.graph + "> { ?s rdfs:label ?sl } } . optional { graph <" + self.doc.graph + "> { ?s skos:prefLabel ?spl } } } order by ?s ?t", function(success, r) {
        if(success) {
            container.empty();

            var $list = $(document.createElement('table')).addClass('table');
            container.append($list);

            // create entries
            var entityData = [];
            for(var i = 0; i < r.length; i++) {
                var uri = r[i].s.value;
                var label = uri;
                if(r[i].spl)
                    label = r[i].spl.value;
                else if(r[i].sl)
                    label = r[i].sl.value;
                else
                    label = label.split(/[/#]/).pop();
                entityData.push({
                  'label': label,
                  'uri': uri
                });
            }

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
                $(self).trigger('rdf-editor-success', { "type": 'entity-delete-done', "uri": uri, "message": "Successfully deleted entity " + uri + "." });
              }, function(msg) {
                $(self).trigger('rdf-editor-error', { "type": 'entity-delete-failed', "message": msg });
              });
            };

            $list.bootstrapTable({
              striped:true,
              sortName:'label',
              pagination:true,
              search:true,
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
                    'click .edit': function (e, value, row, index) {
                        editFct(row.uri);
                    },
                    'click .remove': function (e, value, row, index) {
                        deleteFct(row.uri);
                    }
                }
              }]
            });
        }
        else {
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
        $(self).trigger('rdf-editor-error', { "type": 'editor-form-save-failed', "message": msg });
      });
    });

    // add the buttons to the container
    container.find('h4').append(saveBtn).append(cancelBtn);
  }, function(msg) {
    $(self).trigger('rdf-editor-error', { "type": 'editor-form-creation-failed', "message": msg });
  });
};
