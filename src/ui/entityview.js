(function($) {
  if (!window.RDFE) {
    window.RDFE = {};
  }

  RDFE.EntityView = (function() {
    // constructor
    var c = function(doc, ontologyManager, editor, params) {
      this.doc = doc;
      this.namingSchema = doc.config.options[doc.config.options["namingSchema"]];
      this.ontologyManager = ontologyManager;
      this.editor = editor;
      this.editFct = params.editFct;
    };

    var labelFormatter = function(value, row, index) {
      var s = '<span title="' + row.uri + '">' + row.label + '</span>';
      if(row.types && row.types.length) {
        s += ' <small>(' + row.types + ')</small>';
      }
      return s;
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
        'types': ontoMan.typesToLabel(entity.types),
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
            title: RDFE.Utils.namingSchemaLabel('s', self.namingSchema) + ' Name',
            aligh: 'left',
            sortable: true,
            formatter: labelFormatter
          }, {
            field: 'actions',
            title: '<button class="add btn btn-default" title="Add a new entity to the document"><span class="glyphicon glyphicon-plus" aria-hidden="true"></span> New</button>',
            align: 'center',
            valign: 'middle',
            class: 'actions-column',
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
        $($list).find('.add').on('click', function(e) {
          self.editor.createNewEntityEditor();
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
