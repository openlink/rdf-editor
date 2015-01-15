if (!RDFE) RDFE = {};

/*
 *
 * Config class
 *
 */
RDFE.Config = function(source, callback) {
  var self = this;
  this.options = {};

  // defaults
  this.options.Ontology = {};
  this.options.Ontology.proxy = false;

  this.options.Templates = {};

  this.options.Bookmarks = {};

  this.options.Actions = [ 'open', 'save', 'saveAs' ];

  if (source) {
    $.ajax({
      url: source,
      type: 'GET',
      dataType: 'json',
      success: (function(callback) {
        return function(data) {
          self.options.Ontology = $.extend(self.options.Ontology, data.Ontology);

          // Templates options
          self.options.Templates = $.extend(self.options.Templates, data.Templates);

          // Bookmarks options
          self.options.Bookmarks = $.extend(self.options.Bookmarks, data.bookmarks);

          // Editor options
          if (data.Actions) {
            self.options.Actions = data.Actions;
          }
          if (callback) {
            callback(self);
          }
        };
      })(callback),
      error: function(jqXHR, textStatus, errorThrown) {
        console.error('config load =>', errorThrown);
      }
    });
  }
}
