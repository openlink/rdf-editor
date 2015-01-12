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
          this.$input.literalEditor(this.options.rdfnode);
        },
        activate: function() {
          this.$input.literalEditor().setEditFocus();
        },
        value2html: function(value, element) {
          if(!value) {
              $(element).empty();
              return;
          }
          $(element).text(value.toString());
        },
        html2value: function(html) {
          return null;
        },
        input2value: function() {
          return this.$input.literalEditor().getValue();
        },
        value2input: function(value) {
          this.$input.literalEditor().setValue(value);
        }
    });
    RdfNode.defaults = $.extend({}, $.fn.editabletypes.abstractinput.defaults, {
        tpl: '<input type="text">'
    });
    $.fn.editabletypes.rdfnode = RdfNode;
}(window.jQuery));
