/*
 *  This file is part of the OpenLink RDF Editor
 *
 *  Copyright (C) 2014-2017 OpenLink Software
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

  RDFE.ObjectEditor = (function() {
    // constructor
    var c = function(editor, object) {
      this.editor = editor;
      this.object = object;
    };

    c.prototype.template = _.template(' \
      <div class="panel panel-default"> \
        <div class="panel-heading clearfix"> \
          <div class="form-group"> \
            <div class="col-sm-1"> \
              <label for="object" class="control-label pull-right" style="padding-top: 5px"><%= RDFE.Utils.namingSchemaLabel("o", this.editor.namingSchema()) %> </label> \
            </div> \
            <div class="col-sm-10"> \
              <input name="object" class="form-control" /> \
            </div> \
            <div class="col-sm-1"> \
              <button type="button" class="btn btn-default btn-sm pull-right rdfe-font-bold" id="backButton" title="Back">Back</button> \
            </div> \
          </div> \
        </div> \
        <div class="panel-body" id="objectTable"> \
        </div> \
        <div class="panel-body" id="objectForm" style="display: none;"> \
      </div>'
    );

    c.prototype.render = function(editor, container, newStatement, backCallback) {
      var self = this;
      var oldTriple;

      var objectEditorData = function(container, backCallback) {
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
            "field": 'predicate',
            "title": RDFE.Utils.namingSchemaLabel('p', self.editor.namingSchema()),
            "titleTooltip": RDFE.Utils.namingSchemaLabel('p', self.editor.namingSchema()),
            "sortable": true,
            "editable": self.editor.editablePredicate(self.editor),
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
                    "type": 'object-delete-success',
                    "message": "Successfully deleted triple."
                  });
                }, function(error) {
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

        self.objectView = editor.objectView;
        self.objectTable = $list;
        self.objectTableContainer = container.find('#objectTable');
        self.objectFormContainer = container.find('#objectForm');
        self.addButton = $($list).find('.add');
        self.addButton.click(function() {
          self.createNewRelationEditor();
        });

        // reftersh objects data
        self.renderData();
        if (newStatement) {
          self.createNewRelationEditor();
        }
      };

      container.empty();

      // create the basic entity editor layout using the template above
      container.append(self.template(self.object));

      var $list = $(document.createElement('table')).addClass('table');
      container.find('#objectTable').append($list);

      // add click handlers to our buttons (we have three handlers because we used to have three buttons)
      var backButton = container.find('button#backButton');
      backButton.click(function() {
        self.objectView.removeObject(self.object);
        backCallback();
      });

      var objectInput = container.find('input[name="object"]').rdfNodeEditor(self.editor.doc.config.options);
      if (self.object) {
        objectInput.setValue(self.object.object);
      }
      $(objectInput).on('changed', function(e, value) {
        var node = value.getValue();
        if (node.value) {
          if (node.type == 'uri') {
            node.value = self.editor.ontologyManager.uriDenormalize(node.value);
          }
          var o = node.toStoreNode(self.editor.doc.store);
          self.editor.doc.getObject(o, function (object) {
            self.objectView.removeObject(self.object);
            self.objectView.addObject(object);

            self.object = object;
            self.renderData();
          });
        }
      });

      // Set focus
      objectInput.mainElement.focus();

      objectEditorData(container, backCallback);
    };

    c.prototype.renderData = function() {
      var self = this;

      var objects = (self.object) ? self.object.items : [];
      for(var i = 0; i < objects.length; i++) {
        objects[i].id = i;
      }
      self.objectTable.data('maxindex', i);
      self.objectTable.bootstrapTable('load', objects);
      if (self.object) {
        self.addButton.show();
      }
      else {
        self.addButton.hide();
      }
    },

    c.prototype.addTriple = function(triple) {
      var self = this;

      var i = self.objectTable.data('maxindex');
      self.objectTable.bootstrapTable('append', $.extend(triple, {
        id: i
      }));
      self.objectTable.data('maxindex', ++i);
      self.objectView.updateObject(self.object.object);
    };

    c.prototype.createNewRelationEditor = function() {
      var self = this;

      self.objectTableContainer.hide();
      self.objectFormContainer.html(
        '<div class="panel panel-default"> ' +
        '  <div class="panel-heading"><h3 class="panel-title">Add Relation</h3></div> ' +
        '  <div class="panel-body"> ' +
        '    <form class="form-horizontal"> ' +
        '      <div class="form-group"> ' +
        '        <label for="subject" class="col-sm-2 control-label">' + RDFE.Utils.namingSchemaLabel('s', self.editor.namingSchema()) + '</label> ' +
        '        <div class="col-sm-10"><input name="subject" class="form-control" /></div> ' +
        '      </div> ' +
        '      <div class="form-group"> ' +
        '        <label for="predicate" class="col-sm-2 control-label">' + RDFE.Utils.namingSchemaLabel('p', self.editor.namingSchema()) + '</label> ' +
        '        <div class="col-sm-10"><select name="predicate" class="form-control"></select></div> ' +
        '      </div> ' +
        '      <div class="form-group"> ' +
        '        <div class="col-sm-10 col-sm-offset-2"> ' +
        '          <button type="button" class="btn btn-default object-action object-action-new-cancel">Cancel</button> ' +
        '          <button type="submit" class="btn btn-primary object-action object-action-new-save">OK</button> ' +
        '        </div> ' +
        '      </div> ' +
        '    </form> ' +
        '  </div> ' +
        '</div>'
      ).show();

      var predicateEditor = self.objectFormContainer.find('select[name="predicate"]').propertyBox({
        "ontologyManager": self.editor.ontologyManager
      });

      var subjectEditor = self.objectFormContainer.find('input[name="subject"]');
      // Set focus
      subjectEditor.focus();

      self.objectFormContainer.find('button.object-action-new-cancel').click(function(e) {
        self.objectFormContainer.hide();
        self.objectTableContainer.show();
      });

      self.objectFormContainer.find('button.object-action-new-save').click(function(e) {
        e.preventDefault();

        var s = subjectEditor.val();
        s = RDFE.Utils.trim(RDFE.Utils.trim(s, '<'), '>');
        if (!RDFE.Validate.check(subjectEditor, s))
          return;

        var p = predicateEditor.selectedURI();
        p = RDFE.Utils.trim(RDFE.Utils.trim(p, '<'), '>');
        if (!RDFE.Validate.check(predicateEditor.sel, p))
          return;

        var t = self.editor.doc.store.rdf.createTriple(self.editor.doc.store.rdf.createNamedNode(s), self.editor.doc.store.rdf.createNamedNode(p), self.object.object);
        self.editor.doc.addTriples([t], function() {
          self.addTriple(t);
          $(self.editor).trigger('rdf-editor-success', {
            "type": "object-insert-success",
            "message": "Successfully added new triple."
          });
          self.objectFormContainer.hide();
          self.objectTableContainer.show();
        }, function() {
          $(self.editor).trigger('rdf-editor-error', {
            "type": 'object-insert-error',
            "message": "Failed to add new triple."
          });
        });
      });
    };

    return c;
  })();
})(jQuery);
