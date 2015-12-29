/*
 *  This file is part of the OpenLink RDF Editor
 *
 *  Copyright (C) 2014-2015 OpenLink Software
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

(function($) {
  if (!window.RDFE) {
    window.RDFE = {};
  }

  RDFE.TripleView = (function() {
    // constructor
    var c = function(doc, ontologyManager, editor) {
      this.doc = doc;
      this.namingSchema = doc.config.options[doc.config.options["namingSchema"]];
      this.ontologyManager = ontologyManager;
      this.editor = editor;
    };

    c.prototype.render = function(container, callback) {
      var self = this;
      var maxLength = self.doc.config.options["maxLabelLength"];

      var nodeFormatter = function(value) {
        if (value.interfaceName == "Literal") {
          if (value.datatype == 'http://www.w3.org/2001/XMLSchema#dateTime') {
            return (new Date(value.nominalValue)).toString();
          }
          return RDFE.Utils.strAbbreviate(value.nominalValue, maxLength);
        }
        return RDFE.Utils.uriAbbreviate(value.toString(), maxLength);
      };

      var tripleEditorDataSetter = function(triple, field, newValue) {
        var newNode = newValue;

        if (field === 'predicate') {
          newNode = self.doc.store.rdf.createNamedNode(newValue);
        }
        if (newValue.toStoreNode) {
          newNode = newValue.toStoreNode(self.doc.store);
        }
        else if (field != 'object' ||
          triple.object.interfaceName == 'NamedNode') {
          newNode = self.doc.store.rdf.createNamedNode(newValue);
        }
        else if (triple.object.datatype == 'http://www.w3.org/2001/XMLSchema#dateTime') {
          var d = new Date(newValue);
          newNode = self.doc.store.rdf.createLiteral(d.toISOString(), triple.object.language, triple.object.datatype);
        }
        else {
          newNode = self.doc.store.rdf.createLiteral(newValue, triple.object.language, triple.object.datatype);
        }

        var newTriple = self.doc.store.rdf.createTriple(triple.subject, triple.predicate, triple.object);
        newTriple[field] = newNode;
        self.doc.updateTriple(triple, newTriple, function(success) {
          // do nothing
        }, function(msg) {
          $(self).trigger('rdf-editor-error', { message: 'Failed to update triple in document: ' + msg });
        });
      };

      self.doc.listProperties(function (pl) {
        self.doc.store.graph(self.doc.graph, function(success, g) {
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
                title: RDFE.Utils.namingSchemaLabel('s', self.namingSchema),
                align: 'left',
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
                formatter: nodeFormatter
              }, {
                field: 'predicate',
                title: RDFE.Utils.namingSchemaLabel('p', self.namingSchema),
                align: 'left',
                sortable: true,
                editable: function(triple) {
                  return {
                    mode: "inline",
                    type: "propertyBox",
                    propertyBox: {
                      ontoManager: self.ontologyManager
                    },
                    value: triple.predicate.nominalValue
                  };
                },
                formatter: nodeFormatter
              }, {
                field: 'object',
                title: RDFE.Utils.namingSchemaLabel('o', self.namingSchema),
                align: 'left',
                sortable: true,
                editable: function(triple) {
                  return {
                    "mode": "inline",
                    "type": "rdfnode",
                    "rdfnode": {
                      "predicate": triple.predicate.toString(),
                      "document": self.doc,
                      "ontologyManager": self.ontologyManager
                    },
                    "value": triple.object
                  };
                },
                formatter: nodeFormatter
              }, {
                field: 'actions',
                title: '<button class="add btn btn-default" title="Add a new statement to the document"><span class="glyphicon glyphicon-plus" aria-hidden="true"></span> New</button>',
                align: 'center',
                valign: 'middle',
                class: 'small-column',
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
                    self.doc.deleteTriple(triple, function() {
                      $list.bootstrapTable('remove', {
                        field: 'id',
                        values: [row.id]
                      });
                    }, function() {
                      $(self).trigger('rdf-editor-error', { "type": 'triple-delete-failed', "message": 'Failed to delete ' + RDFE.Utils.namingSchemaLabel('spo', self.namingSchema, false, true) + '.' });
                    });
                  }
                }
              }]
            });
            $($list).find('.add').on('click', function(e) {
              self.editor.editTriple();
            });
            self.tripleTable = $list;

            if (callback) {
              callback();
            }
          } else {
            $(self).trigger('rdf-editor-error', 'Failed to query ' + RDFE.Utils.namingSchemaLabel('spo', self.namingSchema, true, true) + ' from document.');
          }
        });
      });
    };

    c.prototype.addTriple = function(t) {
      var i = this.tripleTable.data('maxindex');
      this.tripleTable.bootstrapTable('append', $.extend(t, { id: i}));
      this.tripleTable.data('maxindex', i+1);
    };

    return c;
  })();
})(jQuery);
