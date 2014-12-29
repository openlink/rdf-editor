/*
 *
 *  This file is part of the OpenLink Software Virtuoso Open-Source (VOS)
 *  project.
 *
 *  Copyright (C) 1998-2014 OpenLink Software
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
RDFE.OM_LOAD_TEMPLATE =
    '{0}';

RDFE.OM_LOAD_PROXY_TEMPLATE =
    document.location.protocol + '//' + document.location.host + '/proxy?url={0}&output-format=turtle&force=rdf';

RDFE.OM_PREFIX_TEMPLATE =
    'http://prefix.cc/{0}.file.json';

RDFE.OM_ONTOLOGY_TEMPLATE =
    '\n PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> ' +
    '\n PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> ' +
    '\n PREFIX owl: <http://www.w3.org/2002/07/owl#> ' +
    '\n SELECT distinct ?o ' +
    '\n   FROM <{0}> ' +
    '\n  WHERE { ' +
    '\n          ?o a owl:Ontology . ' +
    '\n        } ' +
    '\n  ORDER BY ?c'
;

RDFE.OM_ONTOLOGY_CLASSES_TEMPLATE =
    '\n PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> ' +
    '\n PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> ' +
    '\n PREFIX owl: <http://www.w3.org/2002/07/owl#> ' +
    '\n SELECT distinct ?c ' +
    '\n   FROM <{0}> ' +
    '\n  WHERE { ' +
    '\n          { ' +
    '\n            ?c a owl:Class . ' +
    '\n          } ' +
    '\n          union' +
    '\n          { ' +
    '\n            ?c a rdfs:Class . ' +
    '\n          } ' +
    '\n          ?c rdfs:isDefinedBy <{1}> . ' +
    '\n        } ' +
    '\n  ORDER BY ?c'
;

RDFE.OM_ONTOLOGY_PROPERTIES_TEMPLATE =
    '\n PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> ' +
    '\n PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> ' +
    '\n PREFIX owl: <http://www.w3.org/2002/07/owl#> ' +
    '\n SELECT distinct ?p' +
    '\n   FROM <{0}>' +
    '\n  WHERE {' +
    '\n          {' +
    '\n            ?p a owl:ObjectProperty' +
    '\n          }' +
    '\n          union' +
    '\n          {' +
    '\n            ?p a owl:DatatypeProperty' +
    '\n          }' +
    '\n          union' +
    '\n          {' +
    '\n            ?p a rdf:Property' +
    '\n          } .' +
    '\n          ?p rdfs:isDefinedBy <{1}> . ' +
    '\n        } ' +
    '\n  ORDER BY ?p'
;

RDFE.OM_ONTOLOGY_INDIVIDUALS_TEMPLATE =
    '\n PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> ' +
    '\n PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> ' +
    '\n PREFIX owl: <http://www.w3.org/2002/07/owl#> ' +
    '\n SELECT distinct ?i ' +
    '\n   FROM <{0}> ' +
    '\n  WHERE { ' +
    '\n          ?i a <{1}> . ' +
    '\n        } ' +
    '\n  ORDER BY ?i'
;

RDFE.prefixes = {};
RDFE.prefixes['annotation'] = 'http://www.w3.org/2000/10/annotation-ns#';
RDFE.prefixes['atom'] = 'http://atomowl.org/ontologies/atomrdf#';
RDFE.prefixes['book'] = 'http://purl.org/NET/book/vocab#';
RDFE.prefixes['cc'] = 'http://web.resource.org/cc/';
RDFE.prefixes['dataview'] = 'http://www.w3.org/2003/g/data-view#';
RDFE.prefixes['dc'] = 'http://purl.org/dc/elements/1.1/';
RDFE.prefixes['dcterms'] = 'http://purl.org/dc/terms/';
RDFE.prefixes['foaf'] = 'http://xmlns.com/foaf/0.1/';
RDFE.prefixes['geo'] = 'http://www.w3.org/2003/01/geo/wgs84_pos#';
RDFE.prefixes['gr'] = 'http://purl.org/goodrelations/v1#';
RDFE.prefixes['ibis'] = 'http://purl.org/ibis#';
RDFE.prefixes['ical'] = 'http://www.w3.org/2002/12/cal/icaltzd#';
RDFE.prefixes['like'] = 'http://ontologi.es/like#';
RDFE.prefixes['mo'] = 'http://purl.org/ontology/mo/';
RDFE.prefixes['owl'] = 'http://www.w3.org/2002/07/owl#';
RDFE.prefixes['rdf'] = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
RDFE.prefixes['rdfs'] = 'http://www.w3.org/2000/01/rdf-schema#';
RDFE.prefixes['rev'] = 'http://purl.org/stuff/rev#';
RDFE.prefixes['rss'] = 'http://purl.org/rss/1.0/';
RDFE.prefixes['scot'] = 'http://scot-project.org/scot/ns';
RDFE.prefixes['sioc'] = 'http://rdfs.org/sioc/ns#';
RDFE.prefixes['sioct'] = 'http://rdfs.org/sioc/types#';
RDFE.prefixes['skos'] = 'http://www.w3.org/2008/05/skos#';
RDFE.prefixes['vs'] = 'http://www.w3.org/2003/06/sw-vocab-status/ns#';
RDFE.prefixes['wot'] = 'http://xmlns.com/wot/0.1/';
RDFE.prefixes['xhtml'] = 'http://www.w3.org/1999/xhtml';
RDFE.prefixes['xsd'] = 'http://www.w3.org/2001/XMLSchema#';

/*
 *
 * Debug function - dump graph
 *   - example: RDFE.graphDebug(ontologyManager.store, 'test/test.ttl')
 *
 */
