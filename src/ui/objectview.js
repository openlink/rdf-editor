(function($) {
  if (!window.RDFE) {
    window.RDFE = {};
  }

  RDFE.ObjectView = (function() {
    // constructor
    var c = function(doc, ontologyManager, editor, params) {
      this.doc = doc;
      this.namingSchema = doc.config.options[doc.config.options["namingSchema"]];
      this.ontologyManager = ontologyManager;
      this.editor = editor;
      this.editFct = params.editFct;
    };

    var labelFormatter = function(value, row, index) {
      return row.label;
    };

    var typeFormatter = function(value, row, index) {
      return row.type;
    };

    var countFormatter = function(value, row, index) {
      return row.items.length;
    };

    c.prototype.render = function(container, callback) {
      var self = this;

      self.doc.listObjects(function(objects) {
        var objectListActionsFormatter = function(value, row, index) {
          return [
            '<a class="edit ml10" href="javascript:void(0)" title="Edit or add a new '+RDFE.Utils.namingSchemaLabel('s', self.namingSchema, false, true)+' and '+RDFE.Utils.namingSchemaLabel('p', self.namingSchema, false, true)+' pairs associated with this '+RDFE.Utils.namingSchemaLabel('o', self.namingSchema, false, true)+'">',
            '  <i class="glyphicon glyphicon-edit"></i>',
            '</a>',
            '<a class="remove ml10" href="javascript:void(0)" title="Remove all '+RDFE.Utils.namingSchemaLabel('spo', self.namingSchema, true, true)+' associated with this '+RDFE.Utils.namingSchemaLabel('o', self.namingSchema, false, true)+'">',
            '  <i class="glyphicon glyphicon-remove"></i>',
            '</a>'
          ].join('');
        };

        self.objects = objects;
        self.objectsTable = null;
        container.empty();

        var $list = $(document.createElement('table')).addClass('table');
        container.append($list);

        // create entries
        var deleteFct = function(row) {
          self.doc.deleteObject(row.object, function() {
            $list.bootstrapTable('remove', {
              field: 'id',
              values: [row.id]
            });
            $(self).trigger('rdf-editor-success', {
              "type": 'object-delete-done',
              "uri": row.id,
              "message": "Successfully deleted attribute " + row.id + "."
            });
          }, function(msg) {
            $(self).trigger('rdf-editor-error', {
              "type": 'object-delete-failed',
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
          data: objects,
          idField: 'id',
          columns: [{
            field: 'label',
            title: RDFE.Utils.namingSchemaLabel('o', self.namingSchema),
            sortable: true,
            formatter: labelFormatter
          }, {
            field: 'type',
            title: 'Type',
            sortable: true,
            formatter: typeFormatter
          }, {
            field: 'count',
            title: 'Count',
            align: 'right',
            class: 'small-column',
            formatter: countFormatter
          }, {
            field: 'actions',
            title: '<button class="add btn btn-default" title="Click to create a new '+RDFE.Utils.namingSchemaLabel('o', self.namingSchema, false, true)+'"><span class="glyphicon glyphicon-plus" aria-hidden="true"></span> New</button>',
            align: 'center',
            valign: 'middle',
            class: 'small-column',
            clickToSelect: false,
            formatter: objectListActionsFormatter,
            events: {
              'click .edit': function(e, value, row, index) {
                self.editFct(row);
              },
              'click .remove': function(e, value, row, index) {
                deleteFct(row);
              }
            }
          }]
        });
        $($list).find('.add').on('click', function(e) {
          self.editor.editObject();
        });
        self.objectsTable = $list;

        if (callback) {
          callback();
        }
      }, function(r) {
        $(self).trigger('rdf-editor-error', {
          "type": 'object-list-failed',
          "message": r
        });
      });
    };

    /**
     * Add given object to the view.
     */
    c.prototype.addObject = function(object) {
      var self = this;

      if (!_.find(self.objects, function(o){ return o.id === object.id; })) {
        self.objectsTable.bootstrapTable('append', object);
        self.objects.push(object);
      }
    };

    /**
     * Fetch details about the given object from the document and update them in the table.
     */
    c.prototype.updateObject = function(object) {
      var self = this;

      self.doc.getObject(object, function(object) {
        self.objectsTable.bootstrapTable('update', {
          field: 'id',
          data: object
        });
      });
    };

    /**
     * Remove given object from the view.
     */
    c.prototype.removeObject = function(object) {
      var self = this;

      if (!object || object.items.length !== 0) {
        return;
      }
      self.objectsTable.bootstrapTable('remove', {
        field: 'id',
        values: [object.id]
      });
    };

    return c;
  })();
})(jQuery);
