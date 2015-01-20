(function($) {
  if (!window.RDFE) {
    window.RDFE = {};
  }

  RDFE.EntityView = (function() {
    // constructor
    var c = function(doc, ontoMan) {
      this.doc = doc;
      this.ontologyManager = ontoMan;
    };

    var entityListActionsFormatter = function(value, row, index) {
      return [
        '<a class="edit ml10" href="javascript:void(0)" title="Edit">',
        '  <i class="glyphicon glyphicon-edit"></i>',
        '</a>',
        '<a class="remove ml10" href="javascript:void(0)" title="Remove">',
        '  <i class="glyphicon glyphicon-remove"></i>',
        '</a>'
      ].join('');
    };

    c.prototype.render = function(container, callback) {
      var self = this;

      self.doc.store.execute("select distinct ?s ?sl ?spl where { graph <" + self.doc.graph + "> { ?s ?p ?o . } . optional { graph <" + self.doc.graph + "> { ?s rdfs:label ?sl } } . optional { graph <" + self.doc.graph + "> { ?s skos:prefLabel ?spl } } } order by ?s ?t", function(success, r) {
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
            var e = new RDFE.EntityEditor(self.doc, self.ontologyManager);
            e.render(container, uri, function() {
              self.render(container);
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
              formatter: entityListActionsFormatter,
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
          $(self).trigger('rdf-editor-error', {
            "type": 'entity-list-failed',
            "message": r
          });
        }
      });
    };

    return c;
  })();
})(jQuery);
