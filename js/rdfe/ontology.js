if (typeof String.prototype.startsWith != 'function') {
  // see below for better implementation!
  String.prototype.startsWith = function(str) {
    return this.indexOf(str) == 0;
  };
}

if(!window.RDFE)
  window.RDFE = {};

RDFE.OM_LOAD_TEMPLATE =
  '{0}';

RDFE.OM_LOAD_PROXY_TEMPLATE =
  document.location.protocol + '//' + document.location.host + '/proxy?url={0}&output-format=turtle&force=rdf';

RDFE.OM_PREFIX_TEMPLATE =
  'http://prefix.cc/{0}.file.json';

/*
 * Ontology templates
 */
RDFE.OM_ONTOLOGY_TEMPLATE =
  '\n PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> ' +
  '\n PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> ' +
  '\n PREFIX owl: <http://www.w3.org/2002/07/owl#> ' +
  '\n SELECT distinct ?o ' +
  '\n   FROM <{0}> ' +
  '\n  WHERE { ' +
  '\n          ?o a owl:Ontology . ' +
  '\n        } ' +
  '\n  ORDER BY ?c';

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
  '\n        } ' +
  '\n  ORDER BY ?c';

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
  '\n        }';

RDFE.OM_ONTOLOGY_INDIVIDUALS_TEMPLATE =
  '\n PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> ' +
  '\n PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> ' +
  '\n PREFIX owl: <http://www.w3.org/2002/07/owl#> ' +
  '\n SELECT distinct ?i ' +
  '\n   FROM <{0}> ' +
  '\n  WHERE { ' +
  '\n          ?i a <{1}> . ' +
  '\n        } ' +
  '\n  ORDER BY ?i';

/*
 * Fresnel templates
 */
RDFE.OM_FRESNEL_LENSES_TEMPLATE =
  '\n PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> ' +
  '\n PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> ' +
  '\n PREFIX owl: <http://www.w3.org/2002/07/owl#> ' +
  '\n PREFIX fresnel: <http://www.w3.org/2004/09/fresnel#> ' +
  '\n SELECT distinct ?x ' +
  '\n   FROM <{0}> ' +
  '\n  WHERE { ' +
  '\n          ?x a fresnel:Lens . ' +
  '\n        } ' +
  '\n  ORDER BY ?x';

RDFE.OM_FRESNEL_FORMATS_TEMPLATE =
  '\n PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> ' +
  '\n PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> ' +
  '\n PREFIX owl: <http://www.w3.org/2002/07/owl#> ' +
  '\n PREFIX fresnel: <http://www.w3.org/2004/09/fresnel#> ' +
  '\n SELECT distinct ?x ' +
  '\n   FROM <{0}> ' +
  '\n  WHERE { ' +
  '\n          ?x a fresnel:Format . ' +
  '\n        } ' +
  '\n  ORDER BY ?x';

RDFE.OM_FRESNEL_GROUPS_TEMPLATE =
  '\n PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> ' +
  '\n PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> ' +
  '\n PREFIX owl: <http://www.w3.org/2002/07/owl#> ' +
  '\n PREFIX fresnel: <http://www.w3.org/2004/09/fresnel#> ' +
  '\n SELECT distinct ?x ' +
  '\n   FROM <{0}> ' +
  '\n  WHERE { ' +
  '\n          ?x a fresnel:Group . ' +
  '\n        } ' +
  '\n  ORDER BY ?x';

RDFE.prefixes = {};
RDFE.prefixes['annotation'] = 'http://www.w3.org/2000/10/annotation-ns#';
RDFE.prefixes['atom'] = 'http://atomowl.org/ontologies/atomrdf#';
RDFE.prefixes['book'] = 'http://purl.org/NET/book/vocab#';
RDFE.prefixes['cc'] = 'http://web.resource.org/cc/';
RDFE.prefixes['dataview'] = 'http://www.w3.org/2003/g/data-view#';
RDFE.prefixes['dc'] = 'http://purl.org/dc/elements/1.1/';
RDFE.prefixes['dcterms'] = 'http://purl.org/dc/terms/';
RDFE.prefixes['foaf'] = 'http://xmlns.com/foaf/0.1/';
RDFE.prefixes['fresnel'] = 'http://www.w3.org/2004/09/fresnel#';
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
      for (var i = 0, l = results.length; i < l; i++) {
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
      for (var i = 0, l = results.length; i < l; i++) {
        console.log(i, '=>', s, results[i]["p"].value, results[i]["o"].value);
      }
    } else {
      alert(results);
    }
  });
}

RDFE.sparqlValue = function(v) {
  if (!v) {
    return null;
  }
  return v.value;
}

/*
 *
 * Returns first non null argument
 *
 */
RDFE.coalesce = function() {
  for (i = 0; i < arguments.length; i++) {
    if (arguments[i]) {
      return arguments[i];
    }
  }
}

/*
 *
 * Extract a prefix
 *    foaf:Person => foaf
 *
 */
RDFE.uriPrefix = function(v) {
  var m = Math.max(v.lastIndexOf(':'), v.lastIndexOf('/'), v.lastIndexOf('#'))
  if ((m != -1) && (m == v.lastIndexOf(':'))) {
    return v.substring(0, m);
  }
  return null;
}

/*
 *
 * Extract a label
 *    http://xmlns.com/foaf/0.1/Person => Person
 *    foaf:Person => Person
 *
 */
