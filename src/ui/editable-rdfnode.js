(function ($) {
  "use strict";

  var RdfNode = function (options) {
    this.init('rdfnode', options, RdfNode.defaults);
  };
  //inherit from abstract, as inheritance from text gives selection error.
  $.fn.editableutils.inherit(RdfNode, $.fn.editabletypes.abstractinput);
  $.extend(RdfNode.prototype, {
    render: function() {
      this.$input = this.$tpl.filter('input');
      this.setClass();
      this.$input.rdfNodeEditor(this.options.rdfnode);
    },
    activate: function() {
      this.$input.rdfNodeEditor().setEditFocus();
    },
    value2html: function(value, element) {
      if (!value) {
        $(element).empty();
        return;
      }
      $(element).text(value.toString());
    },
    html2value: function(html) {
      return null;
    },
    input2value: function() {
      return this.$input.rdfNodeEditor().getValue();
    },
    value2input: function(value) {
      var nodeItems;
      if (this.options && this.options.rdfnode) {
        var rdfnode = this.options.rdfnode;
        var ontologyManager = rdfnode.ontologyManager;
        if (ontologyManager) {
          var predicate = ontologyManager.ontologyPropertyByURI(rdfnode.predicate);
          var range = predicate.getRange();
          if (ontologyManager.ontologyClassByURI(range)) {
            nodeItems = rdfnode.document.itemsByRange(range);
          }
        }
      }
      this.$input.rdfNodeEditor().setValue(value, nodeItems);
    }
  });
  RdfNode.defaults = $.extend({}, $.fn.editabletypes.abstractinput.defaults, {
    rdfnode: {},
    tpl: '<input type="text">'
  });
  $.fn.editabletypes.rdfnode = RdfNode;
}(window.jQuery));
