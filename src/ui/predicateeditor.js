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

  RDFE.PredicateEditor = (function() {
    // constructor
    var c = function(editor, predicate) {
      this.editor = editor;
      this.predicate = predicate;
    };

    c.prototype.template = _.template(' \
      <div class="panel panel-default"> \
        <div class="panel-heading clearfix"> \
          <form class="form-inline"> \
            <div class="form-group" style="width: 80%;"> \
              <label><%= RDFE.Utils.namingSchemaLabel("p", this.editor.namingSchema()) %> </label> \
              <select name="predicate" class="form-control" style="width: 85%;"></select> \
            </div> \
            <div class="btn-group pull-right" role="group"> \
              <button type="button" class="btn btn-default btn-sm rdfe-font-bold" id="backButton" title="Back">Back</button> \
            </div> \
          </form> \
        </div> \
        <div class="panel-body" id="predicateTable"> \
        </div> \
        <div class="panel-body" id="predicateForm" style="display: none;"> \
      </div>'
    );

    c.prototype.render = function(editor, container, newStatement, backCallback) {
      var self = this;
      var oldTriple;

      var predicateEditorData = function(container, backCallback) {
        $list.bootstrapTable({
          "striped": true,
          "sortName": 'subject',
          "pagination": true,
          "paginationVAlign": 'top',
          "search": true,
          "searchAlign": 'left',
          "showHeader": true,
          "editable": true,
          "data": [],
          "dereference": true,
          "columns": [{
            "field": 'subject',
            "title": RDFE.Utils.namingSchemaLabel('s', self.editor.namingSchema()),
            "titleTooltip": RDFE.Utils.namingSchemaLabel('s', self.editor.namingSchema()),
            "sortable": true,
            "editable": self.editor.editableSubject(self.editor),
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
            "title": '<button class="add btn btn-default btn-sm" title="Add Relation" style="display: none;"><span class="glyphicon glyphicon-plus" aria-hidden="true"></span> New</button>',
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
                self.editor.doc.deleteTriple(row, function() {
                  $list.bootstrapTable('remove', {
                    field: 'id',
                    values: [row.id]
                  });
                  $(self.editor).trigger('rdf-editor-success', {
                    "type": 'predicate-delete-success',
                    "message": "Successfully deleted triple."
                  });
                }, function(error) {
                  $(self.editor).trigger('rdf-editor-error', {
                    "type": 'predicate-delete-error',
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

        self.predicateView = editor.predicateView;
        self.predicateTable = $list;
        self.predicateTableContainer = container.find('#predicateTable');
        self.predicateFormContainer = container.find('#predicateForm');
        self.addButton = $($list).find('.add');
        self.addButton.click(function() {
          self.createNewRelationEditor();
        });

        // reftersh predicates data
        self.renderData();
        if (newStatement) {
          self.createNewRelationEditor();
        }
      };

      container.empty();

      // create the basic entity editor layout using the template above
      container.append(self.template(self.predicate));

      var $list = $(document.createElement('table')).addClass('table');
      container.find('#predicateTable').append($list);

      // add click handlers to our buttons (we have three handlers because we used to have three buttons)
      var backButton = container.find('button#backButton');
      backButton.click(function() {
        backCallback();
      });

      var predicateEditor = container.find('select[name="predicate"]').propertyBox({
        "ontologyManager": self.editor.ontologyManager
      });
      if (self.predicate) {
        predicateEditor.setPropertyURI(self.predicate.uri);
      }

      // Set focus
      if (!self.predicate) {
        predicateEditor.sel.focus();
      }

      predicateEditor.sel.on('change', function(predicateUri) {
        if (predicateUri) {
          self.editor.doc.getPredicate(predicateUri, function (predicate) {
            self.predicateView.addPredicate(predicate);

            self.predicate = predicate;
            self.renderData();
          });
        }
      });
      predicateEditorData(container, backCallback);
    };

    c.prototype.renderData = function() {
      var self = this;

      var predicates = (self.predicate) ? self.predicate.items : [];
      for(var i = 0; i < predicates.length; i++) {
        predicates[i].id = i;
      }
      self.predicateTable.data('maxindex', i);
      self.predicateTable.bootstrapTable('load', predicates);
      if (self.predicate) {
        self.addButton.show();
      }
      else {
        self.addButton.hide();
      }
    },

    c.prototype.addTriple = function(triple) {
      var self = this;

      var i = self.predicateTable.data('maxindex');
      self.predicateTable.bootstrapTable('append', $.extend(triple, {
        id: i
      }));
      self.predicateTable.data('maxindex', ++i);
      self.predicateView.updatePredicate(self.predicate.uri);
    };

    c.prototype.createNewRelationEditor = function() {
      var self = this;

      self.predicateTableContainer.hide();
      self.predicateFormContainer.html(
        '<div class="panel panel-default"> ' +
        '  <div class="panel-heading"><h3 class="panel-title">Add Relation</h3></div> ' +
        '  <div class="panel-body"> ' +
        '    <form class="form-horizontal"> ' +
        '      <div class="form-group"> ' +
        '        <label for="subject" class="col-sm-2 control-label">' + RDFE.Utils.namingSchemaLabel('s', self.editor.namingSchema()) + '</label> ' +
        '        <div class="col-sm-10"><input name="subject" class="form-control" /></div> ' +
        '      </div> ' +
        '      <div class="form-group"> ' +
        '        <label for="object" class="col-sm-2 control-label">' + RDFE.Utils.namingSchemaLabel('o', self.editor.namingSchema()) + '</label> ' +
        '        <div class="col-sm-10"><input name="object" class="form-control" /></div> ' +
        '      </div> ' +
        '      <div class="form-group"> ' +
        '        <div class="col-sm-10 col-sm-offset-2"> ' +
        '          <button type="button" class="btn btn-default predicate-action predicate-action-new-cancel">Cancel</button> ' +
        '          <button type="submit" class="btn btn-primary predicate-action predicate-action-new-save">OK</button> ' +
        '        </div> ' +
        '      </div> ' +
        '    </form> ' +
        '  </div> ' +
        '</div>'
      ).show();

      var subjectEditor = self.predicateFormContainer.find('input[name="subject"]');
      // Set focus
      subjectEditor.focus();

      var property = self.editor.ontologyManager.ontologyProperties[self.predicate.uri];
      var objectEditor = self.predicateFormContainer.find('input[name="object"]').rdfNodeEditor(self.editor.doc.config.options);
      self.editor.changeObjectType(property, objectEditor);

      self.predicateFormContainer.find('button.predicate-action-new-cancel').click(function(e) {
        self.predicateFormContainer.hide();
        self.predicateTableContainer.show();
      });

      self.predicateFormContainer.find('button.predicate-action-new-save').click(function(e) {
        e.preventDefault();

        var s = subjectEditor.val();
        s = RDFE.Utils.trim(RDFE.Utils.trim(s, '<'), '>');
        if (!RDFE.Validate.check(subjectEditor, s))
          return;

        var p = self.predicate.uri;
        var o = objectEditor.getValue();
        if (!RDFE.Validate.check(objectEditor.getField(), o.value))
          return;

        var t = self.editor.doc.store.rdf.createTriple(self.editor.doc.store.rdf.createNamedNode(s), self.editor.doc.store.rdf.createNamedNode(p), o.toStoreNode(self.editor.doc.store));
        self.editor.doc.addTriples([t], function() {
          self.addTriple(t);
          $(self.editor).trigger('rdf-editor-success', {
            "type": "predicate-insert-success",
            "message": "Successfully added new triple."
          });
          self.predicateFormContainer.hide();
          self.predicateTableContainer.show();
        }, function() {
          $(self.editor).trigger('rdf-editor-error', {
            "type": 'predicate-insert-error',
            "message": "Failed to add new triple."
          });
        });
      });
    };

    return c;
  })();
})(jQuery);