RDFE.uriLabel = function(v) {
  var m = Math.max(v.lastIndexOf(':'), v.lastIndexOf('/'), v.lastIndexOf('#'))
  if (m == -1) {
    return v;
  }
  if (m != v.length-1) {
    return v.substring(m+1);
  }
  return null;
}

/*
 *
 * Check for prefix
 *    foaf
 *
 */
RDFE.isUriPrefix = function(v) {
  return (Math.max(v.lastIndexOf(':'), v.lastIndexOf('/'), v.lastIndexOf('#')) == -1);
}

/*
 *
 * Extract an ontology
 *    http://xmlns.com/foaf/0.1/Person => http://xmlns.com/foaf/0.1/
 *
 */
RDFE.uriOntology = function(v) {
  var m = Math.max(v.lastIndexOf(':'), v.lastIndexOf('/'), v.lastIndexOf('#'))
  if (m != -1) {
    return v.substring(0, m + 1);
  }
  return null;
}

/*
 *
 * Denormalize URI
 *     foaf:Person => http://xmlns.com/foaf/0.1/Person
 *
 */
RDFE.uriDenormalize = function(v) {
  var prefix = RDFE.uriPrefix(v);
  if (prefix) {
    if (!RDFE.prefixes[prefix]) {
      RDFE.ontologyByPrefix(prefix);
    }
    if (RDFE.prefixes[prefix]) {
      return RDFE.prefixes[prefix] + v.substring(prefix.length + 1);
    }
  }
  return v;
}

/*
 *
 * Normalize URI
 *    http://xmlns.com/foaf/0.1/Person => foaf:Person
 *
 */
RDFE.uriNormalize = function(v) {
  var ontology = RDFE.uriOntology(v);
  if (ontology) {
    for (var prefix in RDFE.prefixes) {
      if (RDFE.prefixes[prefix] == ontology) {
        return prefix + ':' + v.substring(ontology.length);
      }
    }
  }
  return v;
}

/*
 *
 * Check for blank node - starting with '_:...'
 *
 */
RDFE.isBlankNode = function(v) {
  return (v.match(/^\_\:*/)) ? true : false;
}

/*
 *
 * Find ontology by prefix
 *
 */
RDFE.ontologyByPrefix = function(prefix) {
  var host = RDFE.OM_PREFIX_TEMPLATE.format(prefix);
  $.ajax({
    url: host,
    type: 'GET',
    async: false
  }).done(function(data) {
    RDFE.prefixes[prefix] = data[prefix];
  });
  return RDFE.prefixes[prefix];
}

/*
 *
 * Return all triplets related to the subject
 *   - example: RDFE.nodeQuery(ontologyManager.store, 'http://mitko.dnsalias.net:8005/DAV/home/demo/Public/test.ttl', '_:40')
 *
 */
RDFE.nodeQuery = function(store, graph, subject, properties, callback) {
  store.node(subject, graph, function(success, results) {
    if (success) {
      var returns = {};
      for (var i = 0, l = results.length; i < l; i++) {
        var p = results.triples[i].predicate.valueOf();
        var o = results.triples[i].object.valueOf();
        if (properties) {
          for (var j = 0; j < properties.length; j++) {
            if (p == RDFE.uriDenormalize(properties[j])) {
              if (!returns[properties[j]]) {
                returns[properties[j]] = o;
              }
            }
          }
        } else {
          returns[RDFE.uriNormalize(p)] = o;
        }
      }
      results = returns;
    }
    if (callback) {
      callback(success, results);
    }
  });
}

/*
 *
 * Return all objects related to the collection
 *   - RDFE.collectionQuery(ontologyManager.store, 'test/test2.ttl', 'http://xmlns.com/foaf/0.1/status', 'rdfs:domain', '_:47')
 *
 */
RDFE.collectionQuery = function(store, graph, s, p, o, m) {
  var RDFE_COLLECTION_TEMPLATE =
    '\n PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> ' +
    '\n PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> ' +
    '\n PREFIX owl: <http://www.w3.org/2002/07/owl#> ' +
    '\n PREFIX fresnel: <http://www.w3.org/2004/09/fresnel#> ' +
    '\n SELECT distinct ?item ' +
    '\n   FROM <{0}> ' +
    '\n  WHERE { ' +
    '\n          <{1}> {2}{3}/{4}rdf:first ?item. ' +
    '\n        } ';

  // check for special blank node
  if (!RDFE.isBlankNode(o)) {
    return [o];
  }

  var size;
  var items = [];
  var mode = (m == 'fresnel') ? '' : '/owl:unionOf';
  var rest = '';
  var nextItem = function(items) {
    return function(success, results) {
      var c;
      if (success && results.length) {
        for (var i = 0, l = results.length; i < l; i++) {
          c = RDFE.sparqlValue(results[i]["item"]);
          if (!RDFE.isBlankNode(c))
            items.push(c);
        }
      }
    };
  };
  while (true) {
    size = items.length;
    var sparql = RDFE_COLLECTION_TEMPLATE.format(graph, s, p, mode, rest);
    store.execute(sparql, nextItem(items));
    if (size == items.length) {
      break;
    }
    rest += 'rdf:rest/';
  }
  // console.log('RDFE.collectionQuery =>', p, items);
  return items;
}

