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

    c.prototype.render = function(container, url, closeCb) {
      var self = this;
      var model = new RDFE.Document.Model();
      model.setEntity(this.doc, url);
      model.docToModel(this.ontologyManager, function() {
        var form = new Backbone.Form({
          "model": model
        });
        form.render();

        container.empty();

        // add a header to the form using the entity's label
        container.append('<h4>Editing <a href="' + url + '"><span class="entity-label">' + url.split(/[/#]/).pop() + '<span></a></h4><hr/>');
        self.doc.getEntityLabel(url, function(label) {
          container.find('h4 span').text(label);
        });

        // add the newly created form to the container
        container.append(form.el);

        // create buttons for the form
        var cancelBtn = $(document.createElement('button'));
        var saveBtn = $(document.createElement('button'));
        cancelBtn.addClass('btn').addClass('btn-default').addClass('pull-right').text('Cancel');
        saveBtn.addClass('btn').addClass('btn-primary').addClass('pull-right').text('OK');
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

        // add the buttons to the container
        container.find('h4').append(saveBtn).append(cancelBtn);
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
