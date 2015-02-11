if (typeof String.prototype.startsWith != 'function') {
  // see below for better implementation!
  String.prototype.startsWith = function(str) {
    return this.indexOf(str) == 0;
  };
}

if(!window.RDFE)
  window.RDFE = {};

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
 * Returns first non null argument
 *
 */
RDFE.coalesce = function() {
  for (i = 0; i < arguments.length; i++) {
    if ((typeof arguments[i] !== 'undefined') && (arguments[i] !== null)) {
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
  var host = 'http://prefix.cc/{0}.file.json'.format(prefix);
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
 * Ontology Manager
 *
 */
RDFE.OntologyManager = function(config) {
  this.config = config || {};
  this.options = $.extend(RDFE.Config.defaults.ontology, this.config.ontology);

  this.reset();

  this.prefixes = $.extend({}, RDFE.prefixes, this.config.prefixes);
}

RDFE.OntologyManager.prototype.init = function(options) {
  var self = this;

  this.reset();

  var options = $.extend({}, options);
  var items = self.options.preloadOntologies || [];

  var fn = function (i, options) {
    if (i < items.length) {
      var item = items[i];
      var __callback = function (options, itemMessage) {
        return function () {
          $(self).trigger(itemMessage, [self, item]);
          fn(i+1, options);
        }
      };
      var params = {
        "success":  __callback(options, 'loadingFinished'),
        "error": __callback(options, 'loadingFailed')
      }
      // console.log('loading', item);
      $(self).trigger('loading', [self, item]);
      self.parseOntologyFile(item, params);
    } else {
      if (options.success) {
        options.success();
      }
    }
  };

  fn(0, options);
}

RDFE.OntologyManager.prototype.reset = function(options) {
  // ontologies
  this.ontologies = {};
  this.ontologyClasses = {};
  this.ontologyProperties = {};
  this.individuals = {};
  this.fresnelLenses = {};
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
  IO.retrieve(URI, $.extend({"proxy": self.options.proxy}, params));
}

RDFE.OntologyManager.prototype.parseOntologyFile = function(URI, params) {
  var self = this,
      labels = {}, // maps uris to labels
      comments = {}, // maps uris to comments
      restrictions = {}, // maps blank nodes to restriction details
      restrictionMap = {}, // maps class uri to restriction blank node
      collections = {}; // maps collection nodes


  function findOrCreateOntology(uri) {
    return (self.ontologies[uri] = self.ontologies[uri] || new RDFE.Ontology(self, uri));
  };

  function findOrCreateClass(uri) {
    if(N3.Util.isBlank(uri)) {
      return null;
    }

    var c = self.ontologyClasses[uri];
    if(!c) {
      self.ontologyClasses[uri] = c = new RDFE.OntologyClass(self, uri);
      c.ontology = findOrCreateOntology(RDFE.uriOntology(uri));
      c.ontology.classes[uri] = c;
    }
    return c;
  };

  function findOrCreateProperty(uri) {
    var c = self.ontologyProperties[uri];
    if(!c) {
      self.ontologyProperties[uri] = c = new RDFE.OntologyProperty(self, uri);
      c.ontology = findOrCreateOntology(RDFE.uriOntology(uri));
      c.ontology.properties[uri] = c;
    }
    return c;
  }

  function findOrCreateIndividual(uri) {
    return (self.individuals[uri] = self.individuals[uri] || new RDFE.OntologyIndividual(self, uri));
  }

  function findOrCreateLens(uri) {
    return (self.fresnelLenses[uri] = self.fresnelLenses[uri] || new RDFE.FresnelLens(self, uri));
  }

  /**
   * Resolve an rdf collection for a given node uri (typically a blank node)
   * using the relations in @p collections.
   */
  function resolveCollection(uri) {
    var r = [];
    var cur = uri;
    while(cur) {
      var curNode = collections[cur];
      cur = null;
      if(curNode) {
        if(curNode.first) {
          r.push(curNode.first);
        }
        cur = curNode.rest;
      }
    }
    return r;
  }

  // handle a single triple from the N3 parser
  var handleTriple = function(triple) {
    var s = triple.subject,
        p = triple.predicate,
        o = triple.object;

    // handle the type triples
    if(p === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
      switch(o) {
        case 'http://www.w3.org/2000/01/rdf-schema##Class':
        case 'http://www.w3.org/2002/07/owl#Class':
          findOrCreateClass(s);
          break;

        case 'http://www.w3.org/2002/07/owl#ObjectProperty':
        case 'http://www.w3.org/2002/07/owl#DatatypeProperty':
        case 'http://www.w3.org/1999/02/22-rdf-syntax-ns#Property':
          findOrCreateProperty(s);
          break;

        case 'http://www.w3.org/2002/07/owl#Restriction':
          restrictions[s] = restrictions[s] || {};
          break;

        case 'http://www.openlinksw.com/ontology/oplowl#AggregateRestriction':
          var r = restrictions[s] = restrictions[s] || {};
          r.isAggregate = true;
          break;

        case 'http://www.openlinksw.com/ontology/oplowl#UniqueIdRestriction':
          var r = restrictions[s] = restrictions[s] || {};
          r.isUniqueId = true;
          break;

        case 'http://www.w3.org/2004/09/fresnel#Lens':
          findOrCreateLens(s);
          break;

        default:
          // any other type is an individual to us
          var indi = findOrCreateIndividual(s),
              oc = findOrCreateClass(o);
          indi.type = oc;
          oc.individuals[s] = indi;
          break;
      }
    }

    else if(p === 'http://www.w3.org/2000/01/rdf-schema#label') {
      labels[s] = N3.Util.getLiteralValue(o);
    }

    else if(p === 'http://www.w3.org/2000/01/rdf-schema#comment') {
      comments[s] = N3.Util.getLiteralValue(o);
    }

    else if(p === 'http://www.w3.org/2000/01/rdf-schema#subClassOf') {
      var cc = findOrCreateClass(s);
      if(N3.Util.isBlank(o)) {
        // remember blank node for restriction handling later
        var r = restrictionMap[s] = restrictionMap[s] || [];
        r.push(o);
      }
      else {
        pc = findOrCreateClass(o)
        cc.subClassOf.push(pc);
        pc.superClassOf.push(cc);
      }
    }

    else if(p === 'http://www.w3.org/2000/01/rdf-schema#subPropertyOf') {
      var pc = findOrCreateProperty(o),
          cc = findOrCreateProperty(s);
      cc.subPropertyOf.push(pc);
      pc.superPropertyOf.push(cc);
    }

    else if(p === 'http://www.w3.org/2000/01/rdf-schema#domain') {
      var c = findOrCreateProperty(s);
      if(N3.Util.isBlank(o)) {
        // postpone the collection query for later
        c.domain.push(o);
      }
      else {
        c.domain.push(findOrCreateClass(o));
      }
    }

    else if(p === 'http://www.w3.org/2000/01/rdf-schema#range') {
      var c = findOrCreateProperty(s);
      // we store the range as a uri since it could be a literal. TODO: maybe introduce literal types or sth like that.
      c.range = o;
    }

    else if(p === 'http://www.w3.org/2002/07/owl#onProperty') {
      var r = restrictions[s] = restrictions[s] || {};
      r.onProperty = o;
    }

    else if(p === 'http://www.w3.org/2002/07/owl#cardinality' ||
            p === 'http://www.w3.org/2002/07/owl#maxCardinality' ||
            p === 'http://www.w3.org/2002/07/owl#minCardinality' ||
            p === 'http://www.openlinksw.com/ontology/oplowl#hasCustomLabel' ||
            p === 'http://www.openlinksw.com/ontology/oplowl#hasCustomComment') {
      var r = restrictions[s] = restrictions[s] || {};
      r[RDFE.uriLabel(p)] = N3.Util.getLiteralValue(o);
    }

    else if(p === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#first' ||
            p === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#rest') {
      if(o !== 'http://www.w3.org/1999/02/22-rdf-syntax-ns#nil') {
        var c = collections[s] = collections[s] || {};
        c[RDFE.uriLabel(p)] = o;
      }
    }

    else if(p === 'http://www.w3.org/2002/07/owl#unionOf') {
      // poor-man's owl:unionOf handling which simply converts it to a plain rdf collection
      collections[s] = { rest: o };
    }

    else if(p === 'http://www.w3.org/2004/09/fresnel#showProperties' ||
            p === 'http://www.w3.org/2004/09/fresnel#hideProperties' ||
            p === 'http://www.w3.org/2004/09/fresnel#classLensDomain') {
      var f = findOrCreateLens(s);
      f[RDFE.uriLabel(p)] = o; // this will be resovled as a collection later
    }
  };

  // map the cached values in labels, comments, and restrictions to the previously parsed classes and properties
  var finishParse = function() {
    for(uri in self.ontologyClasses) {
      var c = self.ontologyClasses[uri];
      c.label = c.label || labels[uri];
      c.comment = c.comment || comments[uri];

      var rm = restrictionMap[uri];
      if(rm) {
        for(var i = 0; i < rm.length; i++) {
          var r = restrictions[rm[i]];
          if(r.onProperty) {
            var rr = _.clone(r);
            delete rr.onProperty;
            c.restrictions[r.onProperty] = rr;
          }
        }
      }
    }

    for(uri in self.ontologyProperties) {
      var p = self.ontologyProperties[uri];
      p.label = p.label || labels[uri];
      p.comment = p.comment || comments[uri];

      // resolve the range in case it is a collection (owl:UnionOf)
      // TODO: convert range into an array and drop rangeAll. This requires changes throughout RDFE
      if(N3.Util.isBlank(p.range)) {
        p.rangeAll = resolveCollection(p.range);
        p.range = _.first(p.rangeAll);
      }

      // we store the domain as a list
      var dmn = _.clone(p.domain);
      p.domain = [];
      for(var i = 0; i < dmn.length; i++) {
        if(!dmn[i].URI && N3.Util.isBlank(dmn[i])) {
          p.domain = _.union(p.domain, resolveCollection(dmn[i]));
        }
        else {
          p.domain.push(dmn[i]);
        }
      }
    }

    for(uri in self.ontologies) {
      // ontology URIs often are stripped of the trailing '#'
      var o = self.ontologies[uri];
      o.label = o.label || labels[uri] || labels[uri.substring(0, uri.length - 1)];
      o.comment = o.comment || comments[uri] || comments[uri.substring(0, uri.length - 1)];
    }

    for(uri in self.individuals) {
      var p = self.individuals[uri];
      // TODO: use config.labelProps for individuals
      p.label = p.label || labels[uri];
      p.comment = p.comment || comments[uri];
    }

    for(uri in self.fresnelLenses) {
      var p = self.fresnelLenses[uri];
      p.label = p.label || labels[uri];
      p.comment = p.comment || comments[uri];
      p.showProperties = resolveCollection(p.showProperties);
      p.hideProperties = resolveCollection(p.hideProperties);
    }

    // cleanup locally
    delete labels;
    delete comments;
    delete restrictionMap;
    delete restrictions;
    delete collections;

    $(self).trigger('changed', [ self ]);
  };

  // parse the ttl gotten from the URI
  var parseTripels = function(data, contentType) {
    if(contentType.length > 0 && contentType.indexOf('turtle') < 0) {
      console.error('Only Turtle files can be parsed in the ontology manager.');
      if(params.error) {
        params.error();
      }
    }
    else {
      var parser = N3.Parser();
      parser.parse(data, function(error, triple, prefixes) {
        if (error) {
          if(params.error) {
            params.error();
          }
        }
        else if(!triple) {
          finishParse();
          if(params.success) {
            params.success();
          }
        }
        else {
          handleTriple(triple);
        }
      });
    }
  };

  var loadParams = {
    "ioType": params.ioType,
    "success": parseTripels,
    "error": params.error
  };
  self.load(URI, loadParams);
};

RDFE.OntologyManager.prototype.fresnelLensByURI = function(URI) {
  return this.fresnelLenses[URI];
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

RDFE.OntologyManager.prototype.allOntologies = function() {
  return _.values(this.ontologies);
};

RDFE.OntologyManager.prototype.allClasses = function() {
  return _.values(this.ontologyClasses);
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

/*
 *
 * Ontology
 *
 */
RDFE.Ontology = function(ontologyManager, URI, options) {
  // console.log('ontology =>', URI);
  var self = this;

  this.options = $.extend({}, options);
  this.URI = URI;
  this.prefix = ontologyManager.prefixByOntology(URI);
  this.classes = {};
  this.properties = {};

  this.manager = ontologyManager;
  this.manager.ontologies[URI] = this;
}

RDFE.Ontology.prototype.classesAsArray = function() {
  return _.values(this.classes);
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
RDFE.OntologyClass = function(ontologyManager, URI) {
  // console.log('class =>', URI);
  this.URI = URI;
  this.curi = ontologyManager.uriNormalize(URI);
  this.name = RDFE.Utils.uri2name(URI);
  this.subClassOf = [];
  this.superClassOf = [];
  this.disjointWith = [];
  this.properties = {};
  this.individuals = {};
  this.restrictions = {};

  this.manager = ontologyManager;
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

RDFE.OntologyClass.prototype.getSubClasses = function(includeSuper, subClasses, checkedClasses) {
  subClasses = subClasses || [];
  subClasses = _.union(subClasses, this.superClassOf);
  if (includeSuper === true) {
    checkedClasses = checkedClasses || [];
    checkedClasses.push(this.URI);
    for (var i = 0; i < this.superClassOf.length; i++) {
      var subClass = this.superClassOf[i];
      if ($.inArray(subClass.URI, checkedClasses) < 0) {
        subClass.getSubClasses(includeSuper, subClasses, checkedClasses);
      }
    }
  }
  return subClasses;
};

RDFE.OntologyClass.prototype.getUniqueRestrictions = function() {
  var uniqueRestrictions = [];
  if (this.restrictions) {
    for (var key in this.restrictions) {
      var property = this.restrictions[key];
      if (property.uniqueIdRestriction === true) {
        uniqueRestrictions.push(this.manager.ontologyPropertyByURI(key));
      }
    }
  }
  return uniqueRestrictions;
};

RDFE.OntologyClass.prototype.getIndividuals = function(includeSuper, cc) {
  var individuals = this.individuals;
  if(includeSuper) {
    var subClasses = this.getSubClasses(true);
    for (var i = 0; i < subClasses.length; i++) {
      individuals = _.union(individuals, subClasses[i].individuals);
    }
  }
  return individuals;
};

/*
 *
 * Ontology Property
 *
 */
RDFE.OntologyProperty = function(ontologyManager, URI) {
  // console.log('property =>', URI);

  this.URI = URI;
  this.curi = ontologyManager.uriNormalize(URI);
  this.name = RDFE.Utils.uri2name(URI);
  this.subPropertyOf = [];
  this.superPropertyOf = [];
  this.domain = [];

  this.manager = ontologyManager;
  this.manager.ontologyProperties[URI] = self;
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
      // console.log('Checking sub-property', sp, sp.range)
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
RDFE.OntologyIndividual = function(ontologyManager, URI, options) {
  // console.log('individual =>', URI);
  var self = this;

  this.URI = URI;
  this.curi = ontologyManager.uriNormalize(URI);
  this.name = RDFE.Utils.uri2name(URI);

  this.manager = ontologyManager;
  this.manager.individuals[URI] = this;
}

/*
 *
 * Fresnel Lens
 *
 */
RDFE.FresnelLens = function(ontologyManager, URI) {
  // console.log('fresnel lens =>', URI);
  this.URI = URI;

  this.manager = ontologyManager;
  this.showProperties = [];
  this.hideProperties = [];
}
