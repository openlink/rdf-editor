(function($) {
  if (!window.RDFE) {
    window.RDFE = {};
  }

  RDFE.TripleView = (function() {
    // constructor
    var c = function(doc, ontoMan) {
      this.doc = doc;
      this.ontologyManager = ontoMan;
    };

    var nodeFormatter = function(value) {
      if (value.interfaceName == "Literal") {
        if (value.datatype == 'http://www.w3.org/2001/XMLSchema#dateTime')
          return (new Date(value.nominalValue)).toString();
        else
          return value.nominalValue;
      } else {
        return value.toString();
      }
    };

    c.prototype.render = function(container, callback) {
      var self = this;

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
          newNode = self.doc.store.rdf.createNamedNode(RDFE.Editor.io_strip_URL_quoting(newValue));
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
        console.log('Found existing predicates: ', pl);
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
                formatter: nodeFormatter
              }, {
                field: 'predicate',
                title: 'Predicate',
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
                formatter: nodeFormatter
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
                    self.doc.deleteTriple(triple, function() {
                      $list.bootstrapTable('remove', {
                        field: 'id',
                        values: [row.id]
                      });
                    }, function() {
                      $(self).trigger('rdf-editor-error', { "type": 'triple-delete-failed', "message": 'Failed to delete triple.' });
                    });
                  }
                }
              }]
            });

            self.tripleTable = $list;

            if (callback)
              callback();
          } else {
            $(self).trigger('rdf-editor-error', 'Failed to query triples from doc.');
          }
        });
      });
    };

    c.prototype.addTriple = function(t) {
      var i = this.tripleTable.data('maxindex');
      i += 1;
      this.tripleTable.bootstrapTable('append', $.extend(t, {
        id: i
      }));
      this.tripleTable.data('maxindex', i);
    };

    return c;
  })();
})(jQuery);