RDFE.individuals = function(doc, type) {
  var items = [];
  doc.listEntities(type, function(r) {
    items = r;
  });
  return items;
};

/*
 *
 * Ontology Manager
 *
 */
RDFE.OntologyManager = function(store, config) {
  var self = this;

  if (!store) store = rdfstore.create();
  store.registerParser("application/rdf+xml", RDFXMLParser.parser);

  this.store = store;
  this.options = $.extend(RDFE.Config.defaults.ontology, config);
  this.ontologies = [];
  this.fresnels = [];
  this.templates = [];
}

RDFE.OntologyManager.prototype.init = function(options) {
  var self = this;

  // clean store
  for (var i = 0, l = self.ontologies.length; i < l; i++) {
    self.graphClear(self.ontologies[i].graph);
  }
  this.ontologies = [];
  for (var i = 0, l = self.fresnels.length; i < l; i++) {
    self.graphClear(self.fresnels[i].graph);
  }
  this.fresnels = [];
  this.templates = [];

  // ontologies init
  this.ontologiesParse(self.options.preloadOntologies);
  // fresnels init
  this.fresnelsParse(self.options.preloadFresnels);
}

RDFE.OntologyManager.prototype.graphClear = function(graph) {
  var self = this;
  self.store.clear(graph, function() {});
}

RDFE.OntologyManager.prototype.load = function(URI, params) {
  var self = this;
  var host = (self.options.proxy) ? RDFE.OM_LOAD_PROXY_TEMPLATE.format(encodeURIComponent(URI)) : RDFE.OM_LOAD_TEMPLATE.format(URI);
  var acceptType = (params && params.acceptType) ? params.acceptType : 'text/n3; q=1, text/turtle; q=0.8, application/rdf+xml; q=0.6';
  var __ontologyLoaded = (function(URI, params) {
    return function(data, status, xhr) {
      var contentType = (xhr.getResponseHeader('content-type') || '').split(';')[0];
      self.graphClear(URI);
      self.store.load(contentType, data.trim('"'), URI, (function(params) {
        return function(success, results) {
          if (!success) {
            console.error('ontology load =>', results);
            return;
          }
          if (params && params.success) {
            params.success();
          }
        };
      })(params))
    }
  })(URI, params);
  jQuery.ajax({
    "url": host,
    "type": 'GET',
    "crossDomain": true,
    "dataType": 'text',
    "success": __ontologyLoaded,
    "beforeSend": function(xhr) {
      xhr.setRequestHeader("Accept", acceptType);
    }
  });
}

RDFE.OntologyManager.prototype.ontologyParse = function(URI, params) {
  var self = this;
  var options = $.extend(self.options, params);
  var ontology = this.ontologyByURI(URI);
  if ((options.preloadOnly == true) || (ontology && (options.forceLoad == false))) {
    if (params && params.success) {
      params.success(ontology);
    }
    return;
  }

  var __ontologyLoaded = (function(params) {
    return function() {
      // ontology
      var sparql = RDFE.OM_ONTOLOGY_TEMPLATE.format(URI);
      self.store.execute(sparql, function(success, results) {
        if (!success) {
          console.error('ontology =>', results);
          return;
        }
        var callback;
        var ontology;
        if (params && params.success) {
          callback = params.success;
          delete params.success;
        }
        if (results.length) {
          var graph = URI;
          for (var i = 0, l = results.length; i < l; i++) {
            var ontologyURI = results[i]["o"].value;
            // Fix for some ontlogies
            if ((graph.charAt(graph.length - 1) == '#') && (graph.substring(0, graph.length - 1) == ontologyURI)) {
              ontologyURI = graph;
            }
            ontology = new RDFE.Ontology(self, ontologyURI, graph, params);
            if (callback) {
              callback(ontology);
            }
          }
        } else {
          ontology = new RDFE.Ontology(self, URI, URI, params);
          if (callback) {
            callback(ontology);
          }
        }
      });
    }
  })(params);
  self.load(URI, {
    "success": __ontologyLoaded
  });
}

RDFE.OntologyManager.prototype.ontologiesParse = function(ontologies, params) {
  var self = this;
  if (ontologies) {
    for (var i = 0, l = ontologies.length; i < l; i++) {
      self.ontologyParse(ontologies[i], params);
    }
  }
}

RDFE.OntologyManager.prototype.ontologyByURI = function(URI) {
  var self = this;
  for (var i = 0, l = self.ontologies.length; i < l; i++) {
    if (self.ontologies[i].URI == URI) {
      return self.ontologies[i];
    }
  }
  return null;
}

RDFE.OntologyManager.prototype.ontologyByPrefix = function(prefix) {
  var self = this;
  for (var i = 0, l = self.ontologies.length; i < l; i++) {
    if (self.ontologies[i].prefix == prefix)
      return self.ontologies[i];
  }
  return null;
}

RDFE.OntologyManager.prototype.ontologyRemove = function(URI) {
  var self = this;
  for (var i = 0, l = self.ontologies.length; i < l; i++) {
    if (self.ontologies[i].URI == URI) {
      self.ontologies.splice(i, 1);
      return;
    }
  }
}

