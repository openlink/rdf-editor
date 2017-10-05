/*
 *  This file is part of the OpenLink RDF Editor
 *
 *  Copyright (C) 2014-2017 OpenLink Software
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
