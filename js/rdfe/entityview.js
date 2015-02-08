(function($) {
  if (!window.RDFE) {
    window.RDFE = {};
  }

  RDFE.EntityView = (function() {
    // constructor
    var c = function(doc, ontoMan, params) {
      this.doc = doc;
      this.ontologyManager = ontoMan;
      this.editFct = params.editFct;
    };

    var labelFormatter = function(value, row, index) {
      if(row.types && row.types.length) {
        return row.label + ' <small>(' + row.types + ')</small>';
      }
      else {
        return row.label;
      }
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

    /**
     * Convert an entity object as returns by Document.listEntities or
     * Document.getEntity into a row for the entity table.
     */
    var docEntityToRow = function(entity, ontoMan) {
      return {
        'label': entity.label,
        'types': _.uniq(_.map(entity.types, function(s) {
          // merge class name with class labentity for the searchable entity type
          var c = ontoMan.ontologyClassByURI(s);
          if(c) {
            return c.label;
          }
          return RDFE.Utils.uri2name(s);
        })).join(', '),
        'uri': entity.uri || entity.value
      };
    };

    c.prototype.render = function(container, callback) {
      var self = this;

      self.doc.listEntities(function(el) {
        self.entityTable = null;
        container.empty();

        var $list = $(document.createElement('table')).addClass('table');
        container.append($list);

        // create entries
        var entityData = [];
        for (var i = 0; i < el.length; i++) {
          entityData.push(docEntityToRow(el[i], self.ontologyManager));
        }

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
          trimOnSearch: false,
          showHeader: true,
          data: entityData,
          idField: 'uri',
          columns: [{
            field: 'label',
            title: 'Entity Name',
            aligh: 'left',
            sortable: true,
            formatter: labelFormatter
          }, {
            field: 'actions',
            title: 'Actions',
            align: 'center',
            valign: 'middle',
            clickToSelect: false,
            formatter: entityListActionsFormatter,
            events: {
              'click .edit': function(e, value, row, index) {
                self.editFct(row.uri);
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
      }, function(r) {
        $(self).trigger('rdf-editor-error', {
          "type": 'entity-list-failed',
          "message": r
        });
      });
    };

    c.prototype.addEntity = function(entity) {
      this.entityTable.bootstrapTable('append', entity);
    };

    /**
     * Fetch details about the given entity from the document and update them in the table.
     */
    c.prototype.updateEntity = function(uri) {
      var self = this;
      self.doc.getEntity(uri, function(e) {
        self.entityTable.bootstrapTable('update', {
          field: 'uri',
          data: docEntityToRow(e, self.ontologyManager)
        });
      });
    };

    return c;
  })();
})(jQuery);