RDFE.OntologyManager.prototype.fresnelParse = function(URI, params) {
  // console.log(URI);
  var self = this;
  var fresnel = this.ontologyByURI(URI);
  if ((options.preloadOnly == true) || (fresnel && (options.forceLoad == false))) {
    if (params && params.success) {
      params.success(fresnel);
    }
    return;
  }

  var __fresnelLoaded = (function(params) {
    return function() {
      // fresnel
      var callback;
      var fresnel;
      if (params && params.callback) {
        callback = params.success;
        delete params.success;
      }
      fresnel = new RDFE.Fresnel(self, URI, params);
      if (callback) {
        callback(fresnel);
      }
    }
  })(params);
  self.load(URI, {
    "success": __fresnelLoaded
  });
}

RDFE.OntologyManager.prototype.fresnelsParse = function(fresnels, params) {
  var self = this;
  if (fresnels) {
    for (var i = 0, l = fresnels.length; i < l; i++) {
      self.fresnelParse(fresnels[i], params);
    }
  }
}

RDFE.OntologyManager.prototype.fresnelByURI = function(URI) {
  var self = this;
  for (var i = 0, l = self.fresnels.length; i < l; i++) {
    if (self.fresnels[i].URI == URI) {
      return self.fresnels[i];
    }
  }
  return null;
}

RDFE.OntologyManager.prototype.fresnelRemove = function(URI) {
  var self = this;
  for (var i = 0, l = self.fresnels.length; i < l; i++) {
    if (self.fresnels[i].URI == URI) {
      self.fresnels.splice(i, 1);
      return;
    }
  }
}

RDFE.OntologyManager.prototype.templateParse = function(URI, params, callback) {
  // console.log(URI);
  var self = this;
  new RDFE.Template(self, URI, params, callback);
}

RDFE.OntologyManager.prototype.templatesParse = function(templates, params, callback) {
  var self = this;
  if (templates) {
    for (var i = 0, l = templates.length; i < l; i++) {
      self.templateParse(templates[i], params, callback);
    }
  }
}

RDFE.OntologyManager.prototype.templateByURI = function(URI) {
  var self = this;
  for (var i = 0, l = self.templates.length; i < l; i++) {
    if (self.templates[i].URI == URI)
      return self.templates[i];
  }
}

RDFE.OntologyManager.prototype.templateRemove = function(URI) {
  var self = this;
  for (var i = 0, l = self.templates.length; i < l; i++) {
    if (self.templates[i].URI == URI) {
      self.templates.splice(i, 1);
      return;
    }
  }
}

RDFE.OntologyManager.prototype.templateForClass = function(URI, params, callback) {
  var self = this;
  var template = self.templateByURI(URI);
  if (template) {
    callback(template);
  } else {
    new RDFE.Template(self, URI, params, callback);
  }
}

RDFE.OntologyManager.prototype.templateForProperty = function(URI, params, callback) {
  var self = this;
  new RDFE.Template(self, URI, params, callback);
}

RDFE.OntologyManager.prototype.ontologyDetermine = function(URI) {
  var self = this;
  var ontology;
  var prefix = RDFE.uriPrefix(URI);
  if (prefix) {
    ontology = self.ontologyByPrefix(prefix);
    if (ontology) {
      ontology = ontology.URI;
    } else {
      ontology = RDFE.ontologyByPrefix(prefix);
    }
  } else {
    ontology = RDFE.uriOntology(URI);
  }
  return ontology;
}

/*
 *
 * Ontology
 *
 */
RDFE.Ontology = function(ontologyManager, URI, graph, options) {
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

  // replace or add to this.manager.ontologies array
  var ontologies = this.manager.ontologies;
  for (var i = 0, l = ontologies.length; i < l; i++) {
    if (ontologies[i].URI == URI) {
      ontologies[i] = this;
    }
  }
  if (i == ontologies.length) {
    ontologies.push(this);
  }

  // ontology label, comment and etc
  var load = function(URI) {
    self.manager.store.node(URI, self.graph, function(success, results) {
      if (!success) {
        console.error('ontology =>', results);
        return;
      }
      // console.log('ontology results =>', results.length);
      for (var i = 0, l = results.length; i < l; i++) {
        var p = results.triples[i].predicate.valueOf();
        var o = results.triples[i].object.valueOf();
        // console.log('ontology =>', p, o);
        if (p == RDFE.uriDenormalize('rdfs:label'))
          self.label = RDFE.coalesce(self.label, o);

        else if (p == RDFE.uriDenormalize('rdfs:comment'))
          self.comment = RDFE.coalesce(self.comment, o);

        else if (p == RDFE.uriDenormalize('dc:title'))
          self.title = RDFE.coalesce(self.title, o);

        else if (p == RDFE.uriDenormalize('dc:description'))
          self.description = RDFE.coalesce(self.description, o);

        else if (p == RDFE.uriDenormalize('dc:description'))
          self.comment = RDFE.coalesce(self.comment, o);
      }
    });
  }
  load(self.URI);
  load('http://nobase');

  // ontology classes
  var sparql = RDFE.OM_ONTOLOGY_CLASSES_TEMPLATE.format(this.graph, this.URI);
  this.manager.store.execute(sparql, function(success, results) {
    if (!success) {
      console.error('ontology =>', results);
      return;
    }
    for (var i = 0, l = results.length; i < l; i++) {
      var c = results[i]["c"].value;
      // console.log('ontology class =>', c);
      if (!RDFE.isBlankNode(c) && (c != RDFE.uriDenormalize('rdfs:Class')) && (c != RDFE.uriDenormalize('owl:Class'))) {
        self.classes.push(new RDFE.OntologyClass(self, c));
      }
    }
  });

  // ontology properties
  var sparql = RDFE.OM_ONTOLOGY_PROPERTIES_TEMPLATE.format(this.graph, this.URI);
  this.manager.store.execute(sparql, function(success, results) {
    if (!success) {
      console.error('ontology =>', results);
      return;
    }
    for (var i = 0, l = results.length; i < l; i++) {
      self.properties.push(new RDFE.OntologyProperty(self, results[i]["p"].value));
    }
  });

  // set classes properties
  for (var i = 0, l = this.properties.length; i < l; i++) {
    var ontologyClass = this.classByURI(this.properties[i].domain);
    if (ontologyClass) {
      ontologyClass.propertyAdd(this.properties[i]);
    }
  }

  // ontology individuals
  for (var i = 0, l = self.classes.length; i < l; i++) {
    // console.log('ontology class =>', self.classes[i].URI);
    var sparql = RDFE.OM_ONTOLOGY_INDIVIDUALS_TEMPLATE.format(this.graph, this.classes[i].URI);
    this.manager.store.execute(sparql, function(success, results) {
      if (!success) {
        console.error('ontology individuals =>', results);
        return;
      }
      for (var j = 0; j < results.length; j++) {
        var c = results[j]["i"].value;
        if (!RDFE.isBlankNode(c)) {
          self.individuals.push(new RDFE.OntologyIndividual(self, c));
        }
      }
    });
  }
}

