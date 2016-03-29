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

(function ($) {

  var PropertyBox = function(elem, options) {
    var self = this;

    self.options = $.extend({}, PropertyBox.defaults, options);
    self.options.ontoManager = self.options.ontoManager || new RDFE.OntologyManager();

    self.mainElement = elem;

    $(self.options.ontoManager).on('changed', function(e, om, onto) {
      self.updateOptions();
    });

    $(self.mainElement).selectize({
      valueField: "URI",
      searchField: [ "title", "label", "prefix", "curi", "URI" ],
      sortField: [ "prefix", "URI" ],
      options: self.propertyList(),
      onChange: function(value) {
        $(self).trigger('changed', self.sel.options[value]);
      },
      createProperty: function(input, create) {
        return self.options.ontoManager.ontologyPropertyByURI(self.options.ontoManager.uriDenormalize(input), create);
      },
      create: function(input, cb) {
        // search for and optionally create a new property
        var that = this;

        input = RDFE.Utils.trim(RDFE.Utils.trim(input, '<'), '>');
        if (input === 'a') {
          input = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
        }
        var property = this.settings.createProperty(input);
        if (property) {
          cb(property);
        }
        else {
          var url = self.options.ontoManager.ontologyDetermine(input);
          if (!url) {
            url = self.options.ontoManager.prefixes[input] || input;
          }
          self.options.ontoManager.parseOntologyFile(url, {
            "success": function() {
              cb(that.settings.createProperty(input, true));
            },
            "error": function(state) {
              var message = (state && state.message)? state.message: 'Error loading ontology';

              console.log(message);
              bootbox.confirm(message + '. Do you want to create new property?', function(result) {
                if (result) {
                  var ontology = self.options.ontoManager.ontologyByURI(url);
                  if (!ontology) {
                    var ontology = self.options.ontoManager.ontologyByURI(url);
                    if (!ontology) {
                      ontology = new RDFE.Ontology(self.options.ontoManager, url);
                    }
                    cb(that.settings.createProperty(input, true));
                  }
                }
                else {
                  that.unlock()
                }
              });
            }
          });
        }
      },
      render: {
        item: function(item, escape) {
          var x = item.title || item.label || item.curi || item.name;
          if(item.curi && item.curi != x) {
            x = escape(x) + ' <small>(' + escape(item.curi) + ')</small>';
          }
          else {
            x = escape(x);
          }
          return '<div>' + x + '</div>';
        },
        option: function(item, escape) {
          return '<div>' + escape(item.title || item.label || item.curi || item.name) + '<br/><small>(' + escape(item.URI) + ')</small></div>';
        },
        'option_create': function(data, escape) {
          var url = data.input;
          url = RDFE.Utils.trim(RDFE.Utils.trim(url, '<'), '>');
          url = self.options.ontoManager.uriDenormalize(url);
          if (url != data.input)
            return '<div class="create">Add <strong>' + escape(data.input) + '</strong> <small>(' + escape(url) + ')</small>&hellip;</div>';
          else
            return '<div class="create">Add <strong>' + escape(url) + '</strong>&hellip;</div>';
        }
      }
    });

    // de-reference link
    if (self.options["dereferenceLink"]) {
      self.dereferenceLink = $(document.createElement('button'));
      self.dereferenceLink.attr('type', 'button').addClass('btn btn-default btn-sm');
      self.dereferenceLink.html('<i class="glyphicon glyphicon-link"></i>');
      var div = $(document.createElement('div')).addClass('rdfe-reference-link');
      div.append(self.dereferenceLink);
      if (self.mainElement.closest('.editable-input').length) {
        self.mainElement.parent().after(div);
      }
      else {
        self.mainElement.parent().append(div);
      }
      self.dereferenceLink.on('click', function() {
        self.options["dereferenceLink"](self.selectedURI());
      });
    }

    self.sel = $(self.mainElement)[0].selectize;
  };

  PropertyBox.defaults = {
    'ontoManager': null,
    'ontology': null
  };

  PropertyBox.prototype.setOntology = function(onto) {
    // console.log('setOntology', onto);
    this.options.ontology = onto;
    this.updateOptions();
  };

  PropertyBox.prototype.propertyList = function() {
    // console.log('propertyList', this.options);
    var list;
    if (this.options.ontology) {
      list = this.options.ontology.allProperties();
    }
    else {
      list = this.options.ontoManager.allProperties();
    }
    return list;
  };

  PropertyBox.prototype.updateOptions = function() {
    var self = this;

    var v = self.selectedURI();
    var pl = self.propertyList();
    self.sel.clearOptions()
    self.sel.addOption(pl); // FIXME: check if we also need to add the current value
    self.setPropertyURI(v);
  };

  PropertyBox.prototype.setPropertyURI = function(uri) {
    // console.log('PropertyBox.setPropertyURI', uri);
    if (uri) {
      var u = this.options.ontoManager.uriDenormalize(uri);
      u = RDFE.Utils.trim(RDFE.Utils.trim(u, '<'), '>');
      if (!this.sel.options[u]) {
        this.sel.addOption(this.options.ontoManager.ontologyPropertyByURI(u, true));
      }
      this.sel.setValue(u);
    }
    else {
      this.sel.setValue(null);
    }
  };

  PropertyBox.prototype.selectedURI = function() {
    return this.sel.getValue();
  };

  PropertyBox.prototype.selectedProperty = function() {
    return this.sel.options[this.selectedURI()];
  };

  PropertyBox.prototype.on = function(e, cb) {
    $(this).on(e, cb);
    return this;
  };

  $.fn.propertyBox = function(methodOrOptions) {
    var le = this.data('propertyBox');
    if(!le) {
      le = new PropertyBox(this, methodOrOptions);
      this.data('propertyBox', le);
    }
    return le;
  };
})(jQuery);
