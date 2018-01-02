/*
 *  This file is part of the OpenLink RDF Editor
 *
 *  Copyright (C) 2014-2018 OpenLink Software
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

/**
 * NestedRdf editor
 *
 * Creates a child form. For editing nested Backbone models
 *
 * Special options:
 *   schema.model:   Embedded model constructor
 */

Backbone.Form.editors.NestedRdf = Backbone.Form.editors.Object.extend({
  initialize: function(options) {
    Backbone.Form.editors.Base.prototype.initialize.call(this, options);

    if (!this.form) throw new Error('Missing required option "form"');
    if (!options.schema.model) throw new Error('Missing required "schema.model" option for NestedRdf editor');
  },

  render: function() {
    //Get the constructor for creating the nested form; i.e. the same constructor as used by the parent form
    var NestedForm = this.form.constructor;

    var data = this.value,
        key = this.key,
        nestedModel = this.schema.model;

    //Wrap the data in a model if it isn't already a model instance
    var modelInstance = data ? data : new nestedModel();

    this.nestedForm = new NestedForm({
      model: modelInstance,
      idPrefix: this.id + '_',
      fieldTemplate: 'nestedField'
    });

    this._observeFormEvents();

    //Render form
    this.$el.html(this.nestedForm.render().el);

    if (this.hasFocus) this.trigger('blur', this);

    return this;
  },

  getValue: function() {
    var v = this.nestedForm.getValue();
    if(this.nestedForm.model.defaults) {
      // we only merge defaults if there is any value at all
      var haveVal = false;
      for(var p in v) {
        if(v[p]) {
          for(var i = 0; i < v[p].length; i++) {
            if(v[p][i].value) {
              haveVal = true;
              break;
            }
          }
        }
      }
      if(haveVal) {
        v = _.extend({}, this.nestedForm.model.defaults, v);
      }
    }

    return {
      "uri": this.nestedForm.model.uri,
      "values": v
    };
  }

});
