/*
 *  This file is part of the OpenLink RDF Editor
 *
 *  Copyright (C) 2014-2019 OpenLink Software
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

(function ($, RDFE) {
  var defaults = {
    type: null,
    showLangSelect: true,
    selectize: false,
    create: true
  };

  var intVerify = function(v, includeZero, includeNeg, includePos, maxi, mini) {
    var i = parseInt(v, 10);
    if (isNaN(i))
      return false;

    if (!includeZero && i == 0)
      return false;

    if (!includeNeg && i < 0)
      return false;

    if (!includePos && i > 0)
      return false;

    if (maxi != undefined && i > maxi)
      return false;

    if (mini != undefined && i < mini)
      return false;

    return true;
  };

  var decimalCheck = function(v) {
    return $.isNumeric(v);
  };

  var nodeTypes = {
    'http://www.w3.org/2000/01/rdf-schema#Literal': {
      label: 'Plain Literal'
    },
    'http://www.w3.org/1999/02/22-rdf-syntax-ns#Resource': {
      label: 'Reference'
    },
    "http://www.w3.org/2001/XMLSchema#integer": {
      label: 'Integer',
      verify: function(v) {
        return intVerify(v, true, true, true);
      }
    },
    "http://www.w3.org/2001/XMLSchema#decimal": {
      label: 'Decimal',
      verify: decimalCheck
    },
    "http://www.w3.org/2001/XMLSchema#double": {
      label: 'Double',
      verify: decimalCheck
    },
    "http://www.w3.org/2001/XMLSchema#float": {
      label: 'Float',
      verify: decimalCheck
    },
    "http://www.w3.org/2001/XMLSchema#nonPositiveInteger": {
      label: 'Non-Positive Integer',
      verify: function(v) {
        return intVerify(v, true, true, false);
      }
    },
    "http://www.w3.org/2001/XMLSchema#negativeInteger": {
      label: 'Negative Integer',
      verify: function(v) {
        return intVerify(v, false, true, false);
      }
    },
    "http://www.w3.org/2001/XMLSchema#long": {
      label: 'Long',
      verify: function(v) {
        return intVerify(v, true, true, true);
      }
    },
    "http://www.w3.org/2001/XMLSchema#int": {
      label: 'Int',
      verify: function(v) {
        return intVerify(v, true, true, true, 2147483647, -2147483648);
      }
    },
    "http://www.w3.org/2001/XMLSchema#short": {
      label: 'Short',
      verify: function(v) {
        return intVerify(v, true, true, true, 32767, -32768);
      }
    },
    "http://www.w3.org/2001/XMLSchema#byte": {
      label: 'Byte',
      verify: function(v) {
        return intVerify(v, true, true, true, 127, -128);
      }
    },
    "http://www.w3.org/2001/XMLSchema#nonNegativeInteger": {
      label: 'Non-Negative Integer',
      verify: function(v) {
        return intVerify(v, true, false, true);
      }
    },
    "http://www.w3.org/2001/XMLSchema#unsignedLong": {
      label: 'Unsigned Long',
      verify: function(v) {
        return intVerify(v, true, false, true);
      }
    },
    "http://www.w3.org/2001/XMLSchema#unsignedInt": {
      label: 'Unsigned Int',
      verify: function(v) {
        return intVerify(v, true, false, true, 4294967295);
      }
    },
    "http://www.w3.org/2001/XMLSchema#unsignedShort": {
      label: 'Unsigned Short',
      verify: function(v) {
        return intVerify(v, true, false, true, 65535);
      }
    },
    "http://www.w3.org/2001/XMLSchema#unsignedByte": {
      label: 'Unsigned Byte',
      verify: function(v) {
        return intVerify(v, true, true, true, 255);
      }
    },
    "http://www.w3.org/2001/XMLSchema#positiveInteger": {
      label: 'Positive Integer',
      verify: function(v) {
        return intVerify(v, false, false, true);
      }
    },
    "http://www.w3.org/2001/XMLSchema#boolean": {
      label: 'Boolean',
      setup: function(elem, remove) {
        if (remove) {
          if (elem.bootstrapToggle)
            elem.bootstrapToggle('destroy');

          elem.attr('type', 'text');
        }
        else {
          elem.attr('type', 'checkbox');
          elem.bootstrapToggle({
            on: 'True',
            off: 'False'
          });
        }
      },
      getValue: function(elem) {
        return (elem.is(":checked") ? "true" : "false");
      },
      setValue: function(elem, val) {
        this.setup(elem);
        if (val)
          val = val.toString().toLowerCase();
        if (val === "1" || val === 'true')
          elem.bootstrapToggle('on');
        else
          elem.bootstrapToggle('off');
      }
    },
    "http://www.w3.org/2001/XMLSchema#string": {
      label: 'String'
    },
    "http://www.w3.org/2001/XMLSchema#hexBinary": {
      label: 'Hex Binary'
    },
    "http://www.w3.org/2001/XMLSchema#dateTime": {
      label: 'Datetime',
      setup: function(input, remove) {
        if (remove)
          input.datetimepicker('remove');
        else
          input.datetimepicker({
            format: "yyyy-mm-ddThh:ii:ssZ",
            weekStart: 1,
            timezone: 'Z'
          });
      }
    },
    "http://www.w3.org/2001/XMLSchema#date": {
      label: 'Date',
      setup: function(input, remove) {
        if(remove)
          input.datetimepicker('remove');
        else
          input.datetimepicker({
            format: "yyyy-mm-dd",
            weekStart: 1
          });
      }
    }
  };

  var RdfNodeEditor = function(elem, options) {
    var self = this;

    self.mainElement = elem;
    self.options = $.extend({}, defaults, options);
    self.currentType = self.options.type || 'http://www.w3.org/2000/01/rdf-schema#Literal';

    self.mainElement.on('input', function() {
      self.checkHashSign();
      self.verifyInput();
      self.change();
    });

    // put the input into a div for easier control
    self.container = $(document.createElement('div')).addClass('rdfNodeEditor');
    self.inputContainer = $(document.createElement('div')).addClass('rdfNodeInputContainer');
    var $e = $(elem).addClass('form-control');
    $e.after(self.container);
    self.inputContainer.append($e);
    self.container.append(self.inputContainer);

    // setup choices
    if (self.options.choices) {
      if (typeof(self.options.choices) === 'object') {
        self.selectizeSetup(self.options.choices);
      }
      else if (typeof(self.options.choices) === 'function') {
        self.options.choices(function (items) {
          self.selectizeSetup(items);
        });
      }
      self.updateView(false);
    }

    // create type-selection
    self.typeContainer = $(document.createElement('div')).addClass('rdfNodeTypeContainer');
    self.typeContainer.css('vertical-align', 'top');
    self.typeElement = $(document.createElement('select')).addClass('form-control');
    for (var t in nodeTypes) {
      self.typeElement.append($(document.createElement('option')).attr('value', t).text(nodeTypes[t].label));
    }
    self.typeContainer.append(self.typeElement);
    self.container.append(self.typeContainer);
    var typeChangeFunction = function() {
      self.lastType = self.currentType;
      self.currentType = (self.options.selectize ? self.typeElement[0].selectize.getValue() : self.typeElement.val());
      self.verifyFct = nodeTypes[self.currentType].verify;
      self.updateEditor();
      self.verifyInput();
      self.change();
    };
    if (self.options.selectize) {
      self.typeElement.selectize({
        onChange: typeChangeFunction
      });
      self.typeElement[0].selectize.setValue(this.currentType);
    }
    else {
      self.typeElement.change(typeChangeFunction);
    }
    if (self.options.type) {
      self.typeElement.val(self.options.type);
      self.typeContainer.hide();
    }

    // create language input
    self.languageElement = $(document.createElement('input')).addClass('form-control').attr('placeholder', 'Language');
    self.languageContainer = $(document.createElement('div')).addClass('rdfNodelanguageContainer');
    self.languageContainer.css('vertical-align', 'top');
    self.languageContainer.append(self.languageElement);
    self.container.append(self.languageContainer);
    if ((self.currentType !== 'http://www.w3.org/2000/01/rdf-schema#Literal') || !self.options.showLangSelect) {
      self.languageContainer.hide();
    }
    self.languageElement.on('input', function() {
      self.lang = self.languageElement.val();
      self.verifyInput();
      self.change();
    });

    // de-reference link
    if (self.options["dereferenceLink"]) {
      self.dereferenceLink = $(document.createElement('button'));
      self.dereferenceLink.attr('type', 'button').addClass('btn btn-default btn-sm');
      self.dereferenceLink.html('<i class="glyphicon glyphicon-link"></i>');
      var div = $(document.createElement('div')).addClass('rdfe-reference-link');
      div.append(self.dereferenceLink);
      if (self.mainElement.closest('.editable-input').length) {
        self.container.parent().after(div);
      }
      else {
        self.container.after(div);
      }
      self.dereferenceLink.on('click', function() {
        var uri = self.getValue();
        if (uri) {
          self.options["dereferenceLink"](uri.value);
        }
      });
    }

    self.updateEditor(true);
  };

  RdfNodeEditor.prototype.change = function() {
    $(this).trigger('changed', this);
  };

  RdfNodeEditor.prototype.selectizeSetup = function(nodes) {
    var self = this;

    if (!self.resourceContainer) {
      // resource selection
      self.resourceSelect = $(document.createElement('select'));
      self.resourceSelect.attr('placeholder', 'Select/Enter resource');
      self.resourceContainer = $(document.createElement('div')).addClass('rdfResourceContainer');
      self.resourceContainer.append(self.resourceSelect);
      self.resourceContainer.css('min-width', '200px');
      self.inputContainer.append(self.resourceContainer);
    }
    if (!self.resourceSelectize) {
      self.resourceSelect.selectize({
        "delimiter": null,
        "valueField": "value",
        "searchField": ["label"],
        "sortField": ["label"],
        "lockOptgroupOrder": true,
        "create": function(input, cb) {
          var node = new RDFE.RdfNode('uri', input);

          node.label = input;
          node.optgroup = 'local';
          this.options[input] = node;
          cb(node);
        },
        "createOnBlur": true,
        "onChange": function(value) {
          self.mainElement.val(value);
          self.change();
        },
        "render": {
          "item": function(item, escape) {
            return '<div>' + escape(item.label || item.value) + '</div>';
          },
          "option": function(item, escape) {
            if (item.label)
              return '<div>' + escape(item.label) + ' <small>(' + escape(item.value) + ')</small></div>';

            return '<div>' + escape(item.value) + '</div>';
          },
          "option_create": function(data, escape) {
            var url = data.input;

            url = RDFE.Utils.trim(RDFE.Utils.trim(url, '<'), '>');
            if (url != data.input)
              return '<div class="create">Add <strong>' + escape(data.input) + '</strong> <small>(' + escape(url) + ')</small>&hellip;</div>';

            return '<div class="create">Add <strong>' + escape(url) + '</strong>&hellip;</div>';
          }
        }
      });
      self.resourceSelectize = $(self.resourceSelect)[0].selectize;
    }
    self.resourceSelectize.clearOptions();
    self.resourceSelectize.clearOptionGroups();
    self.resourceSelectize.addOptionGroup('local', {"label": 'Local Store'});
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].optgroup = 'local';
    }
    self.resourceSelectize.addOption(nodes);
  };

  RdfNodeEditor.prototype.updateSelection = function(optionGroup, nodes) {
    var self = this;
    var selectize = self.resourceSelectize;

    if (selectize) {
      selectize.addOptionGroup(optionGroup, {"label": optionGroup});
      for (var i = 0; i < nodes.length; i++) {
        nodes[i].optgroup = optionGroup;
      }
      selectize.addOption(nodes);
      selectize.refreshOptions(true);
    }
  };

  /**
   * Check if two literal types are compatible. The only point of this function is to
   * allow the special case of xsd:string == rdfs:Literal.
   *
   * @return @p true if the given types are compatible, @p false otherwise.
   */
  var checkTypeComp = function() {
    var ta = [
      'http://www.w3.org/2000/01/rdf-schema#Literal',
      'http://www.w3.org/2001/XMLSchema#string'
    ];

    return function(t1, t2) {
      return (t1 === t2 || ($.inArray(t1, ta) >= 0 && $.inArray(t2, ta) >= 0));
    };
  }();

  RdfNodeEditor.prototype.updateEditor = function(initial) {
    // always show the type selection field if the type differs
    // typed string and plain literal without lang should be treated as similar
    var self = this;

    if (checkTypeComp(self.options.type, self.currentType)) {
      self.typeContainer.hide();
    }
    else {
      self.typeContainer.css('display', 'table-cell');
    }

    if (!self.options.showLangSelect || self.currentType !== 'http://www.w3.org/2000/01/rdf-schema#Literal') {
      self.languageContainer.hide();
    }
    else {
      self.languageContainer.css('display', 'table-cell');
    }

    if (initial || self.lastType !== self.currentType) {
      if (self.lastType && nodeTypes[self.lastType].setup) {
        nodeTypes[self.lastType].setup(self.mainElement, true);
      }
      if (nodeTypes[self.currentType].setup) {
        nodeTypes[self.currentType].setup(self.mainElement);
      }
      self.updateView(self.currentType !== 'http://www.w3.org/1999/02/22-rdf-syntax-ns#Resource');
    }
  };

  RdfNodeEditor.prototype.getField = function() {
    var self = this;

    if (self.currentType === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#Resource')
      return self.resourceSelectize;

    return self.mainElement;
  };

  RdfNodeEditor.prototype.getValue = function() {
    if (this.currentType === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#Resource')
      return new RDFE.RdfNode(
        'uri',
        RDFE.Utils.trim(RDFE.Utils.trim(this.mainElement.val(), '<'), '>')
      );
    else
      return new RDFE.RdfNode(
        'literal',
        (nodeTypes[this.currentType].getValue ? nodeTypes[this.currentType].getValue(this.mainElement) : this.mainElement.val()),
        this.currentType,
        (this.lang ? this.lang : undefined)
      );
  };

  RdfNodeEditor.prototype.setValue = function(node, nodeItems) {
    //console.log('RdfNodeEditor.prototype.setValue ', node);
    if (!node)
      return;

    var self = this;
    node = RDFE.RdfNode.fromStoreNode(node);

    self.lastType = self.currentType;
    if ((node.type === 'uri') || self.startsWithHashSign()) {
      self.currentType = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#Resource';
      if (nodeItems) {
        self.selectizeSetup(nodeItems);
        self.updateView(false);
      }
      else {
        self.updateView(true);
      }
    }
    else {
      self.updateView(true);
      self.currentType = node.datatype || 'http://www.w3.org/2000/01/rdf-schema#Literal';

      // special case for boolean where we support 0 and 1 and true and false
      if (self.options.type === "http://www.w3.org/2001/XMLSchema#boolean") {
        var v = node.value.toString();
        if ((v === "0" || v === "1" || v.toLowerCase() === "true" || v.toLowerCase() === "false")) {
          self.currentType = "http://www.w3.org/2001/XMLSchema#boolean";
        }
      }
    }
    self.lang = node.language;
    if (node.value && node.value.indexOf && node.value.indexOf('\n') !== -1) {
      self.transformToTextarea();
    }
    self.mainElement.val(node.value);
    if (self.resourceSelectize) {
      if (RDFE.Utils.trim(node.value, '')) {
        if (!node.optgroup)
          node.optgroup = 'local';

        self.resourceSelectize.addOption(node);
        self.resourceSelectize.setValue(node.value);
      }
    }
    if (nodeTypes[self.currentType] && nodeTypes[self.currentType].setValue) {
      nodeTypes[self.currentType].setValue(self.mainElement, self.mainElement.val());
    }
    self.languageElement.val(self.lang);
    self.typeElement.val(self.currentType);
    if (self.options.selectize) {
      self.typeElement[0].selectize.setValue(self.currentType);
    }
    self.updateEditor(self.lastType !== self.currentType);
    self.lastType = self.currentType;
  };

  RdfNodeEditor.prototype.updateView = function(mode) {
    var self = this;

    if (self.dereferenceLink) {
      if (self.currentType === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#Resource') {
        self.dereferenceLink.show();
      }
      else {
        self.dereferenceLink.hide();
      }
    }
    self.inputContainer.css('width', 'auto');
    if (mode) {
      self.mainElement.show();
      if (self.resourceContainer) {
        self.resourceContainer.hide();
      }
    }
    else {
      if (self.resourceContainer) {
        self.inputContainer.css('width', '50%');
        self.resourceContainer.show();
        self.mainElement.hide();
      }
      else {
        self.mainElement.show();
      }
    }
  };

  RdfNodeEditor.prototype.isValid = function(node) {
    return (this.verifyFct ? this.verifyFct(this.mainElement.val()) : true);
  };

  RdfNodeEditor.prototype.startsWithHashSign = function() {
    var self = this;

    if (self.options.startHashSignAsResource === true) {
      var val = RDFE.Utils.trim($(self.mainElement).val());
      return (val.length >= 1) && (val.charAt(0) === '#');
    }

    return false;
  };

  RdfNodeEditor.prototype.checkHashSign = function() {
    var self = this;

    if (self.startsWithHashSign()) {
      var typeVal = self.options.selectize ? self.typeElement[0].selectize.getValue() : self.typeElement.val();
      if (typeVal !== 'http://www.w3.org/1999/02/22-rdf-syntax-ns#Resource') {
        if (self.options.selectize) {
         self.typeElement[0].selectize.setValue('http://www.w3.org/1999/02/22-rdf-syntax-ns#Resource');
         self.typeElement[0].selectize.onChange();
        }
        else {
          self.typeElement.val('http://www.w3.org/1999/02/22-rdf-syntax-ns#Resource');
          self.typeElement.change();
        }
      }
    }
  };

  RdfNodeEditor.prototype.verifyInput = function() {
    var self = this;
    var val = $(self.mainElement).val();
    var v = true;

    if (val.length > 0) {
      v = (self.verifyFct ? self.verifyFct(val) : true);
    }
    if (v) {
      self.mainElement.removeClass('has-error');
    }
    else {
      self.mainElement.addClass('has-error');
    }
  };

  RdfNodeEditor.prototype.isLiteralType = function(uri) {
    return nodeTypes.hasOwnProperty(uri) && uri != 'http://www.w3.org/1999/02/22-rdf-syntax-ns#Resource';
  };

  RdfNodeEditor.prototype.setEditFocus = function() {
    if (this.getField())
      this.getField().focus();
  };

  RdfNodeEditor.prototype.blur = function() {
    this.getField().blur();
  };

  RdfNodeEditor.prototype.getElement = function() {
    return this.container;
  };

  RdfNodeEditor.prototype.transformToTextarea = function() {
    var self = this;

    if ((self.mainElement.prop("tagName") === 'INPUT') && (self.mainElement.prop("type") === 'text')) {
      var textArea = document.createElement('textarea');

      // Make sure all properties are transferred to the new object
      textArea.id    = self.mainElement.prop("id");
      textArea.name  = self.mainElement.prop("name");
      textArea.value = self.mainElement.val();
      $(textArea).addClass(self.mainElement.prop("class"));

      // Make the switch!
      self.mainElement.replaceWith(textArea);
      self.mainElement = $(textArea);
    }
  };

  $.fn.rdfNodeEditor = function(methodOrOptions) {
    var le = this.data('rdfNodeEditor');
    if (!le) {
      le = new RdfNodeEditor(this, methodOrOptions);
      this.data('rdfNodeEditor', le);
    }
    return le;
  };
})(window.jQuery, RDFE);