RDFE.graphDebug = function(store, g) {
  var __DEBUG = 'SELECT distinct * FROM <{0}> WHERE { ?s ?p ?o} ';
  var sparql = __DEBUG.format(g);
  store.execute(sparql, function(success, results) {
      if (success) {
          console.log('--- start ---');
          for (var i = 0; i < results.length; i++) {
              console.log(results[i]["s"].value, results[i]["p"].value, results[i]["o"].value);
          }
          console.log('--- end ---');
      } else {
          alert(results);
      }
  });
}

/*
 *
 * Debug function - dump subject in the graph
 *   - example: RDFE.graphSubjectDebug(ontologyManager.store, 'http://www.w3.org/ns/auth/acl#', 'http://www.w3.org/ns/auth/acl#Append')
 *
 */
RDFE.graphSubjectDebug = function(store, g, s) {
  var __DEBUG = 'SELECT distinct * FROM <{0}> WHERE { <{1}> ?p ?o} ';
  var sparql = __DEBUG.format(g, s);
  store.execute(sparql, function(success, results) {
      if (success) {
          for (var i = 0; i < results.length; i++) {
              console.log(i, '=>', s, results[i]["p"].value, results[i]["o"].value);
          }
      } else {
          alert(results);
      }
  });
}

RDFE.sparqlValue = function(v)
{
  if (!v) return null;

  return v.value;
}

RDFE.coalesce = function(a, b)
{
  if (a) return a;

  return b;
}

/*
 *
 * Extract a prefix
 *
 */
RDFE.prefix = function(v)
{
    var m = Math.max(v.lastIndexOf(':'), v.lastIndexOf('/'), v.lastIndexOf('#'))
    if ((m != -1) && (m == v.lastIndexOf(':')))
        return v.substring(0, m);

    return null;
}

/*
 *
 * Find ontology by prefix
 *
 */
RDFE.ontologyByPrefix = function(prefix)
{
  var host = RDFE.OM_PREFIX_TEMPLATE.format(prefix);
  $.ajax({
      url: host,
      type: 'GET',
      async: false
  }).done(function(data) {
      RDFE.prefixes[prefix] = data[prefix];
  });
}

RDFE.denormalize = function(v)
{
  var prefix = RDFE.prefix(v);
  if (!prefix)
      return v;

  if (!RDFE.prefixes[prefix])
      RDFE.ontologyByPrefix(prefix);

  if (RDFE.prefixes[prefix])
      return RDFE.prefixes[prefix] + v.substring(prefix.length+1);

  return v;
}

