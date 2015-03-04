(function ($) {

  var PropertyBox = function(elem, options) {
    var self = this;

    self.options = $.extend({}, PropertyBox.defaults, options);
    self.options.ontoManager = self.options.ontoManager || new RDFE.OntologyManager();

    self.mainElem = elem;

    $(self.options.ontoManager).on('changed', function(e, om, onto) {
      self.updateOptions();
    });

    $(self.mainElem).selectize({
      valueField: "URI",
      searchField: [ "title", "label", "prefix", "URI" ],
      sortField: [ "prefix", "URI" ],
      options: self.propertyList(),
      onChange: function(value) {
        $(self).trigger('changed', self.sel.options[value]);
      },
      create: function(input, cb) {
        // search for and optionally create a new property

        var property = self.options.ontoManager.ontologyPropertyByURI(self.options.ontoManager.uriDenormalize(input));
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
              cb(self.options.ontoManager.ontologyPropertyByURI(self.options.ontoManager.uriDenormalize(input), true));
            },
            "error": function(state) {
              if (state && state.message) {
                $.growl({message: state.message}, {type: 'danger'});
              }
              cb(null);
            }
          });
        }
      },
      render: {
        item: function(item, escape) {
          var x = item.title || item.label || name.curi || item.name;
          if(item.curi && item.curi != x) {
            x = escape(x) + ' <small>(' + escape(item.curi) + ')</small>';
          }
          else {
            x = escape(x);
          }
          return '<div>' + x + '</div>';
        },
        option: function(item, escape) {
          return '<div>' + escape(item.title || item.label || name.curi || item.name) + '<br/><small>(' + escape(item.URI) + ')</small></div>';
        },
        'option_create': function(data, escape) {
          var url = self.options.ontoManager.uriDenormalize(data.input);
          if (url != data.input)
            return '<div class="create">Add <strong>' + escape(data.input) + '</strong> <small>(' + escape(url) + ')</small>&hellip;</div>';
          else
            return '<div class="create">Add <strong>' + escape(url) + '</strong>&hellip;</div>';
        }
      }
    });

    self.sel = $(self.mainElem)[0].selectize;
  };

  PropertyBox.defaults = {
    'ontoManager': null,
    'ontology': null
  };

  PropertyBox.prototype.setOntology = function(onto) {
    console.log('setOntology', onto);
    this.options.ontology = onto;
    this.updateOptions();
  };

  PropertyBox.prototype.propertyList = function() {
    console.log('propertyList', this.options);
    if(this.options.ontology) {
      return this.options.ontology.allProperties();
    }
    else {
      return this.options.ontoManager.allProperties();
    }
  };

  PropertyBox.prototype.updateOptions = function() {
    var pl = this.propertyList();
    this.sel.clearOptions()
    this.sel.addOption(pl); // FIXME: check if we also need to add the current value
  };

  PropertyBox.prototype.setPropertyURI = function(uri) {
    console.log('PropertyBox.setPropertyURI', uri);
    if(uri) {
      var u = this.options.ontoManager.uriDenormalize(uri);
      if(!this.sel.options[u])
        this.sel.addOption(this.options.ontoManager.OntologyProperty(null, u));
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
