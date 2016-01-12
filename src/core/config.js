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

if(!window.RDFE)
  window.RDFE = {};

/*
 *
 * Config class
 *
 */
RDFE.Config = function(source, callback, fail) {
  var self = this;
  this.options = RDFE.Config.defaults;

  if (source) {
    $.ajax({
      url: source,
      type: 'GET',
      dataType: 'json',
      success: (function(callback) {
        return function(data) {
          self.options = $.extend(self.options, data);

          self.options.ontology = $.extend(RDFE.Config.defaults.ontology, data.ontology);

          if(!self.options.labelProps || self.options.labelProps.length == 0)
            self.options.labelProps = RDFE.Config.defaults.labelProps;

          if (callback) callback(self);
        };
      })(callback),
      error: function(jqXHR, textStatus, errorThrown) {
        console.error('config load =>', errorThrown);
        if(fail) {
          fail();
        }
      }
    });
  }
};

RDFE.Config.defaults = {
  // configuration related to the ontology manager
  ontology: {
    proxy: false,
    nonTTLProxy: true,
    fresnelLenses: true,
    fresnelFormats: true,
    fresnelGroups: true,
    forceLoad: false,
    preloadOnly: false
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
  defaultView: "entities",

  sparqlEndpoint: window.location.protocol + '//' + window.location.host + '/sparql',

  gspEndpoint: window.location.protocol + '//' + window.location.host + '/sparql-graph-crud',

  prefixes: {
  },

  // the template used to create new entity uris. This can contain two variables:
  // - {NAME} which is replaced with the entity name/label
  // - {DOC-URI} which is replaced with the document URI
  // If no variable is included then the entity name will be appended as a fragment
  //
  // Examples:
  // - {DOC-URI}#{NAME}
  // - urn:test:{NAME}
  entityUriTmpl: "{DOC-URI}#{NAME}",

  // if true then the editor will take owl:inverseOf into account and create or delete the values properly
  autoInverseOfHandling: false,

  // A list of entity type URIs which when set will be used to filter the entity view
  entityTypesFiler: null,

  "namingSchema": "eavSchema",
  "eavSchema": {
    "spo": ["Statement", "Statements"],
    "s": ["Entity", "Entities"],
    "p": ["Attribute", "Attributes"],
    "o": ["Value", "Values"]
  },
  "spoSchema": {
    "spo": ["Triple", "Triples"],
    "s": ["Subject", "Subjects"],
    "p": ["Predicate", "Predicates"],
    "o": ["Object", "Objects"]
  },

  // If true, then the entity editor with template and OWL restriction support is used to edit entities
  useEntityEditor: false,

  maxLabelLength: 0
};
