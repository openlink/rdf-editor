(function($) {
  if (!window.RDFE) {
    window.RDFE = {};
  }

  RDFE.PredicateView = (function() {
    // constructor
    var c = function(doc, ontologyManager, editor, params) {
      this.doc = doc;
      this.namingSchema = doc.config.options[doc.config.options["namingSchema"]];
      this.ontologyManager = ontologyManager;
      this.editor = editor;
      this.editFct = params.editFct;
    };

    var labelFormatter = function(value, row, index) {
      return '{0} (<small>{1}</small>)'.format(RDFE.Utils.uri2name(row.uri), row.uri);
    };

    var countFormatter = function(value, row, index) {
      return row.items.length;
    };

    var predicateListActionsFormatter = function(value, row, index) {
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

      self.doc.listPredicates(function(predicates) {
        self.predicates = predicates;
        self.predicateTable = null;
        container.empty();

        var $list = $(document.createElement('table')).addClass('table');
        container.append($list);

        // create entries
        var deleteFct = function(predicate) {
          self.doc.deletePredicate(predicate.uri, function() {
            $list.bootstrapTable('remove', {
              field: 'uri',
              values: [predicate.uri]
            });
            $(self).trigger('rdf-editor-success', {
              "type": 'predicate-delete-done',
              "uri": predicate.uri,
              "message": "Successfully deleted attribute " + uri + "."
            });
          }, function(msg) {
            $(self).trigger('rdf-editor-error', {
              "type": 'predicate-delete-failed',
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
          data: predicates,
          idField: 'uri',
          columns: [{
            field: 'label',
            title: RDFE.Utils.namingSchemaLabel('p', self.namingSchema) + ' Name',
            align: 'left',
            sortable: true,
            formatter: labelFormatter
          }, {
            field: 'count',
            title: 'Count',
            align: 'right',
            sortable: true,
            formatter: countFormatter
          }, {
            field: 'actions',
            title: '<button class="add btn btn-default" title="Add one or more entity and value pairs for this attribute to this document"><span class="glyphicon glyphicon-plus" aria-hidden="true"></span> New</button>',
            align: 'center',
            valign: 'middle',
            class: 'actions-column',
            clickToSelect: false,
            formatter: predicateListActionsFormatter,
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
          self.editor.editPredicate();
        });
        self.predicateTable = $list;

        if (callback) {
          callback();
        }
      }, function(r) {
        $(self).trigger('rdf-editor-error', {
          "type": 'predicate-list-failed',
          "message": r
        });
      });
    };

    c.prototype.addPredicate = function(predicate) {
      var self = this;

      if (!_.find(self.predicates, function(p){ return p.uri === predicate.uri; })) {
        this.predicateTable.bootstrapTable('append', predicate);
      }
    };

    /**
     * Fetch details about the given predicate from the document and update them in the table.
     */
    c.prototype.updatePredicate = function(uri) {
      var self = this;

      self.doc.getPredicate(uri, function(predicate) {
        self.predicateTable.bootstrapTable('update', {
          field: 'uri',
          data: predicate
        });
      });
    };

    return c;
  })();
})(jQuery);
