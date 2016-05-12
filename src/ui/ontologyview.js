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

  RDFE.OntologyView = (function() {
    // constructor
    var c = function(editor, params) {
      params = $.extend({}, params);

      this.editor = editor;
      this.ontologyManager = editor.ontologyManager;
      this.ontologies = this.ontologyManager.allOntologies();
    };

    c.prototype.render = function(container) {
      var self = this;

      $(self.ontologyManager).on('changed', function(e, ontologyManager) {
        self.addOntologies(ontologyManager.allOntologies());
      });

      self.table = null;
      self.tableContainer = null;
      self.formContainer = null;
      container.empty();

      var $list = $(document.createElement('div'));
      container.append($list);

      var $table = $(document.createElement('table')).addClass('table');
      $list.append($table);

      var $form = $(document.createElement('div'));
      container.append($form);

      var editableSetter = function(ontology, field, newValue) {
        newValue = $.trim(newValue);
        if (ontology.prefix === newValue) {
          return;
        }
        delete self.ontologyManager.prefixes[ontology.prefix];
        delete RDFE.prefixes[ontology.prefix];
        ontology.prefix = newValue;
        self.ontologyManager.prefixes[ontology.prefix] = ontology.URI;
        RDFE.prefixes[ontology.prefix] = ontology.URI;
      };

      var el = self.ontologyManager.allOntologies();

      $table.bootstrapTable({
        "striped": true,
        "sortName": 'prefix',
        "showHeader": false,
        "classes": 'table-hover table-condensed',
        "height": 157,
        "data": el,
        "idField": 'URI',
        "dataSetter": editableSetter,
        "columns": [{
          "field": 'prefix',
          "title": 'Prefix',
          "titleTooltip": 'Prefix',
          "editable": function(ontology) {
            return {
              "mode": "inline",
              "type": "text",
              "value": ontology.prefix,
              "emptytext": "empty",
              "validate": function(value) {
                var v = $.trim(value);
                if (v == '') {
                  return 'This field is required';
                }
                if (self.ontologyManager.ontologyByPrefix(v)) {
                  return 'This prefix is used';
                }
              }
            }
          },
          "formatter": function(value, ontology, index) {
            return (ontology.prefix)? ontology.prefix: '';
          }
        }, {
          "field": 'URI',
          "title": 'URI',
          "titleTooltip": 'URI',
          "formatter": function(value, ontology, index) {
            return [
              '<span title="Vocabulary {0} - {1} classes, {2} properties">'.format(ontology.URI, ontology.classesLength(), ontology.propertiesLength()),
              '{0} - {1}/{2}'.format(ontology.URI, ontology.classesLength(), ontology.propertiesLength()),
              '</span>',
            ].join('');
          }
        }, {
          "field": 'actions',
          "title": '',
          "align": 'center',
          "valign": 'middle',
          "clickToSelect": false,
          "formatter": function(value, row, index) {
            return [
              '<a class="refresh ml10" href="javascript:void(0)" title="Refresh vocabulary">',
              '  <i class="glyphicon glyphicon-refresh"></i>',
              '</a>',
              '<a class="dereference ml10" href="javascript:void(0)" title="Dereference this vocabulary">',
              '  <i class="glyphicon glyphicon-link"></i>',
              '</a>',
              '<a class="remove ml10" href="javascript:void(0)" title="Remove vocabulary">',
              '  <i class="glyphicon glyphicon-remove"></i>',
              '</a>'
            ].join('');
          },
          "events": {
            'click .refresh': function(e, value, ontology, index) {
              var $loading = $('#ontology-loading');
              if ($loading.is(":visible"))
                return;

              $loading.show();
              var params = {
                "success":  function () {
                  $(self.ontologyManager).trigger('loadingFinished', [self.ontologyManager]);
                  $loading.hide();
                },

                "error": function (state) {
                  $(self.ontologyManager).trigger('loadingFailed', [self.ontologyManager]);
                  $.notify({"message": state.message}, {"type": 'danger'});
                  $loading.hide();
                },

                "ioType": 'http'
              };
              self.ontologyManager.parseOntologyFile(ontology.URI, params);
            },
            'click .dereference': function(e, value, ontology, index) {
              var dereference = self.editor.dereference();
              dereference(ontology.URI);
            },
            'click .remove': function(e, value, ontology, index) {
              self.ontologyManager.ontologyRemove(ontology.URI);
              self.table.bootstrapTable('remove', {
                "field": 'URI',
                "values": [ontology.URI]
              });
            }
          }
        }]
      });
      self.table = $table;
      self.tableContainer = $list;
      self.formContainer = $form;

      // form
      $form.html(
        '<div class="panel panel-default" style="border: 0; padding: 0; margin-bottom: 0;"> ' +
        '  <div class="panel-body" style="padding-top: 10px; padding-bottom: 0;"><div class="form-horizontal"> ' +
        '    <form class="form-horizontal"> ' +
        '      <div class="form-group"> ' +
        '        <label for="ontology" class="col-sm-2 control-label">Prefix</label> ' +
        '        <div class="col-sm-10"> ' +
        '          <input name="prefix" id="prefix" class="form-control" /> ' +
        '        </div> ' +
        '      </div> ' +
        '      <div class="form-group"> ' +
        '        <label for="class" class="col-sm-2 control-label">URI</label> ' +
        '        <div class="col-sm-10"> ' +
        '          <input name="uri" id="uri" class="form-control" /> ' +
        '        </div> ' +
        '      </div> ' +
        '      <div class="form-group"> ' +
        '        <div class="col-sm-10 col-sm-offset-2"> ' +
        '          <button type="button" class="btn btn-default cancel">Cancel</button> ' +
        '          <button type="submit" class="btn btn-primary save">OK</button> ' +
        '        </div> ' +
        '      </div> ' +
        '    </form> ' +
        '  </div> ' +
        '</div>\n'
      );
      $form.find('.cancel').click(function (e) {
        e.preventDefault();

        var $loading = $('#ontology-loading')
        if ($loading.is(":visible"))
          return;

        self.formContainer.hide();
        self.tableContainer.show();
      });

      $form.find('.save').click(function (e) {
        e.preventDefault();

        var $loading = $('#ontology-loading');
        if ($loading.is(":visible"))
          return;

        var uriEditor = self.formContainer.find('#uri');

        var formClose = function () {
          self.formContainer.hide();
          self.tableContainer.show();
          $loading.hide();
        };

        var params = {
          "success":  function () {
            $(self.ontologyManager).trigger('loadingFinished', [self.ontologyManager]);
            formClose();
          },

          "error": function (state) {
            $(self.ontologyManager).trigger('loadingFailed', [self.ontologyManager]);
            var message = (state && state.message)? state.message: 'Error loading ontology';
            bootbox.confirm(message + '. Do you want an empty ontology to be added?', function(result) {
              if (result) {
                var uri = uriEditor.val();
                var ontology = self.ontologyManager.ontologyByURI(uri);
                if (!ontology) {
                  ontology = new RDFE.Ontology(self.ontologyManager, uri);
                  var prefix = self.formContainer.find('#prefix').val();
                  if (prefix) {
                    ontology.prefix = prefix
                  }
                  self.addOntologies(self.ontologyManager.allOntologies());
                }
              }
            });
            formClose();
          }
        };
        var uri = uriEditor.val();
        if (!RDFE.Validate.check(uriEditor, uri)) {
          return;
        }
        var ontology = self.ontologyManager.ontologyByURI(uri);
        if (ontology) {
          bootbox.alert('This ontology is loaded. Please, use \'Refresh\' action!');
          return;
        }

        $loading.show();
        if (!self.ontologyManager.prefixByOntology(uri)) {
          var prefix = self.formContainer.find('#prefix').val();
          self.ontologyManager.prefixes[prefix] = uri;
        }
        self.ontologyManager.parseOntologyFile(uri, params);
      });

      $form.find('#prefix').blur(function (e) {
        var uri = RDFE.ontologyByPrefix(self.formContainer.find('#prefix').val());
        if (uri) {
          self.formContainer.find('#uri').val(uri);
        }
      });

      $form.hide();
    };

    c.prototype.addOntologies = function(ontologies) {
      var self = this;

      for (var i = 0; i < ontologies.length; i++) {
        if (!_.find(self.ontologies, function(o){return o.URI === ontologies[i].URI})) {
          self.table.bootstrapTable('append', ontologies[i]);
        }
      }
      self.ontologies = ontologies;
    };

    // Entities
    c.prototype.editor = function(forcedType) {
      var self = this;

      self.formContainer.find('#prefix').val('');
      self.formContainer.find('#uri').val('');

      self.tableContainer.hide();
      self.formContainer.show();
      self.formContainer.find('#prefix').focus();
    };

    return c;
  })();
})(jQuery);
