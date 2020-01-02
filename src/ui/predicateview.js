/*
 *  This file is part of the OpenLink RDF Editor
 *
 *  Copyright (C) 2014-2020 OpenLink Software
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

  RDFE.PredicateView = (function() {
    // constructor
    var c = function(editor, params) {
      this.editor = editor;
      this.editFct = params.editFct;
    };

    var labelFormatter = function(value, row, index) {
      return '<a href="{0}" target="_blank">{0}</a>'.format(row.uri);
    };

    var labelSorter = function(a, b) {
      function format(v) {
        return '<a href="{0}">{0}</a>'.format(v);
      }
      a = format(a);
      b = format(b);
      if (a > b) return 1;
      if (a < b) return -1;
      return 0;
    };

    c.prototype.render = function(container, callback) {
      var self = this;

      self.editor.doc.listPredicates(function(predicates) {
        var predicateListActionsFormatter = function(value, row, index) {
          return [
            '<a class="edit ml10" href="javascript:void(0)" title="Edit or add a new '+RDFE.Utils.namingSchemaLabel('s', self.editor.namingSchema(), false, true)+' and '+RDFE.Utils.namingSchemaLabel('o', self.editor.namingSchema(), false, true)+' pairs associated with this '+RDFE.Utils.namingSchemaLabel('p', self.editor.namingSchema(), false, true)+'">',
            '  <i class="glyphicon glyphicon-edit"></i>',
            '</a>',
            '<a class="dereference ml10" href="javascript:void(0)" title="Dereference this '+RDFE.Utils.namingSchemaLabel('p', self.editor.namingSchema(), true, true)+'">',
            '  <i class="glyphicon glyphicon-link"></i>',
            '</a>',
            '<a class="remove ml10" href="javascript:void(0)" title="Remove all '+RDFE.Utils.namingSchemaLabel('spo', self.editor.namingSchema(), true, true)+' associated with this '+RDFE.Utils.namingSchemaLabel('p', self.editor.namingSchema(), false, true)+'">',
            '  <i class="glyphicon glyphicon-remove"></i>',
            '</a>'
          ].join('');
        };

        self.predicates = predicates;
        self.predicateTable = null;
        container.empty();

        var $list = $(document.createElement('table')).addClass('table');
        container.append($list);

        var pageNumber = 1;
        var pageSize = 10;
        var sortName = 'uri';
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
          "data": predicates,
          "idField": 'uri',
          "columns": [{
            "field": 'uri',
            "title": RDFE.Utils.namingSchemaLabel('p', self.editor.namingSchema()),
            "titleTooltip": RDFE.Utils.namingSchemaLabel('p', self.editor.namingSchema()),
            "sortable": true,
            "sorter": labelSorter,
            "formatter": labelFormatter
          }, {
            "field": 'items',
            "title": 'Count',
            "titleTooltip": 'Count',
            "sortable": true,
            "align": 'right',
            "sorter": self.editor.countSorter,
            "class": 'rdfe-small-column',
            "formatter": self.editor.countFormatter
          }, {
            "field": 'actions',
            "title": '<button class="add btn btn-default btn-sm" title="Click to create a new '+RDFE.Utils.namingSchemaLabel('p', self.editor.namingSchema(), false, true)+'"><span class="glyphicon glyphicon-plus" aria-hidden="true"></span> New</button>',
            "align": 'center',
            "valign": 'middle',
            "class": 'rdfe-small-column',
            "clickToSelect": false,
            "formatter": predicateListActionsFormatter,
            "events": {
              'click .edit': function(e, value, row, index) {
                self.editFct(row);
              },
              'click .dereference': function(e, value, row, index) {
                var dereference = self.editor.dereference();
                dereference(row.uri);
              },
              'click .remove': function(e, value, row, index) {
                self.editor.doc.deletePredicate(row.uri, function() {
                  $list.bootstrapTable('remove', {
                    field: 'uri',
                    values: [row.uri]
                  });
                  $(self.editor).trigger('rdf-editor-success', {
                    "type": 'predicate-delete-success',
                    "message": "Successfully deleted triples with predicate " + row.uri + "."
                  });
                }, function(error) {
                  $(self.editor).trigger('rdf-editor-error', {
                    "type": 'predicate-delete-error',
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
          self.editor.editPredicate();
        });
        self.predicateTable = $list;

        if (callback) {
          callback();
        }
      }, function(error) {
        $(self.editor).trigger('rdf-editor-error', {
          "type": 'predicate-list-error',
          "message": error
        });
      });
    };

    c.prototype.addPredicate = function(predicate) {
      var self = this;

      if (!_.find(self.predicates, function(p){ return p.uri === predicate.uri; })) {
        self.predicateTable.bootstrapTable('append', predicate);
        self.predicates.push(predicate);
      }
    };

    /**
     * Fetch details about the given predicate from the document and update them in the table.
     */
    c.prototype.updatePredicate = function(uri) {
      var self = this;

      self.editor.doc.getPredicate(uri, function(predicate) {
        var ndx = self.predicates.findIndex(function(item, index, items) {
          return (item.uri === uri);
        });
        self.predicateTable.bootstrapTable('updateRow', {
          "index": ndx,
          "row": predicate
        });
      });
    };

    return c;
  })();
})(jQuery);
