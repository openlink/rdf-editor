/*
 *  This file is part of the OpenLink RDF Editor
 *
 *  Copyright (C) 2014-2019 OpenLink Software
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

  RDFE.ObjectView = (function() {
    // constructor
    var c = function(editor, params) {
      this.editor = editor;
      this.editFct = params.editFct;
    };

    c.prototype.render = function(container, callback) {
      var self = this;

      self.editor.doc.listObjects(function(objects) {
        var labelFormatter = function(value, row, index) {
          if (row.type === 'IRI') {
            var ontologyManager = self.editor.ontologyManager;
            var _class = 'class="rdfe-green-link"';
            if (ontologyManager.ontologyClassByURI(row.label))
              _class = '';

            return '<a href="{1}" target="_blank" {2}>{0}</a>'.format(RDFE.Utils.uri2name(row.label), row.label, _class);
          }
          return row.label;
        };

        var labelSorter = function(a, b) {
          if (a > b) return 1;
          if (a < b) return -1;
          return 0;
        };

        var typeFormatter = function(value, row, index) {
          if (row.type === 'IRI')
            return row.type;

          return '<a href="{1}" target="_blank">{0}</a>'.format(self.editor.ontologyManager.uriNormalize(row.type), row.type);
        };

        var objectListActionsFormatter = function(value, row, index) {
          return [
            '<a class="edit ml10" href="javascript:void(0)" title="Edit or add a new '+RDFE.Utils.namingSchemaLabel('s', self.editor.namingSchema(), false, true)+' and '+RDFE.Utils.namingSchemaLabel('p', self.editor.namingSchema(), false, true)+' pairs associated with this '+RDFE.Utils.namingSchemaLabel('o', self.editor.namingSchema(), false, true)+'">',
            '  <i class="glyphicon glyphicon-edit"></i>',
            '</a>',
            '<a class="remove ml10" href="javascript:void(0)" title="Remove all '+RDFE.Utils.namingSchemaLabel('spo', self.editor.namingSchema(), true, true)+' associated with this '+RDFE.Utils.namingSchemaLabel('o', self.editor.namingSchema(), false, true)+'">',
            '  <i class="glyphicon glyphicon-remove"></i>',
            '</a>'
          ].join('');
        };

        self.objects = objects;
        self.objectsTable = null;
        container.empty();

        var $list = $(document.createElement('table')).addClass('table');
        container.append($list);

        var pageNumber = 1;
        var pageSize = 10;
        var sortName = 'label';
        var sortOrder = 'asc';
        var pageSettings = self.editor.config.options["pageSettings"];
        if (pageSettings["pageNo"]) {
          pageNumber = pageSettings["pageNo"];
        }
        if (pageSettings["pageSize"]) {
          pageSize = pageSettings["pageSize"];
        }
        if (pageSettings["sortName"]) {
          sortName = pageSettings["sortName"];
        }
        if (pageSettings["sortOrder"]) {
          sortOrder = pageSettings["sortOrder"];
        }

        $list.bootstrapTable({
          "striped": true,
          "pagination": true,
          "paginationVAlign": 'top',
          "pageNumber": pageNumber,
          "pageSize": pageSize,
          "search": true,
          "sortName": sortName,
          "sortOrder": sortOrder,
          "searchAlign": 'left',
          "trimOnSearch": false,
          "showHeader": true,
          "data": objects,
          "idField": 'id',
          "columns": [{
            "field": 'label',
            "title": RDFE.Utils.namingSchemaLabel('o', self.editor.namingSchema()),
            "titleTooltip": RDFE.Utils.namingSchemaLabel('o', self.editor.namingSchema()),
            "sortable": true,
            "sorter": labelSorter,
            "formatter": labelFormatter
          }, {
            "field": 'type',
            "title": 'Type',
            "titleTooltip": 'Type',
            "sortable": true,
            "class": 'rdfe-small-column',
            "formatter": typeFormatter
          }, {
            "field": 'items',
            "title": 'Count',
            "titleTooltip": 'Count',
            "sortable": true,
            "sorter": self.editor.countSorter,
            "align": 'right',
            "class": 'rdfe-small-column',
            "formatter": self.editor.countFormatter
          }, {
            "field": 'actions',
            "title": '<button class="add btn btn-default btn-sm" title="Click to create a new '+RDFE.Utils.namingSchemaLabel('o', self.editor.namingSchema(), false, true)+'"><span class="glyphicon glyphicon-plus" aria-hidden="true"></span> New</button>',
            "align": 'center',
            "valign": 'middle',
            "class": 'rdfe-small-column',
            "clickToSelect": false,
            "formatter": objectListActionsFormatter,
            "events": {
              'click .edit': function(e, value, row, index) {
                self.editFct(row);
              },
              'click .remove': function(e, value, row, index) {
                self.editor.doc.deleteObject(row.object, function() {
                  $list.bootstrapTable('remove', {
                    field: 'id',
                    values: [row.id]
                  });
                  $(self.editor).trigger('rdf-editor-success', {
                    "type": 'object-delete-success',
                    "message": "Successfully deleted object."
                  });
                }, function(error) {
      -           $(self.editor).trigger('rdf-editor-error', {
                    "type": 'object-delete-error',
                    "message": error
                  });
                });
              }
            }
          }]
        });

        $list.on('page-change.bs.table', function(e, page, size) {
          $(self.editor).trigger('rdf-editor-page', {"pageNo": page, "pageSize": size});
        });

        $list.on('sort.bs.table', function(e, name, order) {
          $(self.editor).trigger('rdf-editor-page', {"sortName": name, "sortOrder": order});
        });

        $($list).find('.add').on('click', function(e) {
          self.editor.editObject();
        });
        self.objectsTable = $list;

        if (callback) {
          callback();
        }
      }, function(error) {
        $(self.editor).trigger('rdf-editor-error', {
          "type": 'object-list-error',
          "message": error
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

      self.editor.doc.getObject(object, function(object) {
        var ndx = self.objects.findIndex(function(item, index, items) {
          return (item.id === object.id);
        });
        self.objectsTable.bootstrapTable('updateRow', {
          "index": ndx,
          "row": object
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
