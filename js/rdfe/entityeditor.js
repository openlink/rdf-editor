(function($) {
  if (!window.RDFE) {
    window.RDFE = {};
  }

  RDFE.EntityEditor = (function() {
    // constructor
    var c = function(doc, ontoMan) {
      this.doc = doc;
      this.ontologyManager = ontoMan;
    };

    // custom form which allows adding new properties
    var EntityForm = Backbone.Form.extend({
      // Add a "new property" button to the default Backbone-Forms form
      template: _.template('\
        <form class="form-horizontal clearfix" role="form">\
          <div data-fieldsets></div>\
          <% if (submitButton) { %>\
            <button type="submit" class="btn"><%= submitButton %></button>\
          <% } %>\
          <a href="#" class="btn btn-default pull-right addProp">Add Property</a>\
        </form>\
      '),

      render: function() {
        Backbone.Form.prototype.render.call(this);

        // we only want to find our own button, not the ones from nested forms
        var self = this;
        this.$el.find('> a.addProp').click(function(e) {
          e.preventDefault();

          // open the new property editor
          var ps = $(document.createElement('select')),
              addBtn = $(document.createElement('button')).addClass('btn').addClass('btn-default').text('Add'),
              cnclBtn = $(document.createElement('button')).addClass('btn').addClass('btn-default').text('Cancel');

          var c = $(document.createElement('div'))
            .append($(document.createElement('span')).text('New Property:'))
            .append(ps)
            .append(addBtn)
            .append(cnclBtn);

          ps = ps.propertyBox({
            "ontoManager": self.model.doc.ontologyManager
          });

          cnclBtn.click(function(e) {
            e.preventDefault();
            c.remove();
          });
          addBtn.click(function(e) {
            e.preventDefault();
            if(ps.selectedURI()) {
              console.log('Adding new property', ps.selectedURI(), 'to form', self);

              // commit the changes to the model
              self.commit();

              // add the new property
              self.model.addSchemaEntryForProperty(ps.selectedProperty());
              self.model.fields.push(ps.selectedURI());

              // update the form's state. We need to reset the fieldsets to force Backbone.Form to re-create them
              self.fieldsets = undefined;
              self.initialize(self.options);

              // remove the add property form
              c.remove();

              // rebuild ui
              var container = self.$el.parent();
              self.$el.remove();
              self.render();
              console.log(container, self.$el)
              container.append(self.$el);
            }
            else {
              console.log('No prop selected')
            }
          });

          self.$el.append(c);
        });

        return this;
      }
    });

    c.prototype.template = _.template('<div class="panel panel-default">\
        <div class="panel-heading clearfix">\
          <h3 class="panel-title pull-left">Editing <a href="<%= entityUri %>"><span class="entity-label"><%= entityLabel %><span></a></h3>\
          <div class="btn-group pull-right" role="group">\
            <button type="button" class="btn btn-primary" id="okBtn">OK</button>\
            <button type="button" class="btn btn-default" id="cnclBtn">Cancel</button>\
          </div>\
        </div>\
        <div class="panel-body" id="entityFormContainer">\
        </div>\
      </div>');

    c.prototype.render = function(container, url, closeCb) {
      var self = this;
      var model = new RDFE.EntityModel();
      model.setEntity(this.doc, url);
      model.docToModel(function() {
        var form = new EntityForm({
          "model": model
        });
        form.render();

        container.empty();

        // create the basic entity editor layout using the template above
        container.append(self.template({
          entityUri: url,
          entityLabel: url.split(/[/#]/).pop()
        }));
        self.doc.getEntityLabel(url, function(label) {
          container.find('.entity-label').text(label);
        });

        // add the newly created form to the container
        container.find('#entityFormContainer').append(form.el);

        // add click handlers to our buttons
        var cancelBtn = container.find('button#cnclBtn');
        var saveBtn = container.find('button#okBtn');
        cancelBtn.click(function() {
          closeCb();
        });
        saveBtn.click(function() {
          form.commit();
          model.modelToDoc(function() {
            closeCb();
          }, function(msg) {
            $(self).trigger('rdf-editor-error', {
              "type": 'editor-form-save-failed',
              "message": msg
            });
          });
        });
      }, function(msg) {
        $(self).trigger('rdf-editor-error', {
          "type": 'editor-form-creation-failed',
          "message": msg
        });
      });
    };

    return c;
  })();
})(jQuery);