/*
 *
 * Return all triplets related to the subject
 *   - example: RDFE.nodeQuery(ontologyManager.store, 'http://mitko.dnsalias.net:8005/DAV/home/demo/Public/test.ttl', '_:40')
 *
 */
RDFE.nodeQuery = function(store, graph, subject, properties, callback)
{
  store.node(subject, graph, function(success, results) {
      if (success) {
          var returns = {};
          for (var i = 0; i < results.length; i++) {
              var p = results.triples[i].predicate.valueOf();
              var o = results.triples[i].object.valueOf();
              if (properties) {
                  for (var j = 0; j < properties.length; j++) {
                      if (p == RDFE.denormalize(properties[j])) {
                          if (!returns[properties[j]]) {
                              returns[properties[j]] = o;
                          }
                      }
                  }
              } else {
                returns[RDFE.normalize(p)] = o;
              }
          }
          results = returns;
      }
      if (callback)
          callback(success, results);
  });
}

/*
 *
 * Return all objects related to the collection
 *   - RDFE.collectionQuery(ontologyManager.store, 'test/test2.ttl', 'http://xmlns.com/foaf/0.1/status', 'rdfs:domain', '_:47')
 *
 */
var RDFE_COLLECTION_TEMPLATE =
    '\n PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> ' +
    '\n PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> ' +
    '\n PREFIX owl: <http://www.w3.org/2002/07/owl#> ' +
    '\n SELECT distinct ?item ' +
    '\n   FROM <{0}> ' +
    '\n  WHERE { ' +
    '\n          <{1}> {2}/owl:unionOf/{3}rdf:first ?item. ' +
    '\n        } '
;

RDFE.collectionQuery = function(store, graph, s, p, o)
{
    // check for special blank node
    if (!o.match(/^\_\:*/))
        return [o];

    var size;
    var items = [];
    var rest = '';
    while (true) {
        size = items.length;
        var sparql = RDFE_COLLECTION_TEMPLATE.format(graph, s, p, rest);
        store.execute(sparql, (
            function (items) {
                return function(success, results) {
                    if (!success) {
                        alert(results);
                    } else {
                        for (var i = 0; i < results.length; i++) {
                            items.push(RDFE.sparqlValue(results[i]["item"]));
                        }
                    }
                };
            }) (items)
        );
        if (size == items.length)
            break;

        rest += 'rdf:rest/';
    }
    return items;
}

/*
 *
 * Ontology Manager
 *
 */
RDFE.Config = function(source, callback) {

  RDFE.Options = {};

  // RDFE.OontologyManager options
  RDFE.Options.OntologyManager = {};

  RDFE.Options.OntologyManager.OM_LOAD_TEMPLATE = RDFE.OM_LOAD_TEMPLATE;
  RDFE.Options.OntologyManager.OM_LOAD_PROXY_TEMPLATE = RDFE.OM_LOAD_PROXY_TEMPLATE;
  RDFE.Options.OntologyManager.OM_PREFIX_TEMPLATE = RDFE.OM_PREFIX_TEMPLATE;
  RDFE.Options.OntologyManager.OM_ONTOLOGY_TEMPLATE = RDFE.OM_ONTOLOGY_TEMPLATE;
  RDFE.Options.OntologyManager.OM_ONTOLOGY_CLASSES_TEMPLATE = RDFE.OM_ONTOLOGY_CLASSES_TEMPLATE;
  RDFE.Options.OntologyManager.OM_ONTOLOGY_PROPERTIES_TEMPLATE = RDFE.OM_ONTOLOGY_PROPERTIES_TEMPLATE;
  RDFE.Options.OntologyManager.OM_ONTOLOGY_INDIVIDUALS_TEMPLATE = RDFE.OM_ONTOLOGY_INDIVIDUALS_TEMPLATE;

  RDFE.Options.OntologyManager.useProxy = false;

  RDFE.Options.Templates = {};

  RDFE.Options.Bookmarks = {};

  if (source) {
      $.get(source, null, 'json').done((function(callback) {
          return function(data) {
            RDFE.Options.OntologyManager = $.extend(RDFE.Options.OntologyManager, data.OntologyManager);

            // Templates options
            RDFE.Options.Templates = $.extend(RDFE.Options.Templates, data.Templates);

            // Bookmarks options
            RDFE.Options.Bookmarks = $.extend(RDFE.Options.Bookmarks, data.Bookmarks);

            if (callback) callback();
          };})(callback)
      );
  }
}

