if(!window.RDFE)
  window.RDFE = {};

/*
 *
 * Config class
 *
 */
RDFE.Config = function(source, callback) {
  var self = this;
  this.options = RDFE.Config.defaults;

  if (source) {
    $.ajax({
      url: source,
      type: 'GET',
      dataType: 'json',
      success: (function(callback) {
        return function(data) {
          self.options.ontology = $.extend(self.options.ontology, data.ontology);

          // Templates options
          self.options.templates = $.extend(self.options.templates, data.templates);

          // Bookmarks options
          self.options.bookmarks = $.extend(self.options.bookmarks, data.bookmarks);

          // Editor options
          if (data.actions)
            self.options.actions = data.actions;

          if(data.labelProps)
            self.options.labelProps = data.labelProps;

          if(!data.labelProps || data.labelProps.length == 0)
            data.labelProps = RDFE.Config.defaults.labelProps;

          if(data.defaultView)
            self.options.defaultView = data.defaultView;

          if (callback) callback(self);
        };
      })(callback),
      error: function(jqXHR, textStatus, errorThrown) {
        console.error('config load =>', errorThrown);
      }
    });
  }
};

RDFE.Config.defaults = {
  // configuration related to the ontology manager
  ontology: {
    proxy: false,
    forceLoad: false,
    preloadOnly: false
  },

  // configuration related to the class templates
  templates: {
  },

  // a set of bookmarks which can be loaded from the "bookmarks" action
  bookmarks: [],

  // actions to enable in the UI
  actions: [
    'new',
    'open',
    'save',
    'saveAs',
    'bookmarks',
    'entities',
    'triples'
  ],

  // the properties to use (in order) for fetching resource, class, and property labels
  labelProps: [
    'http://www.w3.org/2004/02/skos/core#prefLabel',
    'http://www.w3.org/2000/01/rdf-schema#'
  ],

  // the default view that opens on start ("entities" or "triples")
  defaultView: "entities"
};
