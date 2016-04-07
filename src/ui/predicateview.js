/*
 *  This file is part of the OpenLink RDF Editor
 *
 *  Copyright (C) 2014-2016 OpenLink Software
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
    var c = function(doc, ontologyManager, editor, params) {
      this.doc = doc;
      this.ontologyManager = ontologyManager;
      this.editor = editor;
      this.editFct = params.editFct;
    };

    var labelFormatter = function(value, row, index) {
      return '{0} (<small>{1}</small>)'.format(RDFE.Utils.uri2name(row.uri), row.uri);
    };

    var labelSorter = function(a, b) {
      function format(v) {
        return '{0} (<small>{1}</small>)'.format(RDFE.Utils.uri2name(v), v);
      }
      a = format(a);
      b = format(b);
      if (a > b) return 1;
      if (a < b) return -1;
      return 0;
    };

    c.prototype.render = function(container, callback) {
      var self = this;

      self.doc.listPredicates(function(predicates) {
        var predicateListActionsFormatter = function(value, row, index) {
          return [
            '<a class="edit ml10" href="javascript:void(0)" title="Edit or add a new '+RDFE.Utils.namingSchemaLabel('s', self.editor.namingSchema(), false, true)+' and '+RDFE.Utils.namingSchemaLabel('o', self.editor.namingSchema(), false, true)+' pairs associated with this '+RDFE.Utils.namingSchemaLabel('p', self.editor.namingSchema(), false, true)+'">',
            '  <i class="glyphicon glyphicon-edit"></i>',
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
          sortName: 'uri',
          pagination: true,
          search: true,
          searchAlign: 'left',
          trimOnSearch: false,
          showHeader: true,
          data: predicates,
          idField: 'uri',
          columns: [{
            field: 'uri',
            title: RDFE.Utils.namingSchemaLabel('p', self.namingSchema),
            titleTooltip: RDFE.Utils.namingSchemaLabel('p', self.namingSchema),
            sortable: true,
            sorter: labelSorter,
            formatter: labelFormatter
          }, {
            field: 'count',
            title: 'Count',
            titleTooltip: 'Count',
            align: 'right',
            class: 'rdfe-small-column',
            formatter: countFormatter
          }, {
            field: 'actions',
            title: '<button class="add btn btn-default" title="Click to create a new '+RDFE.Utils.namingSchemaLabel('p', self.namingSchema, false, true)+'"><span class="glyphicon glyphicon-plus" aria-hidden="true"></span> New</button>',
            align: 'center',
            valign: 'middle',
            class: 'rdfe-small-column',
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
        self.predicateTable.bootstrapTable('append', predicate);
        self.predicates.push(predicate);
      }
    };

    /**
     * Fetch details about the given predicate from the document and update them in the table.
     */
    c.prototype.updatePredicate = function(uri) {
      var self = this;

      self.doc.getPredicate(uri, function(predicate) {
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