/*
 *
 * Ontology Manager
 *
 */
RDFE.OntologyManager = function(store, options) {
  var self = this;

  if (!store) store = rdfstore.create();
  store.registerParser("application/rdf+xml", RDFXMLParser.parser);

  this.store = store;
  this.options = $.extend(RDFE.Options.OntologyManager, options);
  this.ontologies = [];

  this.init = function(options) {
      // clean store
      for (var i = 0; i < self.ontologies.length; i++) {
          self.graphClear(self.ontologies[i].graph);
      }
      this.ontologies = [];
      this.ontologiesParse(self.options.preloadOntologies);
  }

  this.dummy = function() {}

  this.graphClear = function(graph) {
      self.store.clear(graph, this.dummy);
  }

  this.ontologyLoad = function (URI, options) {
      var host = (self.options.useProxy)? self.options.OM_LOAD_PROXY_TEMPLATE.format(encodeURIComponent(URI)): self.options.OM_LOAD_TEMPLATE.format(URI);
      var acceptType = (options && options.acceptType)? options.acceptType: 'text/n3; q=1, text/turtle; q=0.8, application/rdf+xml; q=0.6';
      var x = function (data, status, xhr){
          var contentType = (xhr.getResponseHeader('content-type') || '').split(';')[0];
          self.graphClear(URI);
          self.store.load(contentType, data.trim('"'), URI, function(success, results) {
              if (!success) {
                  console.error('ontology load =>', results);
                  return;
              }
              if (options && options.success)
                  options.success();
          });
      }
      jQuery.ajax({
          "url": host,
          "type": 'GET',
          "crossDomain": true,
          "dataType": 'text',
          "success": x,
          "beforeSend": function (xhr) {
              xhr.setRequestHeader("Accept", acceptType);
          }
      });
  }

  this.ontologyParse = function (URI) {
      var x = function() {
          // ontology
          var sparql = self.options.OM_ONTOLOGY_TEMPLATE.format(URI);
          self.store.execute(sparql, function(success, results) {
              if (!success) {
                console.error('ontology =>', results);
                return;
              }
              for (var i = 0; i < results.length; i++) {
                  new RDFE.Ontology(self, URI, results[i]["o"].value);
              }
          });
      }
      self.ontologyLoad(URI, {"success": x});
  }

  this.ontologiesParse = function (ontologies) {
      if (!ontologies) return;

      for (var i = 0; i < ontologies.length; i++) {
          self.ontologyParse (ontologies[i]);
      }
  }

  this.ontologyByURI = function(ontologyURI) {
      for (var i = 0; i < self.ontologies.length; i++) {
          if (self.ontologies[i].URI = ontologyURI)
            return self.ontologies[i];
      }
      return null;
  }

  this.ontologyByPrefix = function(ontologyPrefix) {
      for (var i = 0; i < self.ontologies.length; i++) {
          if (self.ontologies[i].prefix = ontologyPrefix)
            return self.ontologies[i];
      }
      return null;
  }
}


/*
 *
 * Ontology
 *
 */
