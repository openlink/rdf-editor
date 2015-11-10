/*
 *  This file is part of the OpenLink RDF Editor
 *
 *  Copyright (C) 2014-2015 OpenLink Software
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
    var c = function(doc, ontologyManager, object) {
      this.doc = doc;
      this.namingSchema = doc.config.options[doc.config.options["namingSchema"]];
      this.ontologyManager = ontologyManager;
      this.object = object;
    };

    var nodeFormatter = function(value) {
      if (value.interfaceName == "Literal") {
        if (value.datatype == 'http://www.w3.org/2001/XMLSchema#dateTime')
          return (new Date(value.nominalValue)).toString();
        else
          return value.nominalValue;
      } else {
        return value.toString();
      }
    };

    c.prototype.template = _.template(' \
      <div class="panel panel-default"> \
        <div class="panel-heading clearfix"> \
          <div class="form-group"> \
            <div class="col-sm-1"> \
              <label for="object" class="control-label pull-right" style="padding-top: 5px"><%= RDFE.Utils.namingSchemaLabel("o", this.namingSchema) %> </label> \
            </div> \
            <div class="col-sm-10"> \
              <input name="object" class="form-control" /> \
            </div> \
            <div class="col-sm-1"> \
              <button type="button" class="btn btn-default btn-sm pull-right" id="backButton">Back</button> \
            </div> \
          </div> \
        </div> \
        <div class="panel-body" id="objectTable"> \
        </div> \
        <div class="panel-body" id="objectForm" style="display: none;"> \
      </div>'
    );

    c.prototype.render = function(editor, container, backCallback) {
      var self = this;

      var objectEditorData = function(container, backCallback) {
        $list.bootstrapTable({
          striped:true,
          sortName:'subject',
          pagination:true,
          search:true,
          searchAlign: 'left',
          showHeader: true,
          editable: true,
          data: [],
          dataSetter: objectEditorDataSetter,
          columns: [{
            field: 'subject',
            title: RDFE.Utils.namingSchemaLabel('s', self.namingSchema),
            aligh: 'left',
            sortable: true,
            editable: function(triple) {
              return {
                mode: "inline",
                type: "rdfnode",
                rdfnode: {
                  type: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#Resource'
                },
                value: triple.subject
              }
            },
            formatter: nodeFormatter
          }, {
            field: 'predicate',
            title: RDFE.Utils.namingSchemaLabel('p', self.namingSchema),
            align: 'left',
            sortable: true,
            editable: function(triple) {
              return {
                mode: "inline",
                type: "rdfnode",
                rdfnode: {
                  type: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#Resource'
                },
                value: triple.predicate
              };
            },
            formatter: nodeFormatter
          }, {
            field: 'actions',
            title: '<button class="add btn btn-default" title="Add Relation" style="display: none;"><span class="glyphicon glyphicon-plus" aria-hidden="true"></span> New</button>',
            align: 'center',
            valign: 'middle',
            class: 'small-column',
            clickToSelect: false,
            editable: false,
            formatter: function(value, row, index) {
              return [
                '<a class="remove ml10" href="javascript:void(0)" title="Remove">',
                '<i class="glyphicon glyphicon-remove"></i>',
                '</a>'
              ].join('');
            },
            events: {
              'click .remove': function (e, value, row, index) {
                self.doc.deleteTriple(row, function() {
                  $list.bootstrapTable('remove', {
                    field: 'id',
                    values: [row.id]
                  });
                }, function() {
                  $(self).trigger('rdf-editor-error', { "type": 'triple-delete-failed', "message": 'Failed to delete triple.' });
                });
              }
            }
          }]
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
      };

      var objectEditorDataSetter = function(triple, field, newValue) {
        var newNode = newValue;

        if (field === 'subject') {
          newNode = self.doc.store.rdf.createNamedNode(newValue);
        }
        else if (field === 'predicate') {
          newNode = self.doc.store.rdf.createNamedNode(newValue);
        }

        var newTriple = self.doc.store.rdf.createTriple(triple.subject, triple.object, triple.object);
        newTriple[field] = newNode;
        self.doc.updateTriple(triple, newTriple, function(success) {
          // do nothing
        }, function(msg) {
          $(self).trigger('rdf-editor-error', { message: 'Failed to update triple in document: ' + msg });
        });
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

      var objectInput = container.find('input[name="object"]').rdfNodeEditor();
      if (self.object) {
        objectInput.setValue(self.object.object);
      }
      $(objectInput).on('changed', function(e, value) {
        var node = value.getValue();
        if (node.value) {
          if (node.type == 'uri') {
            node.value = self.ontologyManager.uriDenormalize(node.value);
          }
          var o = node.toStoreNode(self.doc.store);
          self.doc.getObject(o, function (object) {
            self.objectView.removeObject(self.object);
            self.objectView.addObject(object);

            self.object = object;
            self.renderData();
          });
        }
      });
      objectEditorData(container, backCallback);
    };

    c.prototype.renderData = function() {
      var self = this;

      var objects = (self.object) ? self.object.items : [];
      for(var i = 0; i < objects.length; i++) {
        objects[i].id = i;
      }
      self.objectTable.data('maxindex', i);
      self.objectTable.bootstrapTable('load', objects);;
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
        '        <label for="subject" class="col-sm-2 control-label">' + RDFE.Utils.namingSchemaLabel('s', self.namingSchema) + '</label> ' +
        '        <div class="col-sm-10"><input name="subject" class="form-control" /></div> ' +
        '      </div> ' +
        '      <div class="form-group"> ' +
        '        <label for="predicate" class="col-sm-2 control-label">' + RDFE.Utils.namingSchemaLabel('p', self.namingSchema) + '</label> ' +
        '        <div class="col-sm-10"><select name="predicate" class="form-control"></select></div> ' +
        '      </div> ' +
        '      <div class="form-group"> ' +
        '        <div class="col-sm-10 col-sm-offset-2"> ' +
        '          <button type="button" class="btn btn-default object-action object-action-new-cancel">Cancel</button> ' +
        '          <button type="button" class="btn btn-primary object-action object-action-new-save">OK</button> ' +
        '        </div> ' +
        '      </div> ' +
        '    </form> ' +
        '  </div> ' +
        '</div>'
      ).show();

      self.predicateEdit = self.objectFormContainer.find('select[name="predicate"]').propertyBox({
        ontoManager: self.ontologyManager
      });

      self.objectFormContainer.find('button.object-action-new-cancel').click(function(e) {
        self.objectFormContainer.hide();
        self.objectTableContainer.show();
      });

      self.objectFormContainer.find('button.object-action-new-save').click(function(e) {
        var s = self.objectFormContainer.find('input[name="subject"]').val();
        s = RDFE.Utils.trim(RDFE.Utils.trim(s, '<'), '>')
        var p = self.predicateEdit.selectedURI();
        p = RDFE.Utils.trim(RDFE.Utils.trim(p, '<'), '>')
        var t = self.doc.store.rdf.createTriple(self.doc.store.rdf.createNamedNode(s), self.doc.store.rdf.createNamedNode(p), self.object.object);
        self.doc.addTriples([t], function() {
          self.addTriple(t);
          $(self).trigger('rdf-editor-success', {
            "type": "triple-insert-success",
            "message": "Successfully added new statement."
          });
          self.objectFormContainer.hide();
          self.objectTableContainer.show();
        }, function() {
          $(self).trigger('rdf-editor-error', {
            "type": 'triple-insert-failed',
            "message": "Failed to add new statement to store."
          });
        });
      });
    };

    return c;
  })();
})(jQuery);