RDFE.Ontology.prototype.classByURI = function(classURI) {
  var self = this;
  for (var i = 0; i < self.classes.length; i++) {
    if (self.classes[i].URI == classURI) {
      return self.classes[i];
    }
  }
  return null;
}

RDFE.Ontology.prototype.propertyByURI = function(propertyURI) {
  var self = this;
  for (var i = 0, l = self.properties.length; i < l; i++) {
    if (self.properties[i].URI == propertyURI) {
      return self.properties[i];
    }
  }
  return null;
}

RDFE.Ontology.prototype.individualsByClassURI = function(classURI) {
  var self = this;
  var items = [];
  for (var i = 0, l = self.individuals.length; i < l; i++) {
    if (self.individuals[i].class == classURI) {
      items.push(self.individuals[i].URI);
    }
  }
  return items;
}

/*
 *
 * Ontology Class
 *
 */
RDFE.OntologyClass = function(ontology, URI, options) {
  var self = this;

  // console.log('class =>', URI);
  this.options = $.extend({}, options);
  this.URI = URI;
  this.subClassOf = [];
  this.disjointWith = [];
  this.properties = [];
  this.ontology = ontology;

  self.ontology.manager.store.node(URI, self.ontology.graph, function(success, results) {
    if (!success) {
      console.error('class =>', results);
      return;
    }
    // console.log('class results =>', results.length);
    for (var i = 0, l = results.length; i < l; i++) {
      var p = results.triples[i].predicate.valueOf();
      var o = results.triples[i].object.valueOf();
      // console.log('class =>', p, o);
      if (p == RDFE.uriDenormalize('rdfs:label'))
        self.label = RDFE.coalesce(self.label, o);

      else if (p == RDFE.uriDenormalize('rdfs:comment'))
        self.comment = RDFE.coalesce(self.comment, o);

      else if (p == RDFE.uriDenormalize('dc:title'))
        self.title = RDFE.coalesce(self.title, o);

      else if (p == RDFE.uriDenormalize('dc:description'))
        self.description = RDFE.coalesce(self.description, o);

      else if (p == RDFE.uriDenormalize('rdfs:subClassOf'))
        self.subClassOf.push(o);

      else if (p == RDFE.uriDenormalize('owl:disjointWith'))
        self.disjointWith.push(o);
    }
  });
}

RDFE.OntologyClass.prototype.propertiesClear = function() {
  var self = this;
  self.properties = [];
}

RDFE.OntologyClass.prototype.propertyAdd = function(property) {
  var self = this;
  for (var i = 0, l = self.properties.length; i < l; i++) {
    if (self.properties[i].URI == property.URI) {
      return;
    }
  }
  self.properties.push(property);
}

/*
 *
 * Ontology Property
 *
 */
