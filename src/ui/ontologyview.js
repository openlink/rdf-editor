(function($) {
  if (!window.RDFE) {
    window.RDFE = {};
  }

  RDFE.OntologyView = (function() {
    // constructor
    var c = function(ontologyManager, params) {
      params = $.extend({}, params);

      this.ontologyManager = ontologyManager;
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

      var el = self.ontologyManager.allOntologies();

      $table.bootstrapTable({
        "striped": true,
        "sortName": 'prefix',
        "showHeader": false,
        "classes": 'table-hover table-condensed',
        "height": 157,
        "data": el,
        "idField": 'uri',
        "columns": [{
          "field": 'prefix',
          "title": 'Prefix',
          "formatter": function(value, ontology, index) {
            return ontology.prefix;
          }
        }, {
          "field": 'uri',
          "title": 'URI',
          "formatter": function(value, ontology, index) {
            return ontology.URI;
          }
        }, {
          "field": 'actions',
          "title": '',
          "align": 'center',
          "valign": 'middle',
          "clickToSelect": false,
          "formatter": function(value, row, index) {
            return [
              '<a class="refresh ml10" href="javascript:void(0)" title="Refresh">',
              '  <i class="glyphicon glyphicon-refresh"></i>',
              '</a>',
              '<a class="remove ml10" href="javascript:void(0)" title="Remove">',
              '  <i class="glyphicon glyphicon-remove"></i>',
              '</a>'
            ].join('');
          },
          "events": {
            'click .refresh': function(e, value, ontology, index) {
              self.ontologyManager.parseOntologyFile(ontology.URI, {"ioType": 'http'});
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
        '    <div class="form-group"> ' +
        '      <label for="ontology" class="col-sm-2 control-label">Prefix</label> ' +
        '      <div class="col-sm-10"> ' +
        '        <input name="prefix" id="prefix" class="form-control" /> ' +
        '      </div> ' +
        '    </div> ' +
        '    <div class="form-group"> ' +
        '      <label for="class" class="col-sm-2 control-label">URI</label> ' +
        '      <div class="col-sm-10"> ' +
        '        <input name="uri" id="uri" class="form-control" /> ' +
        '      </div> ' +
        '    </div> ' +
        '    <div class="form-group"> ' +
        '      <div class="col-sm-10 col-sm-offset-2"> ' +
        '        <a href="#" class="btn btn-default cancel">Cancel</a> ' +
        '        <a href="#" class="btn btn-primary ok">OK</a> ' +
        '        <img src="images/loading.gif" class="loading" style="display: none;"/> ' +
        '      </div> ' +
        '    </div> ' +
        '  </div> ' +
        '</div>\n'
      );
      $form.find('.cancel').click(function (e) {
        e.preventDefault();
        var $loading = $form.find('.loading');
        if ($form.find('.loading').is(":visible"))
          return;

        self.formContainer.hide();
        self.tableContainer.show();
      });

      $form.find('.ok').click(function (e) {
        e.preventDefault();

        var $loading = $form.find('.loading');
        if ($loading.is(":visible"))
          return;

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
                var uri = self.formContainer.find('#uri').val();
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
        var uri = self.formContainer.find('#uri').val();
        var ontology = self.ontologyManager.ontologyByURI(uri);
        if (ontology) {
          bootbox.alert('This ontology is loaded yet.');
          return;
        }

        $loading.show();
        self.ontologyManager.parseOntologyFile(self.formContainer.find('#uri').val(), params);
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
      for (var i = 0; i < ontologies.length; i++) {
        if (!_.find(self.ontologies, function(o){return o.URI === ontologies[i].URI})) {
          this.table.bootstrapTable('append', ontologies[i]);
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
    };

    return c;
  })();
})(jQuery);
