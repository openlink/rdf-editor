if (typeof String.prototype.startsWith != 'function') {
  // see below for better implementation!
  String.prototype.startsWith = function(str) {
    return this.indexOf(str) == 0;
  };
}

if(!window.RDFE)
  window.RDFE = {};

RDFE.OM_PREFIX_TEMPLATE =
  'http://prefix.cc/{0}.file.json';

/*
 * Ontology templates
 */
RDFE.OM_ONTOLOGY_TEMPLATE =
  '\n SELECT distinct ?o ' +
  '\n   FROM <{0}> ' +
  '\n  WHERE { ' +
  '\n          ?o a owl:Ontology . ' +
  '\n        } ' +
  '\n  ORDER BY ?c';

RDFE.OM_ONTOLOGY_CLASSES_TEMPLATE =
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
  '\n SELECT distinct ?x ' +
  '\n   FROM <{0}> ' +
  '\n  WHERE { ' +
  '\n          ?x a fresnel:Lens . ' +
  '\n        } ' +
  '\n  ORDER BY ?x';

RDFE.OM_FRESNEL_FORMATS_TEMPLATE =
  '\n SELECT distinct ?x ' +
  '\n   FROM <{0}> ' +
  '\n  WHERE { ' +
  '\n          ?x a fresnel:Format . ' +
  '\n        } ' +
  '\n  ORDER BY ?x';

RDFE.OM_FRESNEL_GROUPS_TEMPLATE =
  '\n SELECT distinct ?x ' +
  '\n   FROM <{0}> ' +
  '\n  WHERE { ' +
  '\n          ?x a fresnel:Group . ' +
  '\n        } ' +
  '\n  ORDER BY ?x';

RDFE.OM_INDIVIDUALS_TEMPLATE =
  '\n SELECT distinct ?i ?c' +
  '\n   FROM <{0}> ' +
  '\n  WHERE { ' +
  '\n          ?i a ?c . ' +
  '\n        } ' +
  '\n  ORDER BY ?i';

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
  if (m == -1) {
    return v;
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
  if(!v)
    return null;
  var m = Math.max(v.lastIndexOf(':'), v.lastIndexOf('/'), v.lastIndexOf('#'))
  if (m != -1) {
    return v.substring(0, m + 1);
  }
  return null;
}

/*
 *
 * Check for blank node - starting with '_:...'
 *
 */