RDFE.OntologyProperty = function(ontology, URI, options) {
  var self = this;
  var store = ontology.manager.store;

  // console.log('property =>', URI);
  this.options = $.extend({}, options);
  this.URI = URI;
  this.ontology = ontology;

  store.node(URI, self.ontology.graph, function(success, results) {
    if (!success) {
      console.error('property =>', results);
      return;
    }
    // console.log('property results =>', results.length);
    for (var i = 0, l = results.length; i < l; i++) {
      var p = results.triples[i].predicate.valueOf();
      var o = results.triples[i].object.valueOf();
      // console.log('property =>', p, o);
      if (p == RDFE.uriDenormalize('rdf:type')) {
        if      (o == RDFE.uriDenormalize('rdf:Property'))
          self.class = RDFE.coalesce(self.class, o);

        else if (o == RDFE.uriDenormalize('owl:ObjectProperty'))
          self.class = o;

        else if (o == RDFE.uriDenormalize('owl:DatatypeProperty'))
          self.class = o;

      }
      else if (p == RDFE.uriDenormalize('rdfs:label'))
        self.label = RDFE.coalesce(self.label, o);

      else if (p == RDFE.uriDenormalize('rdfs:comment'))
        self.comment = RDFE.coalesce(self.comment, o);

      else if (p == RDFE.uriDenormalize('dc:title'))
        self.title = RDFE.coalesce(self.title, o);

      else if (p == RDFE.uriDenormalize('dc:description'))
        self.description = RDFE.coalesce(self.description, o);

      else if (p == RDFE.uriDenormalize('rdfs:subPropertyOf'))
        self.subPropertyOf = RDFE.coalesce(self.subPropertyOf, o);

      else if (p == RDFE.uriDenormalize('rdfs:range'))
        self.range = RDFE.coalesce(self.range, o);

      else if (!self.domain && (p == RDFE.uriDenormalize('rdfs:domain')))
        self.domain = RDFE.collectionQuery(self.ontology.manager.store, self.ontology.graph, URI, 'rdfs:domain', o);
    }
  });
}

/*
 *
 * Ontology Individual
 *
 */
RDFE.OntologyIndividual = function(ontology, URI, options) {
  var self = this;

  // console.log('individual =>', URI);
  this.options = $.extend({}, options);
  this.URI = URI;
  this.ontology = ontology;

  self.ontology.manager.store.node(URI, self.ontology.graph, function(success, results) {
    if (!success) {
      console.error('individual =>', results);
      return;
    }
    // console.log('individual results =>', results.length);
    for (var i = 0, l = results.length; i < l; i++) {
      var p = results.triples[i].predicate.valueOf();
      var o = results.triples[i].object.valueOf();
      // console.log('individual =>', RDFE.uriNormalize(p), o);
      if (p == RDFE.uriDenormalize('rdfs:label'))
        self.label = RDFE.coalesce(self.label, o);

      else if (p == RDFE.uriDenormalize('rdfs:comment'))
        self.comment = RDFE.coalesce(self.comment, o);

      else if (p == RDFE.uriDenormalize('dc:title'))
        self.title = RDFE.coalesce(self.title, o);

      else if (p == RDFE.uriDenormalize('dc:description'))
        self.description = RDFE.coalesce(self.description, o);

      else if (p == RDFE.uriDenormalize('rdf:type'))
        self.class = o;
    }
  });
}

/*
 *
 * Fresnel
 *
 */
RDFE.Fresnel = function(ontologyManager, URI, options) {
  // console.log('fresnel =>', URI);
  var self = this;

  this.options = $.extend({
    "lenses": true,
    "formats": false,
    "groups": false
  }, options);
  this.URI = URI;
  this.graph = URI;
  this.manager = ontologyManager;
  this.lenses = [];
  this.formats = [];
  this.groups = [];

  // replace or add to this.manager.fresnels array
  var fresnels = this.manager.fresnels;
  for (var i = 0, l = fresnels.length; i < l; i++) {
    if (fresnels[i].URI == URI) {
      fresnels[i] = this;
    }
  }
  if (i == fresnels.length) {
    fresnels.push(this);
  }

  // fresnel lenses
  if (this.options.lenses) {
    var sparql = RDFE.OM_FRESNEL_LENSES_TEMPLATE.format(URI);
    this.manager.store.execute(sparql, function(success, results) {
      if (!success) {
        console.error('fresnel groups =>', results);
        return;
      }
      for (var i = 0, l = results.length; i < l; i++) {
        self.lenses.push(new RDFE.FresnelLens(self, results[i]["x"].value));
      }
    });
  }

  // fresnel formats
  if (this.options.formats) {
    var sparql = RDFE.OM_FRESNEL_FORMATS_TEMPLATE.format(URI);
    this.manager.store.execute(sparql, function(success, results) {
      if (!success) {
        console.error('fresnel groups =>', results);
        return;
      }
      for (var i = 0, l = results.length; i < l; i++) {
        self.formats.push(new RDFE.FresnelFormat(self, results[i]["x"].value));
      }
    });
  }

  // fresnel groups
  if (this.options.groups) {
    var sparql = RDFE.OM_FRESNEL_GROUPS_TEMPLATE.format(URI);
    this.manager.store.execute(sparql, function(success, results) {
      if (!success) {
        console.error('fresnel groups =>', results);
        return;
      }
      for (var i = 0, l = results.length; i < l; i++) {
        self.groups.push(new RDFE.FresnelGroup(self, results[i]["x"].value));
      }
    });
  }

}

RDFE.Fresnel.prototype.findLens = function(domainURI) {
  var self = this;
  for (var i = 0, l = self.lenses.length; i < l; i++) {
    if (self.lenses[i].classLensDomain == domainURI) {
      return self.lenses[i];
    }
  }
  return null;
}

RDFE.Fresnel.prototype.findFormat = function(propertyURI) {
  var self = this;
  for (var i = 0, l = self.formats.length; i < l; i++) {
    if (self.formats[i].propertyFormatDomain == propertyURI) {
      return self.formats[i];
    }
  }
  return null;
}

RDFE.Fresnel.prototype.findGroup = function(groupURI) {
  var self = this;
  for (var i = 0, l = self.groups.length; i < l; i++) {
    if (self.groups[i].URI == groupURI) {
      return self.groups[i];
    }
  }
  return null;
}

