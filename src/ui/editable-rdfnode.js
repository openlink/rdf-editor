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
      var node;
      var nodeItems;
      var editor = this.$input.rdfNodeEditor();
      var getValue = function() {
        if (value instanceof RDFE.RdfNode) {
          return value.value;
        }
        return value;
      };

      if (value instanceof RDFE.RdfNode) {
        node = value;
      }
      if (!node || (node && node.type === 'uri')) {
        if (this.options && this.options.rdfnode) {
          var rdfnode = this.options.rdfnode;
          var ontologyManager = rdfnode.ontologyManager;
          if (ontologyManager) {
            var predicate = ontologyManager.ontologyPropertyByURI(rdfnode.predicate);
            if (predicate) {
              var ranges = predicate.getRange();
              if (ranges && ranges.length) {
                for (var i = 0; i < ranges.length; i++) {
                  if (editor.isLiteralType(ranges[i])) {
                    node = new RDFE.RdfNode('literal', getValue(), ranges[i]);
                    break;
                  }
                }

                if (!node || (node && node.type === 'uri')) {
                  nodeItems = rdfnode.document.itemsByRange(ranges);
                  if (nodeItems) {
                    node = new RDFE.RdfNode('uri', getValue());
                  }
                  else {
                    for (var i = 0; i < ranges.length; i++) {
                      if (editor.isLiteralType(ranges[i])) {
                        node = new RDFE.RdfNode('literal', getValue(), ranges[i]);
                        break;
                      }
                    }
                  }
                }
              }
            }
          }
        }
        if (!node) {
          if (this.options && this.options.rdfnode && this.options.rdfnode.type === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#Resource') {
            node = new RDFE.RdfNode('uri', getValue(), 'http://www.w3.org/1999/02/22-rdf-syntax-ns#Resource');
          }
          else {
            node = new RDFE.RdfNode('literal', getValue(), this.options.rdfnode.type);
          }
        }
      }
      editor.setValue(node, nodeItems);
    }
  });
  RdfNode.defaults = $.extend({}, $.fn.editabletypes.abstractinput.defaults, {
    rdfnode: {},
    tpl: '<input type="text">'
  });
  $.fn.editabletypes.rdfnode = RdfNode;
}(window.jQuery));