RDFE.Ontology = function(ontologyManager, graph, URI, options) {
  var self = this;

  // console.log('ontology =>', URI);
  this.options = $.extend({}, options);
  this.graph = graph;
  this.URI = URI;
  this.prefix = 'xxx';
  this.classes = [];
  this.properties = [];
  this.individuals = [];
  this.manager = ontologyManager;
  this.manager.ontologies.push(this);


  this.classByURI = function(classURI) {
      for (var i = 0; i < self.classes.length; i++) {
          if (self.classes[i].URI = classURI)
              return self.classes[i];
      }
      return null;
  }

  this.propertyByURI = function(propertyURI) {
      for (var i = 0; i < self.properties.length; i++) {
          if (self.properties[i].URI = propertyURI)
              return self.properties[i];
      }
      return null;
  }

  // ontology label, comment and etc
  this.load = function(URI) {
      self.manager.store.node(URI, self.graph, function(success, results) {
          if (!success) {
              console.error('ontology =>', results);
              return;
          }
          // console.log('ontology results =>', results.length);
          for (var i = 0; i < results.length; i++) {
              var p = results.triples[i].predicate.valueOf();
              var o = results.triples[i].object.valueOf();
              // console.log('ontology =>', p, o);
              if      (p == RDFE.denormalize('rdfs:label'))
                  self.label = RDFE.coalesce(self.label, o);

              else if (p == RDFE.denormalize('rdfs:comment'))
                  self.comment = RDFE.coalesce(self.comment, o);

              else if (p == RDFE.denormalize('dc:title'))
                  self.title = RDFE.coalesce(self.title, o);

              else if (p == RDFE.denormalize('dc:description'))
                  self.description = RDFE.coalesce(self.description, o);

              else if (p == RDFE.denormalize('dc:description'))
                  self.comment = RDFE.coalesce(self.comment, o);
          }
      });
  }
  this.load(self.URI);
  this.load('http://nobase');

  // ontology classes
  var sparql = self.manager.options.OM_ONTOLOGY_CLASSES_TEMPLATE.format(self.graph, self.URI);
  self.manager.store.execute(sparql, function(success, results) {
      if (!success) {
          console.error('ontology =>', results);
          return;
      }
      for (var i = 0; i < results.length; i++) {
          var c = results[i]["c"].value;
          // console.log('ontology class =>', c);
          if (!c.match(/^\_\:*/) && (c != RDFE.denormalize('rdfs:Class')) && (c != RDFE.denormalize('owl:Class')))
              self.classes.push(new RDFE.OntologyClass(self, c));
      }
  });

  // ontology properties
  var sparql = self.manager.options.OM_ONTOLOGY_PROPERTIES_TEMPLATE.format(self.graph, self.URI);
  self.manager.store.execute(sparql, function(success, results) {
      if (!success) {
          console.error('ontology =>', results);
          return;
      }
      for (var i = 0; i < results.length; i++) {
          self.properties.push(new RDFE.OntologyProperty(self, results[i]["p"].value));
      }
  });

  // set classes properties
  for (var i = 0; i < self.properties.length; i++) {
      ontologyClass = self.classByURI(self.properties[i].domain);
      if (ontologyClass)
          ontologyClass.propertyAdd(self.properties[i]);
  }

  // ontology individuals
  for (var i = 0; i < self.classes.length; i++) {
    // console.log('ontology class =>', self.classes[i].URI);
    var sparql = self.manager.options.OM_ONTOLOGY_INDIVIDUALS_TEMPLATE.format(self.graph, self.classes[i].URI);
    self.manager.store.execute(sparql, function(success, results) {
        if (!success) {
            console.error('ontology individuals =>', results);
            return;
        }
        for (var j = 0; j < results.length; j++) {
          var c = results[j]["i"].value;
          if (!c.match(/^\_\:*/))
            self.individuals.push(new RDFE.OntologyIndividual(self, c));
        }
    });
  }
}

/*
 *
 * Ontology Class
 *
 */
