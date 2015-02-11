(function ($) {

  var OntoBox = function(elem, options) {
    var self = this;

    self.options = $.extend({}, options);
    self.options.ontoManager = self.options.ontoManager || new RDFE.OntologyManager();

    self.mainElem = elem;

    $(ontologyManager).on('changed', function(e, om) {
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
      create: function(input, cb) {
        var url = self.options.ontoManager.ontologyDetermine(input);
        if (!url) {
          url = self.options.ontoManager.prefixes[input] || input;
        }
        self.options.ontoManager.ontologyParse(url, {
          "success": function(onto) {
            cb(onto);
          },
          "error": function() {
            cb(null);
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
