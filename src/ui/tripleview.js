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

  RDFE.TripleView = (function() {
    // constructor
    var c = function(editor) {
      this.editor = editor;
    };

    c.prototype.render = function(container, callback) {
      var self = this;
      var oldTriple;

      self.editor.doc.listProperties(function (pl) {
        self.editor.doc.store.graph(self.editor.doc.graph, function(error, g) {

          if (!error) {
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
              "striped": true,
              "sortName": 'subject',
              "pagination": true,
              "search": true,
              "searchAlign": 'left',
              "showHeader": true,
              "data": triples,
              "editable": true,
              "dereference": true,
              "columns": [{
                "field": 'subject',
                "title": RDFE.Utils.namingSchemaLabel('s', self.editor.namingSchema()),
                "titleTooltip": RDFE.Utils.namingSchemaLabel('s', self.editor.namingSchema()),
                "sortable": true,
                "editable": self.editor.editableSubject(self.editor),
                "formatter": self.editor.nodeFormatter
              }, {
                "field": 'predicate',
                "title": RDFE.Utils.namingSchemaLabel('p', self.editor.namingSchema()),
                "titleTooltip": RDFE.Utils.namingSchemaLabel('p', self.editor.namingSchema()),
                "sortable": true,
                "editable": self.editor.editablePredicate(self.editor),
                "formatter": self.editor.nodeFormatter
              }, {
                "field": 'object',
                "title": RDFE.Utils.namingSchemaLabel('o', self.editor.namingSchema()),
                "titleTooltip": RDFE.Utils.namingSchemaLabel('o', self.editor.namingSchema()),
                "sortable": true,
                "editable": self.editor.editableObject(self.editor, function(triple){return triple.predicate.toString();}),
                "formatter": self.editor.nodeFormatter
              }, {
                "field": 'actions',
                "title": '<button class="add btn btn-default btn-sm" title="Add a new statement to the document"><span class="glyphicon glyphicon-plus" aria-hidden="true"></span> New</button>',
                "align": 'center',
                "valign": 'middle',
                "class": 'rdfe-small-column',
                "clickToSelect": false,
                "editable": false,
                "formatter": function(value, row, index) {
                  return [
                    '<a class="remove ml10" href="javascript:void(0)" title="Remove">',
                    '<i class="glyphicon glyphicon-remove"></i>',
                    '</a>'
                  ].join('');
                },
                "events": {
                  'click .remove': function (e, value, row, index) {
                    var triple = row;
                    self.editor.doc.deleteTriple(triple, function() {
                      $list.bootstrapTable('remove', {
                        field: 'id',
                        values: [row.id]
                      });
                      $(self.editor).trigger('rdf-editor-success', {
                        "type": 'triple-delete-success',
                        "message": "Successfully deleted triple."
                      });
                    }, function() {
                      $(self.editor).trigger('rdf-editor-error', {
                        "type": 'triple-delete-error',
                        "message": 'Failed to delete triple.'
                      });
                    });
                  }
                }
              }]
            });

            $list.on('editable-shown.bs.table', function(e, field, triple) {
              oldTriple = _.clone(triple);
            });

            $list.on('editable-save.bs.table', function(e, field, triple) {
              self.editor.dataSetter(field, oldTriple, triple);
            });

            $($list).find('.add').on('click', function(e) {
              self.editor.editTriple();
            });
            self.tripleTable = $list;

            if (callback) {
              callback();
            }
          } else {
            $(self.editor).trigger('rdf-editor-error', {
              "type": 'triple-list-error',
              "message": error
            });
          }
        });
      });
    };

    c.prototype.addTriple = function(t) {
      var i = this.tripleTable.data('maxindex');
      this.tripleTable.bootstrapTable('append', $.extend(t, { id: i}));
      this.tripleTable.data('maxindex', i+1);
    };

    return c;
  })();
})(jQuery);
