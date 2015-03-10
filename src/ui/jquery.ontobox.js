(function ($) {

  var OntoBox = function(elem, options) {
    var self = this;

    self.options = $.extend({}, options);
    self.options.ontoManager = self.options.ontoManager || new RDFE.OntologyManager();

    self.mainElem = elem;

    $(self.options.ontoManager).on('changed', function(e, om) {
      self.sel.addOption(om.allOntologies());
    });

    $(self.mainElem).selectize({
      valueField: "URI",
      searchField: [ "title", "label", "prefix", "URI" ],
      sortField: [ "prefix", "URI" ],
      options: self.options.ontoManager.ontologies,
      onChange: function(value) {
        $(self).trigger('changed', self.options.ontoManager.ontologyByURI(value));
      },
      createOntology: function(input, create) {
        return self.options.ontoManager.ontologyByURI(self.options.ontoManager.ontologyDetermine(input), create);
      },
      create: function(input, cb) {
        var that = this;
        var url = self.options.ontoManager.ontologyDetermine(input);
        if (!url) {
          url = self.options.ontoManager.prefixes[input] || input;
        }
        self.options.ontoManager.parseOntologyFile(url, {
          "success": function() {
            cb(that.settings.createOntology(input, true));
          },
          "error": function(state) {
            if (state && state.message) {
              $.growl({message: state.message}, {type: 'danger'});
            }
            cb(that.settings.createOntology(input, true));
          }
        });
      },
      render: {
        item: function(item, escape) {
          return '<div>' + escape(item.title || item.label || item.prefix || item.URI) + '</div>';
        },
        option: function(item, escape) {
          return '<div>' + escape(item.title || item.label || item.prefix || item.URI) + '<br/><small>(' + escape(item.URI) + ')</small></div>';
        },
        'option_create': function(data, escape) {
          var url = self.options.ontoManager.prefixes[data.input] || data.input;
          if (url != data.input)
            return '<div class="create">Load <strong>' + escape(data.input) + '</strong> <small>(' + escape(url) + ')</small>&hellip;</div>';
          else
            return '<div class="create">Load <strong>' + escape(url) + '</strong>&hellip;</div>';
        }
      }
    });

    self.sel = $(self.mainElem)[0].selectize;
  };

  OntoBox.prototype.selectedOntologyURI = function() {
    return this.sel.getValue();
  };

  OntoBox.prototype.selectedOntology = function() {
    return this.sel.options[this.selectedOntologyURI()];
  };

  OntoBox.prototype.on = function(e, cb) {
    $(this).on(e, cb);
  };

  $.fn.ontoBox = function(methodOrOptions) {
    var le = this.data('ontoBox');
    if(!le) {
      le = new OntoBox(this, methodOrOptions);
      this.data('ontoBox', le);
    }
    return le;
  };
})(jQuery);
