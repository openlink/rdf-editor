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
      var node = value;
      var nodeItems;
      if (this.options && this.options.rdfnode) {
        var rdfnode = this.options.rdfnode;
        var ontologyManager = rdfnode.ontologyManager;
        if (ontologyManager) {
          var predicate = ontologyManager.ontologyPropertyByURI(rdfnode.predicate);
          if (predicate) {
            var ranges = predicate.getRange();
            if (ranges && ranges.length) {
              var editor = this.$input.rdfNodeEditor();
              for (var i = 0; i < ranges.length; i++) {
                if (editor.isLiteralType(ranges[i])) {
                  node = new RDFE.RdfNode('literal', value, ranges[i]);
                  break;
                }
              }

              if (!node) {
                nodeItems = self.doc.itemsByRange(ranges);
                if (nodeItems) {
                  node = new RDFE.RdfNode('uri', value);
                }
                else {
                  for (var i = 0; i < ranges.length; i++) {
                    if (editor.isLiteralType(ranges[i])) {
                      node = new RDFE.RdfNode('literal', value, ranges[i]);
                    }
                  }
                }
              }
            }
          }
        }
      }
      if (!node) {
        node = new RDFE.RdfNode('literal', value);
      }
      this.$input.rdfNodeEditor().setValue(node, nodeItems);
    }
  });
  RdfNode.defaults = $.extend({}, $.fn.editabletypes.abstractinput.defaults, {
    rdfnode: {},
    tpl: '<input type="text">'
  });
  $.fn.editabletypes.rdfnode = RdfNode;
}(window.jQuery));