RDFE.isBlankNode = function(v) {
  if (_.isString(v))
    return (v.match(/^\_\:*/)) ? true : false;

  if (_.isObject(v) && v.URI)
    return RDFE.isBlankNode(v.URI);

  return false;
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
 * Return all objects related to the collection
 *   - RDFE.collectionQuery(ontologyManager.store, 'test/test2.ttl', 'http://xmlns.com/foaf/0.1/status', 'rdfs:domain', '_:47')
 *
 */
RDFE.collectionQuery = function(store, graph, s, p, o, m) {
  var RDFE_COLLECTION_TEMPLATE =
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

  if (!store) {
    store = rdfstore.create();
  }

  // set default namespaces
  store.registerDefaultNamespace('rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#');
  store.registerDefaultNamespace('rdfs', 'http://www.w3.org/2000/01/rdf-schema#');
  store.registerDefaultNamespace('owl', 'http://www.w3.org/2002/07/owl#');
  store.registerDefaultNamespace('fresnel', 'http://www.w3.org/2004/09/fresnel#');

  this.store = store;
  this.config = config;
  this.options = $.extend(RDFE.Config.defaults.ontology, config.ontology);

  this.reset();

  this.prefixes = $.extend({}, RDFE.prefixes, config.prefixes);
}

RDFE.OntologyManager.prototype.init = function(options) {
  var self = this;
  self.reset();

  // ontologies init
  this.ontologiesParse(self.options.preloadOntologies);
  // fresnels init
  this.fresnelsParse(self.options.preloadFresnels);
  // individuals init
  this.individualsParse(self.options.preloadIndividuals);
}

RDFE.OntologyManager.prototype.reset = function(options) {
  var self = this;

  // ontologies
  this.ontologies = {};
  this.ontologyClasses = {};
  this.ontologyProperties = {};
  this.individuals = {};

  // fresnels
  this.fresnelLenses = {};
  this.fresnelFormats = {};
  this.fresnelGroups = {};

  this.templates = [];
}

RDFE.OntologyManager.prototype.prefixByOntology = function(url) {
  for (prefix in this.prefixes)
    if(this.prefixes[prefix] == url)
      return prefix;

  return null;
}

/*
 *
 * Denormalize URI
 *     foaf:Person => http://xmlns.com/foaf/0.1/Person
 *
 */
RDFE.OntologyManager.prototype.uriDenormalize = function(v) {
  var prefix = RDFE.uriPrefix(v);
  if (prefix) {
    if (!this.prefixes[prefix]) {
      RDFE.ontologyByPrefix(prefix);
    }
    if (this.prefixes[prefix]) {
      return this.prefixes[prefix] + v.substring(prefix.length + 1);
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
RDFE.OntologyManager.prototype.uriNormalize = function(v, fb) {
  var ontology = RDFE.uriOntology(v);
  if (ontology) {
    for (var prefix in this.prefixes) {
      if (this.prefixes[prefix] == ontology) {
        return prefix + ':' + v.substring(ontology.length);
      }
    }
  }
  // nothing found, return the fallback, undefined by default
  return fb;
}

RDFE.OntologyManager.prototype.graphClear = function(graph) {
  var self = this;
  self.store.clear(graph, function() {});
}

RDFE.OntologyManager.prototype.Ontology = function(graph, URI, options) {
  if (!URI || RDFE.isBlankNode(URI)) {
    return null;
  }
  var self = this;
  var ontology = self.ontologyByURI(URI);
  if (ontology) {
    if (graph && ontology.sources.indexOf(graph) == -1) {
      ontology.parse(graph, options);
    }
  } else {
    ontology = new RDFE.Ontology(self, graph, URI, options);
    $(self).trigger('ontologyLoaded', [ self, ontology ]);
  }

  return ontology;
}

RDFE.OntologyManager.prototype.OntologyClass = function(graph, URI, options) {
  var self = this;
  var ontologyClass = self.ontologyClassByURI(URI);
  if (ontologyClass) {
    if (graph && ontologyClass.sources.indexOf(graph) === -1) {
      ontologyClass.parse(graph, options);
    }
  } else {
    ontologyClass = new RDFE.OntologyClass(self, graph, URI, options);
  }

  return ontologyClass;
}

RDFE.OntologyManager.prototype.OntologyProperty = function(graph, URI, options) {
  var self = this;
  var ontologyProperty = self.ontologyPropertyByURI(URI);
  if (ontologyProperty) {
    if (graph && ontologyProperty.sources.indexOf(graph) === -1) {
      ontologyProperty.parse(graph, options);
    }
  } else {
    ontologyProperty = new RDFE.OntologyProperty(self, graph, URI, options);
  }

  return ontologyProperty;
}

RDFE.OntologyManager.prototype.OntologyIndividual = function(graph, URI, individualClass, options) {
  var self = this;
  var individual = self.individualByURI(URI);
  if (individual) {
    if (graph && individual.sources.indexOf(graph) === -1) {
      individual.parse(graph, options);
    } else {
      individualClass.individuals[URI] = individual;
    }
  } else {
    individual = new RDFE.OntologyIndividual(self, graph, URI, individualClass, options);
  }

  return individual;
}

RDFE.OntologyManager.prototype.ontologiesAsArray = function() {
  var self = this;
  var ontologies = [];
  for (v in self.ontologies) {
    ontologies.push(self.ontologies[v]);
  }
  return ontologies;
}

RDFE.OntologyManager.prototype.ontologyByURI = function(URI) {
  return this.ontologies[URI];
}

RDFE.OntologyManager.prototype.ontologyByPrefix = function(prefix) {
  return this.ontologies[this.prefixes[prefix]];
}

RDFE.OntologyManager.prototype.ontologyRemove = function(URI) {
  delete this.ontologies[URI];
}

RDFE.OntologyManager.prototype.ontologyClassByURI = function(URI) {
  return this.ontologyClasses[URI];
}

RDFE.OntologyManager.prototype.ontologyPropertyByURI = function(URI) {
  return this.ontologyProperties[URI];
}

RDFE.OntologyManager.prototype.individualByURI = function(URI) {
  return this.individuals[URI];
}

RDFE.OntologyManager.prototype.load = function(URI, params) {
  var self = this;
  var ioType = (params.ioType)? params.ioType: 'http';
  var IO = RDFE.IO.createIO(ioType);
  IO.type = ioType;
  IO.retrieveToStore(URI, self.store, URI, $.extend({"proxy": self.options.proxy}, params));
}

RDFE.OntologyManager.prototype.ontologyParse = function(URI, callParams) {
  var self = this;
  var $self = $(self);
  var params = $.extend({}, callParams);
  var options = $.extend(self.options, params);
  if (options.preloadOnly == true) {
    if (params.success) {
      params.success();
    }
    return;
  }

  var __success = function() {
    // ontology classes & properties parse
    var ontologies = [];
    var ontologyClasses = self.ontologyClassesParse(URI, options);
    self.ontologyPropertiesParse(URI, options);
    self.ontologyRestrictionsParse(URI, ontologyClasses, options);

    // Check if we have details for the ontology itself
    var sparql = RDFE.OM_ONTOLOGY_TEMPLATE.format(URI);
    self.store.execute(sparql, function(success, results) {
      if (!success) {
        console.error('ontology =>', results);
        if(options.error) {
          options.error();
        }
        return;
      }
      if (results.length) {
        var graph = URI;
        var ontology;
        for (var i = 0; i < results.length; i++) {
          var ontologyURI = results[i]["o"].value;
          console.log('Found owl:Ontology:', ontologyURI);
          // Fix for some ontlogies
          if ((graph.charAt(graph.length - 1) == '#') && (graph.substring(0, graph.length - 1) == ontologyURI)) {
            console.log('replacing onto uri', ontologyURI, 'with', graph);
            ontologyURI = graph;
          }
          if(self.ontologies[ontologyURI + '#']) {
            ontologyURI += '#';
          }
          else if(self.ontologies[ontologyURI + '/']) {
            ontologyURI += '/';
          }

          ontology = self.Ontology(graph, ontologyURI, options);
          ontology.parse(graph, {
            ontoUri: results[i]["o"].value
          });
          ontologies.push(ontology);
        }
      }
    });

    // clear graph after parse
    self.graphClear(URI);

    if (options.success) {
      options.success(_.head(ontologies));
    }

    $self.trigger('changed', [ self ]);
  };

  $self.trigger('loadingOntology', [ self, URI ]);

  var loadParams = {
    "ioType": params.ioType,
    "success": __success,
    "error": params.error
  };
  self.load(URI, loadParams);
}

RDFE.OntologyManager.prototype.ontologiesParse = function(ontologies, params) {
  var self = this;
  if (ontologies) {
    for (var i = 0, l = ontologies.length; i < l; i++) {
      self.ontologyParse(ontologies[i], params);
    }
  }
}

// ontology classes
RDFE.OntologyManager.prototype.ontologyClassesParse = function(graph, params) {
  var self = this;
  var ontologyClasses = [];
  var sparql = RDFE.OM_ONTOLOGY_CLASSES_TEMPLATE.format(graph);
  self.store.execute(sparql, function(success, results) {
    if (!success) {
      console.error('ontology =>', results);
      return;
    }
    for (var i = 0, l = results.length; i < l; i++) {
      var c = results[i]["c"].value;
      if (!RDFE.isBlankNode(c) && (c != self.uriDenormalize('rdfs:Class')) && (c != self.uriDenormalize('owl:Class'))) {
        var ontologyClass = self.OntologyClass(graph, c, params);
        ontologyClasses.push(ontologyClass);

        // add property to classes
        var sparql = RDFE.OM_ONTOLOGY_INDIVIDUALS_TEMPLATE.format(graph, c);
        self.store.execute(sparql, function(success, results) {
          if (!success) {
            console.error('ontology individuals =>', results);
            return;
          }
          for (var j = 0, m = results.length; j < m; j++) {
            var c = results[j]["i"].value;
            if (!_.isEmpty(c) && !RDFE.isBlankNode(c)) {
              self.OntologyIndividual(graph, c, ontologyClass, params);
            }
          }
        });
      }
    }
  });
  return ontologyClasses;
}

// ontology properties
RDFE.OntologyManager.prototype.ontologyPropertiesParse = function(graph, params) {
  var self = this;
  var sparql = RDFE.OM_ONTOLOGY_PROPERTIES_TEMPLATE.format(graph);
  self.store.execute(sparql, function(success, results) {
    if (!success) {
      console.error('ontology =>', results);
      return;
    }
    for (var i = 0, l = results.length; i < l; i++) {
      var p = results[i]["p"].value;
      var property = self.OntologyProperty(graph, p, params);
    }
  });
}

// ontology properties
RDFE.OntologyManager.prototype.ontologyRestrictionsParse = function(graph, ontologyClasses, options) {
  var self = this;
  for (var i = 0, l = ontologyClasses.length; i < l; i++) {
    var ontologyClass = ontologyClasses[i];
    if (ontologyClass.hasRestrictions) {
      var RDFE_TEMPLATE =
      '\n SELECT distinct ?v1 ?v2 ?v3 ' +
      '\n  FROM <{0}>' +
      '\n WHERE { ' +
      '\n         <{1}> rdfs:subClassOf ' +
      '\n         [ ' +
      '\n           owl:onProperty ?v1; ' +
      '\n           ?v2 ?v3 ' +
      '\n         ]. ' +
      '\n       } ' +
      '\n ORDER BY ?v1 ?v2 ';
      var sparql = RDFE_TEMPLATE.format(graph, ontologyClass.URI);
      self.store.execute(sparql, function(success, results) {
        if (success) {
          var property;
          var propertyURI = '',
              cardinalityURI = '',
              cardinalityValue = '';
          for (var i = 0, l = results.length; i < l; i++) {
            var v1 = RDFE.sparqlValue(results[i]['v1']);
            var v2 = RDFE.sparqlValue(results[i]['v2']);
            var v3 = RDFE.sparqlValue(results[i]['v3']);

            propertyURI = v1;

            if (self.uriDenormalize('rdf:type') == v2 && v3 == 'http://www.openlinksw.com/ontology/oplowl#AggregateRestriction') {
              console.log('Adding ', v3, 'for', propertyURI);
              ontologyClass.restrictions[propertyURI] = $.extend(ontologyClass.restrictions[propertyURI], { isAggregate: true });
            }

            else if (
                (self.uriDenormalize('owl:minCardinality') == v2) ||
                (self.uriDenormalize('owl:maxCardinality') == v2) ||
                (self.uriDenormalize('owl:cardinality') == v2)
               )
            {
              console.log('Adding ', v2, 'for', propertyURI);
              cardinalityURI = v2;
              cardinalityValue = v3;
              property = ontologyClass.properties[propertyURI];
              ontologyClass.restrictions[propertyURI] = ontologyClass.restrictions[propertyURI] || {};
              ontologyClass.restrictions[propertyURI][RDFE.uriLabel(cardinalityURI)] = parseInt(cardinalityValue);
            }
          }
        }
      });
    }
  }
}

RDFE.OntologyManager.prototype.FresnelLens = function(graph, URI, options) {
  var self = this;
  var fresnelLens = self.fresnelLensByURI(URI);
  if (fresnelLens) {
    if (graph && fresnelLens.sources.indexOf(graph) === -1) {
      fresnelLens.parse(graph, options);
    }
  } else {
    fresnelLens = new RDFE.FresnelLens(self, graph, URI, options);
  }

  return fresnelLens;
}

RDFE.OntologyManager.prototype.FresnelFormat = function(graph, URI, options) {
  var self = this;
  var fresnelFormat = self.fresnelFormatByURI(URI);
  if (fresnelFormat) {
    if (graph && fresnelFormat.sources.indexOf(graph) === -1) {
      fresnelFormat.parse(graph, options);
    }
  } else {
    fresnelFormat = new RDFE.FresnelFormat(self, graph, URI, options);
  }

  return fresnelFormat;
}

RDFE.OntologyManager.prototype.FresnelGroup = function(graph, URI, options) {
  var self = this;
  var fresnelGroup = self.fresnelGroupByURI(URI);
  if (fresnelGroup) {
    if (graph && fresnelGroup.sources.indexOf(graph) === -1) {
      fresnelGroup.parse(graph, options);
    }
  } else {
    fresnelGroup = new RDFE.FresnelGroup(self, graph, URI, options);
  }

  return fresnelGroup;
}

RDFE.OntologyManager.prototype.fresnelLensByURI = function(URI) {
  return this.fresnelLenses[URI];
}

RDFE.OntologyManager.prototype.fresnelFormatByURI = function(URI) {
  return this.fresnelFormats[URI];
}

RDFE.OntologyManager.prototype.fresnelGroupByURI = function(URI) {
  return this.fresnelGroups[URI];
}

RDFE.OntologyManager.prototype.fresnelParse = function(URI, callParams) {
  // console.log(URI);
  var self = this;
  var params = $.extend({}, callParams);
  var $self = $(self);
  if (self.options.preloadOnly == true) {
    if (params.success) {
      params.success();
    }
    return;
  }

  var __success = (function(params) {
    return function() {
      // fresnel lenses, formats & groups parse
      self.fresnelLensesParse(URI, params);
      self.fresnelFormatsParse(URI, params);
      self.fresnelGroupsParse(URI, params);

      // clear graph after parse
      self.graphClear(URI);

      if (params.success) {
        params.success();
      }

      $self.trigger('changed', [ self ]);
    }
  })(params);

  var loadParams = {
    "ioType": params.ioType,
    "success": __success,
    "error": params.error
  };
  self.load(URI, loadParams);
}

RDFE.OntologyManager.prototype.fresnelsParse = function(fresnels, params) {
  var self = this;
  if (fresnels) {
    for (var i = 0, l = fresnels.length; i < l; i++) {
      self.fresnelParse(fresnels[i], params);
    }
  }
}

// fresnel lenses
RDFE.OntologyManager.prototype.fresnelLensesParse = function(graph, params) {
  var self = this;
  if (self.options.fresnelLenses) {
    var sparql = RDFE.OM_FRESNEL_LENSES_TEMPLATE.format(graph);
    self.store.execute(sparql, function(success, results) {
      if (!success) {
        console.error('fresnel groups =>', results);
        return;
      }
      for (var i = 0, l = results.length; i < l; i++) {
        var x = results[i]["x"].value;
        self.fresnelLenses[x] = self.FresnelLens(graph, x, params);
      }
    });
  }
}

// fresnel formats
RDFE.OntologyManager.prototype.fresnelFormatsParse = function(graph, params) {
  var self = this;
  if (self.options.fresnelFormats) {
    var sparql = RDFE.OM_FRESNEL_FORMATS_TEMPLATE.format(graph);
    self.store.execute(sparql, function(success, results) {
      if (!success) {
        console.error('fresnel groups =>', results);
        return;
      }
      for (var i = 0, l = results.length; i < l; i++) {
        var x = results[i]["x"].value;
        self.fresnelFormats[x] = self.FresnelFormat(graph, x, params);
      }
    });
  }
}

// fresnel groups
RDFE.OntologyManager.prototype.fresnelGroupsParse = function(graph, params) {
  var self = this;
  if (self.options.fresnelGroups) {
    var sparql = RDFE.OM_FRESNEL_GROUPS_TEMPLATE.format(graph);
    self.store.execute(sparql, function(success, results) {
      if (!success) {
        console.error('fresnel groups =>', results);
        return;
      }
      for (var i = 0, l = results.length; i < l; i++) {
        var x = results[i]["x"].value;
        self.fresnelGroups[x] = self.FresnelGroup(graph, x, params);
      }
    });
  }
}

// FIXME: why is the classLensDomain not the key in the self.fresnelLenses dict??? Who cares about the uris for the lenses??
RDFE.OntologyManager.prototype.findFresnelLens = function(domainURI) {
  var self = this;
  for (v in self.fresnelLenses) {
    var x = self.fresnelLenses[v];
    if (x.classLensDomain == domainURI) {
      return x;
    }
  }
  // FIXME: check super-classes for lens definitions
  return null;
}

RDFE.OntologyManager.prototype.findFresnelFormat = function(propertyURI) {
  var self = this;
  for (v in self.fresnelFormats) {
    var x = self.fresnelFormats[v];
    if (x.propertyFormatDomain == propertyURI) {
      return x;
    }
  }
  return null;
}

RDFE.OntologyManager.prototype.findFresnelGroup = function(groupURI) {
  var self = this;
  for (v in self.fresnelGroups) {
    var x = self.fresnelGroups[v];
    if (x.URI == groupURI) {
      return x;
    }
  }
  return null;
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

RDFE.OntologyManager.prototype.allClasses = function() {
  var classes = [];
  for (v in this.ontologyClasses) {
    classes.push(this.ontologyClasses[v]);
  }
  return classes;
};

RDFE.OntologyManager.prototype.allProperties = function(domain) {
  var pl = [];
  for(uri in this.ontologyProperties) {
    var p = this.ontologyProperties[uri];
    // FIXME: include super-classes for domain-check
    if(!domain || p.domain.indexOf(domain))
      pl.push(p);
  }
  return pl;
};

RDFE.OntologyManager.prototype.individualParse = function(URI, callParams) {
  // console.log(URI);
  var self = this;
  var params = $.extend({}, callParams);
  var $self = $(self);
  if (self.options.preloadOnly == true) {
    if (params.success) {
      params.success();
    }
    return;
  }

  var __success = (function(params) {
    return function() {
      // individuals parse

      // add property to classes
      var sparql = RDFE.OM_INDIVIDUALS_TEMPLATE.format(URI);
      self.store.execute(sparql, function(success, results) {
        if (!success) {
          console.error('ontology individuals =>', results);
          return;
        }
        for (var j = 0, m = results.length; j < m; j++) {
          var i = results[j]["i"].value;
          var c = self.OntologyClass(URI, results[j]["c"].value, params);
          if (!_.isEmpty(i) && !RDFE.isBlankNode(i) && !RDFE.isBlankNode(c)) {
            self.OntologyIndividual(URI, i, c, params);
          }
        }
      });

      // clear graph after parse
      self.graphClear(URI);

      if (params.success) {
        params.success();
      }

      $self.trigger('changed', [ self ]);
    }
  })(params);

  var loadParams = {
    "ioType": params.ioType,
    "success": __success,
    "error": params.error
  };
  self.load(URI, loadParams);
}

RDFE.OntologyManager.prototype.individualsParse = function(individuals, params) {
  var self = this;
  if (individuals) {
    for (var i = 0, l = individuals.length; i < l; i++) {
      self.individualParse(individuals[i], params);
    }
  }
}

/*
 *
 * Ontology
 *
 */
RDFE.Ontology = function(ontologyManager, graph, URI, options) {
  // console.log('ontology =>', URI);
  var self = this;

  this.options = $.extend({}, options);
  this.URI = URI;
  this.prefix = ontologyManager.prefixByOntology(URI);
  this.sources = [];
  this.classes = {};
  this.properties = {};

  this.manager = ontologyManager;
  this.manager.ontologies[URI] = this;

  this.parse(graph, options);
}

RDFE.Ontology.prototype.parse = function(graph, options) {
  var self = this;
  options = options || {};
  if (!graph) {
    return;
  }
  if (self.sources.indexOf(graph) == -1) {
    self.sources.push(graph);
  }
  self.manager.store.node(options.ontoUri || self.URI, graph, function(success, results) {
    if (!success) {
      console.error('ontology =>', results);
      return;
    }
    // console.log('ontology results =>', results.length);
    for (var i = 0, l = results.length; i < l; i++) {
      var p = results.triples[i].predicate.valueOf();
      var o = results.triples[i].object.valueOf();
      // console.log('ontology =>', p, o);
      if (p == self.manager.uriDenormalize('rdfs:label'))
        self.label = RDFE.coalesce(self.label, o);

      else if (p == self.manager.uriDenormalize('rdfs:comment'))
        self.comment = RDFE.coalesce(self.comment, o);

      else if (p == self.manager.uriDenormalize('dc:title'))
        self.title = RDFE.coalesce(self.title, o);

      else if (p == self.manager.uriDenormalize('dc:description'))
        self.description = RDFE.coalesce(self.description, o);

      else if (p == self.manager.uriDenormalize('dc:description'))
        self.comment = RDFE.coalesce(self.comment, o);
    }
  });
}

RDFE.Ontology.prototype.classesAsArray = function() {
  var self = this;
  var clases = [];
  for (v in self.classes) {
    clases.push(self.classes[v]);
  }
  return clases;
}

RDFE.Ontology.prototype.ontologyClassByURI = function(classURI) {
  return this.classes[URI];
}

RDFE.Ontology.prototype.propertyByURI = function(propertyURI) {
  return this.properties[URI];
}

RDFE.Ontology.prototype.allProperties = function(domain) {
  var pl = [];
  for(uri in this.properties) {
    var p = this.properties[uri];
    // FIXME: include super-classes for domain-check
    if(!domain || p.domain.indexOf(domain))
      pl.push(p);
  }
  return pl;
};

/*
 *
 * Ontology Class
 *
 */
RDFE.OntologyClass = function(ontologyManager, graph, URI, options) {
  // console.log('class =>', URI);
  var self = this;

  this.options = $.extend({}, options);
  this.URI = URI;
  this.curi = ontologyManager.uriNormalize(URI);
  this.name = URI.split(/[/#]/).pop();
  this.sources = [];
  this.subClassOf = [];
  this.superClassOf = [];
  this.disjointWith = [];
  this.properties = {};
  this.individuals = {};
  this.restrictions = {};

  this.manager = ontologyManager;
  this.manager.ontologyClasses[URI] = self;

  this.ontology = self.manager.Ontology(graph, RDFE.uriOntology(URI), options);
  if (this.ontology) {
    this.ontology.classes[URI] = self;
  }

  this.parse(graph, options);
}

RDFE.OntologyClass.prototype.parse = function(graph, options) {
  var self = this;
  if (!graph) {
    return;
  }
  if (self.sources.indexOf(graph) == -1) {
    self.sources.push(graph);
  }
  ontologyManager.store.node(self.URI, graph, function(success, results) {
    if (!success) {
      console.error('class =>', results);
      return;
    }
    // console.log('class results =>', results.length);
    for (var i = 0, l = results.length; i < l; i++) {
      var p = results.triples[i].predicate.valueOf();
      var o = results.triples[i].object.valueOf();
      // console.log('class =>', p, o);
      if (p == self.manager.uriDenormalize('rdfs:label'))
        self.label = RDFE.coalesce(self.label, o);

      else if (p == self.manager.uriDenormalize('rdfs:comment'))
        self.comment = RDFE.coalesce(self.comment, o);

      else if (p == self.manager.uriDenormalize('dc:title'))
        self.title = RDFE.coalesce(self.title, o);

      else if (p == self.manager.uriDenormalize('dc:description'))
        self.description = RDFE.coalesce(self.description, o);

      else if (p == self.manager.uriDenormalize('rdfs:subClassOf')) {
        if (RDFE.isBlankNode(o)) { // FIXME: this sounds like an assumption one could easily break!
          self.hasRestrictions = true;
        } else {
          var sc = self.manager.OntologyClass(graph, o, options);
          self.subClassOf.push(sc);
          sc.superClassOf.push(self);
        }
      }
      else if (p == self.manager.uriDenormalize('owl:disjointWith'))
        self.disjointWith.push(o);
    }
  });
}

RDFE.OntologyClass.prototype.propertiesAsArray = function() {
  var self = this;
  var properties = [];
  for (v in self.properties) {
    properties.push(self.properties[v]);
  }
  return properties;
}

RDFE.OntologyClass.prototype.maxCardinalityForProperty = function(p, cc) {
  var prop = this.restrictions[p],
      c = null;

  // check if this class has a cardinality itself
  if(prop) {
    c = prop.cardinality || prop.maxCardinality;
    if(c)
      return c;
  }

  // check super-classes (with loop-protection)
  for(var i = 0; i < this.subClassOf; i++) {
    var sc = this.subClassOf[i];
    if($.inArray(sc, cc) < 0) {
      cc = cc || [];
      cc.push(sc);
      c = this.manager.ontologyClassByURI(sc).maxCardinalityForProperty(p, cc);
      if(c) {
        return c;
      }
    }
    else {
      console.log('CAUTION: Found sub-class loop in ', cc);
    }
  }

  return null;
};

RDFE.OntologyClass.prototype.isAggregateProperty = function(p, cc) {
  var prop = this.restrictions[p];

  // check if this class has a cardinality itself
  if(prop) {
    if(prop.isAggregate)
      return true;
  }

  // check super-classes (with loop-protection)
  for(var i = 0; i < this.subClassOf; i++) {
    var sc = this.subClassOf[i];
    if($.inArray(sc, cc) < 0) {
      cc = cc || [];
      cc.push(sc);
      if(this.manager.ontologyClassByURI(sc).isAggregate(p, cc)) {
        return true;
      }
    }
    else {
      console.log('CAUTION: Found sub-class loop in ', cc);
    }
  }

  return false;
};

RDFE.OntologyClass.prototype.getIndividuals = function(includeSuper, cc) {
  var iv = this.individuals;
  if(includeSuper) {
    for(var i = 0; i < this.superClassOf.length; i++) {
      var sc = this.superClassOf[i];
      if($.inArray(sc.URI, cc) < 0) {
        cc = cc || [];
        cc.push(sc.URI);
        iv = _.union(iv, this.superClassOf[i].getIndividuals(true, cc));
      }
    }
  }
  return iv;
};

/*
 *
 * Ontology Property
 *
 */
RDFE.OntologyProperty = function(ontologyManager, graph, URI, options) {
  // console.log('property =>', URI);
  var self = this;

  this.options = $.extend({}, options);
  this.URI = URI;
  this.curi = ontologyManager.uriNormalize(URI);
  this.name = URI.split(/[/#]/).pop();
  this.sources = [];
  this.subPropertyOf = [];

  this.manager = ontologyManager;
  this.manager.ontologyProperties[URI] = self;

  this.ontology = self.manager.Ontology(graph, RDFE.uriOntology(URI), options);
  if(this.ontology)
    this.ontology.properties[URI] = self;

  this.parse(graph, options);
}

RDFE.OntologyProperty.prototype.parse = function(graph, options) {
  var self = this;
  if (!graph) {
    return;
  }
  if (self.sources.indexOf(graph) == -1) {
    self.sources.push(graph);
  }
  self.manager.store.node(self.URI, graph, function(success, results) {
    if (!success) {
      console.error('property =>', results);
      return;
    }
    // console.log('property results =>', results.length);
    for (var i = 0, l = results.length; i < l; i++) {
      var p = results.triples[i].predicate.valueOf();
      var o = results.triples[i].object.valueOf();
      // console.log('property =>', p, o);
      if (p == self.manager.uriDenormalize('rdf:type')) {
        if      (o == self.manager.uriDenormalize('rdf:Property'))
          self.class = RDFE.coalesce(self.class, o);

        else if (o == self.manager.uriDenormalize('owl:ObjectProperty'))
          self.class = o;

        else if (o == self.manager.uriDenormalize('owl:DatatypeProperty'))
          self.class = o;

      }
      else if (p == self.manager.uriDenormalize('rdfs:label'))
        self.label = RDFE.coalesce(self.label, o);

      else if (p == self.manager.uriDenormalize('rdfs:comment'))
        self.comment = RDFE.coalesce(self.comment, o);

      else if (p == self.manager.uriDenormalize('dc:title'))
        self.title = RDFE.coalesce(self.title, o);

      else if (p == self.manager.uriDenormalize('dc:description'))
        self.description = RDFE.coalesce(self.description, o);

      else if (p == self.manager.uriDenormalize('rdfs:subPropertyOf'))
        self.subPropertyOf.push(o);

      else if (p == self.manager.uriDenormalize('rdfs:range'))
        self.range = RDFE.coalesce(self.range, o); // TODO: would be nice if this was an actual Class object rather than a string. Again, if it does not exist, an empty one can be created.

      else if (!self.domain && (p == self.manager.uriDenormalize('rdfs:domain'))) {
        self.domain = RDFE.collectionQuery(self.manager.store, graph, self.URI, 'rdfs:domain', o);
        for (var j = 0, m = self.domain.length; j < m; j++) {
          var ontologyClass = self.manager.OntologyClass(graph, self.domain[j]);
          self.domain[j] = ontologyClass;
          ontologyClass.properties[self.URI] = self;
        }
      }

      else if (p == self.manager.uriDenormalize('owl:inverseOf'))
        self.inverseOf = self.manager.OntologyProperty(graph, o, options);
    }
  });
}

RDFE.OntologyProperty.prototype.hasDomain = function(domain) {
  var self = this;
  if (self.domain) {
    for (var j = 0; j < self.domain.length; j++) {
      if (domain == self.domain[j]) {
        return true;
      }
    }
  }
  return false;
};

RDFE.OntologyProperty.prototype.getRange = function(pp) {
  // check if this property has a range itself
  var r = this.range;
  if(r) {
    return r;
  }

  // check super-properties (with loop-protection)
  for(var i = 0; i < this.subPropertyOf.length; i++) {
    var sp = this.subPropertyOf[i];
    if($.inArray(sp, pp) < 0) {
      pp = pp || [];
      pp.push(sp);
      console.log('Checking sub-property', sp, sp.range)
      r = this.manager.ontologyPropertyByURI(sp).getRange(pp);
      if(r) {
        return r;
      }
    }
    else {
      console.log('CAUTION: Found sub-property loop in ', pp);
    }
  }

  return undefined;
}

/*
 *
 * Ontology Individual
 *
 */
RDFE.OntologyIndividual = function(ontologyManager, graph, URI, individualClass, options) {
  // console.log('individual =>', URI);
  var self = this;

  this.options = $.extend({}, options);
  this.URI = URI;
  this.curi = ontologyManager.uriNormalize(URI);
  this.name = URI.split(/[/#]/).pop();
  this.sources = [];

  this.manager = ontologyManager;
  this.manager.individuals[URI] = this;
  if (individualClass) {
    individualClass.individuals[URI] = this;
  }
  this.parse(graph, options);
}

RDFE.OntologyIndividual.prototype.parse = function(graph, options) {
  var self = this;
  if (!graph) {
    return;
  }
  if (self.sources.indexOf(graph) == -1) {
    self.sources.push(graph);
  }
  self.manager.store.node(self.URI, graph, function(success, results) {
    if (!success) {
      console.error('individual =>', results);
      return;
    }
    // console.log('individual results =>', results.length);
    for (var i = 0, l = results.length; i < l; i++) {
      var p = results.triples[i].predicate.valueOf();
      var o = results.triples[i].object.valueOf();
      // console.log('individual =>', RDFE.uriNormalize(p), o);
      if ($.inArray(p, self.manager.config.labelProps) >= 0)
        self.label = RDFE.coalesce(self.label, o);

      else if (p == self.manager.uriDenormalize('rdfs:comment'))
        self.comment = RDFE.coalesce(self.comment, o);

      else if (p == self.manager.uriDenormalize('dc:title'))
        self.title = RDFE.coalesce(self.title, o);

      else if (p == self.manager.uriDenormalize('dc:description'))
        self.description = RDFE.coalesce(self.description, o);

      else if (p == self.manager.uriDenormalize('rdf:type'))
        self.class = self.manager.OntologyClass(graph, o, options);
    }
  });
}

/*
 *
 * Fresnel Lens
 *
 */
RDFE.FresnelLens = function(ontologyManager, graph, URI, options) {
  // console.log('fresnel lens =>', URI);
  var self = this;
  this.URI = URI;
  this.sources = [];

  this.manager = ontologyManager;
  this.manager.fresnelLenses[URI] = this;
  this.showProperties = [];
  this.hideProperties = [];

  this.parse(graph, options);
}

RDFE.FresnelLens.prototype.parse = function(graph, options) {
  var self = this;
  if (!graph) {
    return;
  }
  if (self.sources.indexOf(graph) == -1) {
    self.sources.push(graph);
  }
  self.manager.store.node(self.URI, graph, function(success, results) {
    if (!success) {
      console.error('fresnel lens =>', results);
      return;
    }
    // console.log('fresnel lens =>', results.length);
    for (var i = 0, l = results.length; i < l; i++) {
      var p = results.triples[i].predicate.valueOf();
      var o = results.triples[i].object.valueOf();
      // console.log('lens =>', RDFE.uriNormalize(p), o);
      if (p == self.manager.uriDenormalize('fresnel:classLensDomain'))
        self.classLensDomain = RDFE.coalesce(self.classLensDomain, o);

      else if (p == self.manager.uriDenormalize('fresnel:instanceFormatDomain'))
        self.instanceFormatDomain = RDFE.coalesce(self.instanceFormatDomain, o);

      else if (p == self.manager.uriDenormalize('fresnel:group'))
        self.group = RDFE.coalesce(self.group, o);

      else if (p == self.manager.uriDenormalize('fresnel:purpose'))
        self.purpose = RDFE.coalesce(self.purpose, o);

      else if (p == self.manager.uriDenormalize('fresnel:showProperties'))
        self.showProperties = RDFE.collectionQuery(self.manager.store, graph, self.URI, 'fresnel:showProperties', o, 'fresnel');

      else if (p == self.manager.uriDenormalize('fresnel:hideProperties'))
        self.hideProperties = RDFE.collectionQuery(self.manager.store, graph, self.URI, 'fresnel:hideProperties', o, 'fresnel');
    }
  });
}

/*
 *
 * Fresnel Format
 *
 */
RDFE.FresnelFormat = function(ontologyManager, graph, URI, options) {
  // console.log('fresnel format =>', URI);
  var self = this;

  this.URI = URI;
  this.sources = [];
  this.propertyFormatDomain = [];

  this.manager = ontologyManager;
  this.manager.fresnelFormats[URI] = this;

  this.parse(graph, options);
}

RDFE.FresnelFormat.prototype.parse = function(graph, options) {
  var self = this;
  if (!graph) {
    return;
  }
  if (self.sources.indexOf(graph) == -1) {
    self.sources.push(graph);
  }
  self.manager.store.node(self.URI, graph, function(success, results) {
    if (!success) {
      console.error('fresnel format =>', results);
      return;
    }
    // console.log('fresnel format =>', results.length);
    for (var i = 0, l = results.length; i < l; i++) {
      var p = results.triples[i].predicate.valueOf();
      var o = results.triples[i].object.valueOf();
      // console.log('format =>', RDFE.uriNormalize(p), o);
      if (p == self.manager.uriDenormalize('fresnel:label'))
        self.label = RDFE.coalesce(self.label, o);

      else if (p == self.manager.uriDenormalize('fresnel:group'))
        self.group = RDFE.coalesce(self.group, o);

      else if (p == self.manager.uriDenormalize('fresnel:value'))
        self.value = RDFE.coalesce(self.value, o);

      else if (p == self.manager.uriDenormalize('fresnel:propertyStyle'))
        self.propertyStyle = RDFE.coalesce(self.propertyStyle, o);

      else if (p == self.manager.uriDenormalize('fresnel:resourceStyle'))
        self.resourceStyle = RDFE.coalesce(self.resourceStyle, o);

      else if (p == self.manager.uriDenormalize('fresnel:valueStyle'))
        self.valueStyle = RDFE.coalesce(self.valueStyle, o);

      else if (p == self.manager.uriDenormalize('fresnel:labelStyle'))
        self.labelStyle = RDFE.coalesce(self.labelStyle, o);

      else if (p == self.manager.uriDenormalize('fresnel:propertyFormatDomain'))
        self.propertyFormatDomain.push(o);
    }
  });
}

/*
 *
 * Fresnel Group
 *
 */
RDFE.FresnelGroup = function(ontologyManager, graph, URI, options) {
  // console.log('fresnel group =>', URI);
  var self = this;
  this.URI = URI;
  this.sources = [];

  this.manager = ontologyManager;
  this.manager.fresnelGroups[URI] = this;

  this.parse(graph, options);
}

RDFE.FresnelGroup.prototype.parse = function(graph, options) {
  var self = this;
  if (!graph) {
    return;
  }
  if (self.sources.indexOf(graph) == -1) {
    self.sources.push(graph);
  }
  self.manager.store.node(self.URI, graph, function(success, results) {
    if (!success) {
      console.error('fresnel group =>', results);
      return;
    }
    // console.log('fresnel group =>', results.length);
    for (var i = 0, l = results.length; i < l; i++) {
      var p = results.triples[i].predicate.valueOf();
      var o = results.triples[i].object.valueOf();
      // console.log('group =>', RDFE.uriNormalize(p), o);
      if (p == self.manager.uriDenormalize('fresnel:stylesheetLink'))
        self.stylesheetLink = RDFE.coalesce(self.stylesheetLink, o);

      else if (p == self.manager.uriDenormalize('fresnel:containerStyle'))
        self.containerStyle = RDFE.coalesce(self.containerStyle, o);
    }
  });
}