/*
 *
 * Fresnel Lens
 *
 */
RDFE.FresnelLens = function(fresnel, URI, options) {
  // console.log('fresnel lens =>', URI);
  var self = this;
  this.URI = URI;
  this.fresnel = fresnel;

  self.fresnel.manager.store.node(URI, self.fresnel.graph, function(success, results) {
    if (!success) {
      console.error('fresnel lens =>', results);
      return;
    }
    // console.log('fresnel lens =>', results.length);
    for (var i = 0, l = results.length; i < l; i++) {
      var p = results.triples[i].predicate.valueOf();
      var o = results.triples[i].object.valueOf();
      // console.log('lens =>', RDFE.uriNormalize(p), o);
      if (p == RDFE.uriDenormalize('fresnel:classLensDomain'))
        self.classLensDomain = RDFE.coalesce(self.classLensDomain, o);

      else if (p == RDFE.uriDenormalize('fresnel:instanceFormatDomain'))
        self.instanceFormatDomain = RDFE.coalesce(self.instanceFormatDomain, o);

      else if (p == RDFE.uriDenormalize('fresnel:group'))
        self.group = RDFE.coalesce(self.group, o);

      else if (p == RDFE.uriDenormalize('fresnel:purpose'))
        self.purpose = RDFE.coalesce(self.purpose, o);

      else if (p == RDFE.uriDenormalize('fresnel:showProperties'))
        self.showProperties = RDFE.collectionQuery(self.fresnel.manager.store, self.fresnel.graph, self.URI, 'fresnel:showProperties', o, 'fresnel');

      else if (p == RDFE.uriDenormalize('fresnel:hideProperties'))
        self.hideProperties = RDFE.collectionQuery(self.fresnel.manager.store, self.fresnel.graph, self.URI, 'fresnel:hideProperties', o, 'fresnel');
    }
  });
}

/*
 *
 * Fresnel Format
 *
 */
RDFE.FresnelFormat = function(fresnel, URI, options) {
  // console.log('fresnel format =>', URI);
  var self = this;
  this.fresnel = fresnel;
  this.propertyFormatDomain = [];

  self.fresnel.manager.store.node(URI, self.fresnel.graph, function(success, results) {
    if (!success) {
      console.error('fresnel format =>', results);
      return;
    }
    // console.log('fresnel format =>', results.length);
    for (var i = 0, l = results.length; i < l; i++) {
      var p = results.triples[i].predicate.valueOf();
      var o = results.triples[i].object.valueOf();
      // console.log('format =>', RDFE.uriNormalize(p), o);
      if (p == RDFE.uriDenormalize('fresnel:label'))
        self.label = RDFE.coalesce(self.label, o);

      else if (p == RDFE.uriDenormalize('fresnel:group'))
        self.group = RDFE.coalesce(self.group, o);

      else if (p == RDFE.uriDenormalize('fresnel:value'))
        self.value = RDFE.coalesce(self.value, o);

      else if (p == RDFE.uriDenormalize('fresnel:propertyStyle'))
        self.propertyStyle = RDFE.coalesce(self.propertyStyle, o);

      else if (p == RDFE.uriDenormalize('fresnel:resourceStyle'))
        self.resourceStyle = RDFE.coalesce(self.resourceStyle, o);

      else if (p == RDFE.uriDenormalize('fresnel:valueStyle'))
        self.valueStyle = RDFE.coalesce(self.valueStyle, o);

      else if (p == RDFE.uriDenormalize('fresnel:labelStyle'))
        self.labelStyle = RDFE.coalesce(self.labelStyle, o);

      else if (p == RDFE.uriDenormalize('fresnel:propertyFormatDomain'))
        self.propertyFormatDomain.push(o);
    }
  });
}

/*
 *
 * Fresnel Group
 *
 */
RDFE.FresnelGroup = function(fresnel, URI, options) {
  // console.log('fresnel group =>', URI);
  var self = this;
  this.fresnel = fresnel;

  self.fresnel.manager.store.node(URI, self.fresnel.graph, function(success, results) {
    if (!success) {
      console.error('fresnel group =>', results);
      return;
    }
    // console.log('fresnel group =>', results.length);
    for (var i = 0, l = results.length; i < l; i++) {
      var p = results.triples[i].predicate.valueOf();
      var o = results.triples[i].object.valueOf();
      // console.log('group =>', RDFE.uriNormalize(p), o);
      if (p == RDFE.uriDenormalize('fresnel:stylesheetLink'))
        self.stylesheetLink = RDFE.coalesce(self.stylesheetLink, o);

      else if (p == RDFE.uriDenormalize('fresnel:containerStyle'))
        self.containerStyle = RDFE.coalesce(self.containerStyle, o);
    }
  });
}

/*
 *
 * Templates
 *
 */
