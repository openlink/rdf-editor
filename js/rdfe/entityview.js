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
          entityData.push({
            'label': el[i].label,
            'types': _.uniq(_.map(el[i].types, function(s) {
              // merge class name with class label for the searchable entity type
              var c = self.ontologyManager.ontologyClassByURI(s);
              if(c) {
                return c.label;
              }
              return s.split(/[/#]/).pop();
            })).join(', '),
            'uri': el[i].value,
            'id': i
          });
        }
        console.log('Entity list:', entityData);

        $list.data('maxindex', i);

        var editFct = function(uri) {
          // open the editor and once its done re-create the entity list
          if(!self.entityEditor) {
            self.entityEditor = new RDFE.EntityEditor(self.doc, self.ontologyManager);
            $(self.entityEditor).on('rdf-editor-error', function(e) {
              $(self).trigger('rdf-editor-error', d);
            }).on('rdf-editor-success', function(e, d) {
              $(self).trigger('rdf-editor-success', d);
            });
          }
          self.entityEditor.render(container, uri, function() {
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
      }, function(r) {
        $(self).trigger('rdf-editor-error', {
          "type": 'entity-list-failed',
          "message": r
        });
      });
    };

    c.prototype.addEntity = function(entity) {
      var i = this.entityTable.data('maxindex');
      entity.id = i;
      this.entityTable.bootstrapTable('append', entity);
      this.entityTable.data('maxindex', i+1);
    };

    return c;
  })();
})(jQuery);
