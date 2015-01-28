(function ($) {
    "use strict";

    var PropertyBoxEdit = function (options) {
        this.init('rdfnode', options, PropertyBoxEdit.defaults);
    };
    //inherit from abstract, as inheritance from text gives selection error.
    $.fn.editableutils.inherit(PropertyBoxEdit, $.fn.editabletypes.abstractinput);
    $.extend(PropertyBoxEdit.prototype, {
        render: function() {
          this.$input = this.$tpl.filter('select');
          this.setClass();
          this.$input.propertyBox(this.options.propertyBox);
          // FIXME: find a better way to make this larger than a fixed min-width
          this.$input.propertyBox().sel.$control.css('min-width', '250px');
        },
        activate: function() {
          // do nothing
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
          return this.$input.propertyBox().selectedURI();
        },
        value2input: function(value) {
          this.$input.propertyBox().setPropertyURI(value);
        }
    });
    PropertyBoxEdit.defaults = $.extend({}, $.fn.editabletypes.abstractinput.defaults, {
        propertyBox: {},
        tpl: '<select></select>'
    });
    $.fn.editabletypes.propertyBox = PropertyBoxEdit;
}(window.jQuery));