RDFE.Template = function(ontologyManager, URI, options, callback) {
  // console.log('template =>', URI);
  var self = this;

  this.options = $.extend({}, options);
  this.manager = ontologyManager;
  this.manager.templates.push(this);
  this.properties = [];

  if (this.options.ontology) {
    self.ontologyURI = this.options.ontology;
  } else {
    self.ontologyURI = self.manager.ontologyDetermine(URI);
  }

  // onlology load callback
  if (self.ontologyURI) {
    this.URI = RDFE.uriDenormalize(URI);
    this.manager.ontologyParse(self.ontologyURI, {
      "force": false,
      "success": function() {

        // fresnel load callback
        var __fresnelLoaded = function() {
          // property has doimain?
          var hasDomain = function(property, domain) {
            if (property && property.domain) {
              for (var j = 0; j < property.domain.length; j++) {
                if (domain == property.domain[j]) {
                  return true;
                }
              }
            }
            return false;
          }

          self.ontology = self.manager.ontologyByURI(self.ontologyURI);
          if (self.ontology) {
            var properties = [];
            var fresnel = self.manager.fresnelByURI(self.fresnel);
            if (fresnel) {
              var lens = fresnel.findLens(self.URI);
              if (lens && lens.showProperties) {
                for (var i = 0, l = lens.showProperties.length; i < l; i++) {
                  var property = self.ontology.propertyByURI(lens.showProperties[i]);
                  if (property && hasDomain(property, self.URI)) {
                    properties.push(property);
                  }
                }
              }
            }
            if (properties) {
              for (var i = 0, l = self.ontology.properties.length; i < l; i++) {
                if (hasDomain(self.ontology.properties[i], self.URI)) {
                  properties.push(self.ontology.properties[i]);
                }
              }
            }
            self.properties = properties;
          }

          if (callback) {
            callback(self);
          }
        }
        if (self.options.fresnel) {
          self.fresnel = self.options.fresnel;
          self.manager.fresnelParse(self.fresnel, {
            "force": false,
            "success": __fresnelLoaded
          });
        } else {
          __fresnelLoaded();
        }
      }
    });
  }
}
RDFE.Template.prototype.toBackboneForm = function(documentModel) {
  var self = this;
  var schema = {};
  var fields = [];
  schema[RDFE.uriDenormalize('rdf:type')] = {
    "type": "List",
    "itemType": 'Rdfnode',
    "rdfnode": {
      type: "http://www.w3.org/1999/02/22-rdf-syntax-ns#Resource",
      create: false
    },
    "title": 'Type',
    "editorAttrs": {"disabled": 'disabled'}
  };
  fields.push(RDFE.uriDenormalize('rdf:type'));
  for (var i = 0, l = self.properties.length; i < l; i++) {
    var property = self.properties[i];
    if (!property.template) {
      property.template = new RDFE.PropertyTemplate(self.manager, property);
    }

    var item = property.template.getBackboneField(documentModel);
    if (item) {
      schema[property.URI] = item;
      fields.push(property.URI);
    }
  }
  return {"schema": schema, "fields": fields};
}


/*
 *
 * Property Template
 *
 */
RDFE.PropertyTemplate = function(ontologyManager, URI, options, callback) {
  // console.log('property template =>', URI);
  var self = this;

  this.options = $.extend({}, options);
  this.manager = ontologyManager;

  if (_.isObject(URI)) {
    self.property = URI;
    self.URI = self.property.URI;
    self.ontology = self.property.ontology;

    if (callback) {
      callback(self);
    }
  } else {
    if (this.options.ontology) {
      self.ontologyURI = this.options.ontology;
    } else {
      self.ontologyURI = self.manager.ontologyDetermine(URI);
    }

    if (self.ontologyURI) {
      this.URI = RDFE.uriDenormalize(URI);
      this.manager.ontologyParse(self.ontologyURI, {
        "force": false,
        "success": function() {
          self.ontology = self.manager.ontologyByURI(self.ontologyURI);
          if (self.ontology) {
            self.property = self.ontology.propertyByURI(self.URI);
          }
          if (callback) {
            callback(self);
          }
        }
      });
    }
  }
}

RDFE.PropertyTemplate.prototype.getBackboneField = function(documentModel) {
  var self = this;
  var getIndividuals = function(range, callback) {
    var items = self.ontology.individualsByClassURI(range);
    if (documentModel) {
      $.merge(items, RDFE.individuals(documentModel.doc, range));
    }
    callback(items);
  };

  if (!self.property) {
    return;
  }
  var property = self.property;
  var item = {
    type: "List",
    itemType: "Rdfnode",
    title: RDFE.coalesce(property.label, property.title, RDFE.uriLabel(property.URI)),
    rdfnode: {},
    editorAttrs: {
      "title": RDFE.coalesce(property.comment, property.description)
    }
  };
  if (property.class == RDFE.uriDenormalize('owl:DatatypeProperty')) {
    item.rdfnode.type = property.range;
  } else if (property.class == RDFE.uriDenormalize('owl:ObjectProperty')) {
    item.rdfnode.type = "http://www.w3.org/1999/02/22-rdf-syntax-ns#Resource";
    item.rdfnode.choices = function(callback) { getIndividuals(property.range, callback); };
    item.rdfnode.create = true; //FIXME: make this configurable
  } else if (property.range) {
    if (property.range == "http://www.w3.org/2000/01/rdf-schema#Literal" ||
        property.range.startsWith('http://www.w3.org/2001/XMLSchema#')) {
      item.rdfnode.type = property.range;
    } else {
      item.rdfnode.type = "http://www.w3.org/1999/02/22-rdf-syntax-ns#Resource";
      item.rdfnode.choices = function(callback) { getIndividuals(property.range, callback); };
      item.rdfnode.create = true; //FIXME: make this configurable
    }
  }
  return item;
}