RDFE.OntologyClass = function(ontology, ontologyClassURI, options) {
  var self = this;

  // console.log('class =>', ontologyClassURI);
  this.options = $.extend({}, options);
  this.URI = ontologyClassURI;
  this.subClassOf = [];
  this.disjointWith = [];
  this.properties = [];
  this.ontology = ontology;

  this.propertiesClear = function() {
      self.properties = [];
  }

  this.propertyAdd = function(property) {
      for (var i = 0; i < self.properties.length; i++) {
          if (self.properties[i].URI = property.URI)
            return;
      }
      self.properties.push(property);
  }

  self.ontology.manager.store.node(ontologyClassURI, self.ontology.graph, function(success, results) {
      if (!success) {
          console.error('class =>', results);
          return;
      }
      // console.log('class results =>', results.length);
      for (var i = 0; i < results.length; i++) {
          var p = results.triples[i].predicate.valueOf();
          var o = results.triples[i].object.valueOf();
          // console.log('class =>', p, o);
          if      (p == RDFE.denormalize('rdfs:label'))
              self.label = RDFE.coalesce(self.label, o);

          else if (p == RDFE.denormalize('rdfs:comment'))
              self.comment = RDFE.coalesce(self.comment, o);

          else if (p == RDFE.denormalize('dc:title'))
              self.title = RDFE.coalesce(self.title, o);

          else if (p == RDFE.denormalize('dc:description'))
              self.description = RDFE.coalesce(self.description, o);

          else if (p == RDFE.denormalize('rdfs:subClassOf'))
              self.subClassOf.push(o);

          else if (p == RDFE.denormalize('owl:disjointWith'))
              self.disjointWith.push(o);
      }
  });
}

/*
 *
 * Ontology Property
 *
 */
RDFE.OntologyProperty = function(ontology, ontologyPropertyURI, options) {
  var self = this;
  var store = ontology.manager.store;

  // console.log('property =>', ontologyPropertyURI);
  this.options = $.extend({}, options);
  this.URI = ontologyPropertyURI;
  this.ontology = ontology;

  store.node(ontologyPropertyURI, self.ontology.graph, function(success, results) {
      if (!success) {
          console.error('property =>', results);
          return;
      }
      // console.log('property results =>', results.length);
      for (var i = 0; i < results.length; i++) {
          var p = results.triples[i].predicate.valueOf();
          var o = results.triples[i].object.valueOf();
          // console.log('property =>', p, o);
          if      (p == RDFE.denormalize('rdfs:label'))
              self.label = RDFE.coalesce(self.label, o);

          else if (p == RDFE.denormalize('rdfs:comment'))
              self.comment = RDFE.coalesce(self.comment, o);

          else if (p == RDFE.denormalize('dc:title'))
              self.title = RDFE.coalesce(self.title, o);

          else if (p == RDFE.denormalize('dc:description'))
              self.description = RDFE.coalesce(self.description, o);

          else if (p == RDFE.denormalize('rdfs:subPropertyOf'))
              self.subPropertyOf = RDFE.coalesce(self.subPropertyOf, o);

          else if (p == RDFE.denormalize('rdfs:range'))
              self.range = RDFE.coalesce(self.range, o);

          else if (!self.domain && (p == RDFE.denormalize('rdfs:domain')))
              self.domain = RDFE.collectionQuery(self.ontology.manager.store, self.ontology.URI, ontologyPropertyURI, 'rdfs:domain', o);
      }
  });
}

/*
 *
 * Ontology Individual
 *
 */
RDFE.OntologyIndividual = function(ontology, individualURI, options) {
  var self = this;

  // console.log('individual =>', individualURI);
  this.options = $.extend({}, options);
  this.URI = individualURI;
  this.ontology = ontology;

  self.ontology.manager.store.node(individualURI, self.ontology.graph, function(success, results) {
      if (!success) {
          console.error('individual =>', results);
          return;
      }
      // console.log('individual results =>', results.length);
      for (var i = 0; i < results.length; i++) {
          var p = results.triples[i].predicate.valueOf();
          var o = results.triples[i].object.valueOf();
          // console.log('individual =>', p, o);
          if      (p == RDFE.denormalize('rdfs:label'))
              self.label = RDFE.coalesce(self.label, o);

          else if (p == RDFE.denormalize('rdfs:comment'))
              self.comment = RDFE.coalesce(self.comment, o);

          else if (p == RDFE.denormalize('dc:title'))
              self.title = RDFE.coalesce(self.title, o);

          else if (p == RDFE.denormalize('dc:description'))
              self.description = RDFE.coalesce(self.description, o);

          else if (p == RDFE.denormalize('rdf:type'))
              self.class = o;
      }
  });
}
