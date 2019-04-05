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

Backbone.Form.editors.Rdfnode = Backbone.Form.editors.Base.extend({

  tagName: 'input',

  events: {
    'change': function() {
        // The 'change' event should be triggered whenever something happens
        // that affects the result of `this.getValue()`.
        this.trigger('change', this);
    },
    'focus': function() {
        // The 'focus' event should be triggered whenever an input within
        // this editor becomes the `document.activeElement`.
        this.trigger('focus', this);
        // This call automatically sets `this.hasFocus` to `true`.
    },
    'blur': function() {
        // The 'blur' event should be triggered whenever an input within
        // this editor stops being the `document.activeElement`.
        this.trigger('blur', this);
        // This call automatically sets `this.hasFocus` to `false`.
    },
    'keyup': function(e, x) {
        if (e.keyCode == 13 && e.shiftKey) {
          console.log('shift+enter');
          if (this.editor) {
            this.editor.transformToTextarea();
          }
          e.stopPropagation();
        }
        this.trigger('keyup', this);
    }
  },

  initialize: function(options) {
    // Call parent constructor
    Backbone.Form.editors.Base.prototype.initialize.call(this, options);
  },

  render: function() {
    var self = this;

    this.$el.attr('type', 'text');
    this.$el.rdfNodeEditor(this.schema.rdfnode);
    self.editor = this.$el.rdfNodeEditor();
    self.setElement(self.editor.getElement());

    $(this.editor).on('change', function() {
      self.trigger('change', this);
    });

    this.setValue(this.value);

    return this;
  },

  getValue: function() {
    return this.editor.getValue();
  },

  setValue: function(value) {
    this.editor.setValue(value);
  },

  focus: function() {
    if (this.hasFocus) return;

    // This method call should result in an input within this editor
    // becoming the `document.activeElement`.
    // This, in turn, should result in this editor's `focus` event
    // being triggered, setting `this.hasFocus` to `true`.
    // See above for more detail.
    this.editor.setEditFocus();
  },

  blur: function() {
    if (!this.hasFocus) return;

    this.editor.blur();
  }
});
