if(!window.RDFE)
  window.RDFE = {};

RDFE.Document = function(ontoMan, config) {
  var self = this;

  self.ontologyManager = ontoMan;
  self.config = config;
  self.store = rdfstore.create();
  self.store.registerDefaultNamespace('skos', 'http://www.w3.org/2004/02/skos/core#');
  self.graph = 'urn:graph:default';
  self.dirty = false;
};

RDFE.Document.prototype.setChanged = function(d) {
  if(d === undefined)
    d = true;
  this.dirty = d;
  if(d)
    $(this).trigger('changed', this);
};

RDFE.Document.prototype.load = function(url, io, success, fail) {
    var self = this;
    var successFct = function(data) {
        self.url = url;
        self.io = io;
        self.setChanged(false);

        if (success)
            success();
    };

    // clear the store and then load the new data
    self.store.clear(function() {
      io.retrieveToStore(url, self.store, self.graph, {
        'success': successFct,
        'error': fail
      });
    });
};

/**
 * Verify the integrity of the data in the document.
 *
 * For now the verification will only check for invalid nodes.
 * An invalid node is a uri node with an empty value.
 *
 * @param callback A callback function which takes two parameters:
 * A boolean value indicating whether the doc is valid or not and
 * a message indicating the problem if the doc is not valid.
 * @param fail A callback function which is called in case something
 * goes wrong. This does not include an invalid document but errors
 * like a failed query or the like.
 */
RDFE.Document.prototype.verifyData = function(callback, fail) {
  var self = this;

  // check if there are any invalid uris in the document
  self.store.execute("select * from <" + self.graph + "> where {{ <> ?p ?o } union { ?s2 ?p2 <> }}", function(s,r) {
    if(s) {
      if(r.length > 0) {
        callback(false, "The document is not valid. It contains empty URI nodes.");
        return false;
      }
      else {
        callback(true);
        return true;
      }
    }
    else {
      if(fail) {
        fail();
      }
      return false;
    }
  });
};

RDFE.Document.prototype.save = function(url, io, success, fail) {
    var self = this;
    var myUrl = url,
        myIo = io,
        mySuccess = success,
        myFail = fail;

     // url is optional
     if(typeof(url) != 'string') {
       myUrl = self.url;
       myIo = url;
       mySuccess = io;
       myFail = success;
     }

    // io is optional
    if(typeof(myIo) == 'function' || !myIo) {
        myFail = mySuccess
        mySuccess = myIo;
        myIo = self.io;
    }

    if(!myUrl) {
      if (myFail)
        myFail("No document loaded");
    }
    else {
      self.verifyData(function(s, m) {
        if(s) {
          var __success = function() {
            self.url = myUrl;
            self.setChanged(false);

            if(mySuccess)
              mySuccess();
          };
          myIo.insertFromStore(myUrl, self.store, self.graph, {
            "success": __success,
            "error": myFail
          });
        }
        else if(myFail) {
          myFail(m);
        }
      }, myFail);
    }
};

RDFE.Document.prototype.new = function(success, fail) {
  var self = this;
  self.url = null;
  self.io = null;
  self.store.clear(self.graph, function(s) {
    if(s && success)
      success();
    else if(!s && fail)
      fail();
  });
};

// delete all triplets based on subject URI
RDFE.Document.prototype.deleteBySubject = function(uri, success, fail) {
  var self = this;

  if(self.config.options.autoInverseOfHandling) {
    var sparql = 'construct { <{1}> ?p ?o } FROM <{0}> WHERE { <{1}> ?p ?o. } '.format(self.graph, uri);
    self.store.execute(sparql, function(s, results) {
      if (!s) {
        if (fail) {
          fail(results);
        }
      } else {
        self.deleteTriples(results.triples, success, fail);
      }
    });
  }
  else {
    self.store.execute('with <' + self.graph + '> delete { <' + uri + '> ?p ?o } where { <' + uri + '> ?p ?o }', function(s, r) {
      if(s && success) {
        success();
      }
      else if(!s && fail) {
        fail(r);
      }
    });
  }
};

// delete all triplets based on object URI
RDFE.Document.prototype.deleteByObject = function(uri, success, fail) {
  var self = this;

  if(self.config.options.autoInverseOfHandling) {
    var sparql = 'construct { ?s ?p <{1}> } FROM <{0}> WHERE { ?s ?p <{1}> . } '.format(self.graph, uri);
    self.store.execute(sparql, function(s, results) {
      if (!s) {
        if (fail) {
          fail(results);
        }
      } else {
        self.deleteTriples(results.triples, success, fail);
      }
    });
  }
  else {
    self.store.execute('with <' + self.graph + '> delete { ?s ?p <' + uri + '> } where { ?s ?p <' + uri + '> }', function(s, r) {
      if(s && success) {
        success();
      }
      else if(!s && fail) {
        fail(r);
      }
    });
  }
};

// delete all triplets of entity
RDFE.Document.prototype.deleteEntity = function(uri, success, fail) {
  var self = this;

  if (!uri) {
    if (fail) {
      fail('Need Entity URI for deletion.');
    }
  } else {
    self.deleteBySubject(
      uri,
      function () {
        self.deleteByObject(uri, success, fail);
      },
      fail
    )
  }
};

// add triplet(s)
RDFE.Document.prototype.addTriples = function(triple, success, fail, isInverseTripple) {
  var self = this;

  var triples = _.isArray(triple) ? triple : [triple];
  if (_.isEmpty(triples)) {
    if (success) {
      success();
    }
    return;
  }

  self.store.insert(self.store.rdf.createGraph(triples), self.graph, function(s) {
    if (s) {

      if (self.config.options.autoInverseOfHandling === true && !isInverseTripple) {
        var inverseTriples = self.inverseTriples(triples);
        if (!_.isEmpty(inverseTriples)) {
          self.addTriples(inverseTriples, success, fail, true);
        }
        else {
          self.setChanged();
          if (success) {
            success();
          }
        }
      }
      else {
        self.setChanged();
        if(success) {
          success();
        }
      }
    } else if (fail) {
      fail();
    }
  });
};

RDFE.Document.prototype.addTriple = RDFE.Document.prototype.addTriples;

// delete triplet(s)
RDFE.Document.prototype.deleteTriples = function(triple, success, fail, isInverseTripple) {
  var self = this;

  var triples = (_.isArray(triple))? triple: [triple];
  if (_.isEmpty(triples)) {
    if (success) {
      success();
    }
    return;
  }

  self.store.delete(self.store.rdf.createGraph(triples), self.graph, function(s) {
    if (s) {
      self.setChanged();

      if (self.config.options.autoInverseOfHandling === true && !isInverseTripple) {
        var inverseTriples = self.inverseTriples(triples);
        if (!_.isEmpty(inverseTriples)) {
          self.deleteTriples(inverseTriples, success, fail, true);
        }
        else {
          self.setChanged();
          if(success) {
            success();
          }
        }
      }
      else {
        self.setChanged();
        if(success) {
          success();
        }
      }
    } else if (fail) {
      fail();
    }
  });
};

RDFE.Document.prototype.deleteTriple = RDFE.Document.prototype.deleteTriples;

RDFE.Document.prototype.updateTriple = function(oldTriple, newTriple, success, fail) {
  var self = this;

  self.deleteTriple(
    oldTriple,
    function () {
      self.addTriple(
        newTriple,
        function () {
          self.setChanged();
          if (success) {
            success();
          }
        },
        function () {
          if (fail) {
            fail('Adding new triple failed');
          }
        }
      );
    },
    function () {
      if (fail) {
        fail('Deleting triple failed');
      }
    }
  );
};

// create single inverseOf triplet
RDFE.Document.prototype.inverseTriple = function(triple) {
  var self = this;

  var inverseTriple = null;
  var s = triple.subject;
  var o = triple.object;
  if ((s.interfaceName == 'NamedNode') && (o.interfaceName == 'NamedNode')) {
    var p = triple.predicate;
    var property = self.ontologyManager.ontologyPropertyByURI(p.nominalValue);
    if (property) {
      // found
      var inverseOfProperty = property.inverseOf;
      if (inverseOfProperty) {
        // create inverse triple
        var inverseTriple = self.store.rdf.createTriple(
          self.store.rdf.createNamedNode(o.nominalValue),
          self.store.rdf.createNamedNode(inverseOfProperty.URI),
          self.store.rdf.createNamedNode(s.nominalValue)
        )
      }
    }
  }
  return inverseTriple;
};

// create inverseOf triplets from triplets array
RDFE.Document.prototype.inverseTriples = function(triples) {
  var self = this;

  var inverseTriples = [];
  for (var i = 0, l = triples.length; i < l; i++) {
    var inverseTriple = self.inverseTriple(triples[i]);
    if (inverseTriple) {
      inverseTriples.push(inverseTriple);
    }
  }
  return inverseTriples;
};

/**
 * Get the label for the given resource using the configured label properties.
 * if no label can be found the last section of the url is used instead.
 */
RDFE.Document.prototype.getEntityLabel = function(url, success) {
  var self = this;
  var getLabel = function(lps, i) {
    // fall back to the last section of the uri
    if(i >= lps.length)
      success(RDFE.Utils.uri2name(url));
    else
      self.store.execute('select ?l from <' + self.graph + '> where { <' + url + '> <' + lps[i] + '> ?l . }', function(s, r) {
        if(s && r.length > 0 && r[0].l.value.length > 0) {
          success(r[0].l.value);
        }
        else {
          getLabel(lps, i+1);
        }
      });
  };
  getLabel(self.config.options.labelProps, 0);
};

RDFE.Document.prototype.getEntity = function(url, success) {
  var self = this;

  // Iterating over all triples of the entity is faster than a specific sparql query.
  self.store.node(url, self.graph, function(s, r) {
    var e = {
      uri: url,
      label: RDFE.Utils.uri2name(url),
      types: [],
      properties: {}
    };

    if(s) {
      r = r.triples;
      for(var i = 0; i < r.length; i++) {
        var p = r[i].predicate.nominalValue;
        (e.properties[p] = e.properties[p] || []).push(RDFE.RdfNode.fromStoreNode(r[i].object));
        if(p == 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
          e.types.push(r[i].object.nominalValue);
        }
      }

      for(var i = 0; i < self.config.options.labelProps.length; i++) {
        if(e.properties[self.config.options.labelProps[i]]) {
          e.label = e.properties[self.config.options.labelProps[i]][0].toString();
          break;
        }
      }
    }

    success(e);
  });
};

RDFE.Document.prototype.listProperties = function(callback) {
  var self = this;
  self.store.execute("select distinct ?p from <" + self.graph + "> where { ?s ?p ?o }", function(success, r) {
    var pl = [];

    if(success) {
      for(var i = 0; i < r.length; i++)
        pl.push(r[i].p.value);
    }

    callback(pl);
  });
};

/**
 * List all entities by Iterating over all triples in the store rather than using
 * a sparql query. Experiments showed a 10x performance improvement this way.
 *
 * @param type optional type(s) the entities should have. Can be a list or a string.
 * @param callback a function which takes an array of rdfstore nodes as input.
 * @param errorCb Callback function in case an error occurs, takes err msg as input.
 */
RDFE.Document.prototype.listEntities = function(type, callback, errorCb) {
  var t = type,
      cb = callback,
      errCb = errorCb,
      self = this;

  if(typeof(t) == 'function') {
    cb = type;
    errCb = callback;
    t = null;
  }
  else if(typeof(t) == 'string')
    t = [t];

  var q = "select ?s ?p ?o from <" + self.graph + "> where { ?s ?p ?o . ";

  // FIXME: add super-types to t like so: self.ontologyManager.getAllSuperTypes(t)
  if(t && t.length > 0) {
    q += "?s a ?t . filter(";
    for(var i = 0; i < t.length; i++) {
      if(i > 0) q += "||";
      q += "?t = <" + t[i] + ">";
    }
    q += ") . ";
  }

  q += '}';

  self.store.execute(q, function(success, r) {
    var sl = {};

    if(success) {
      for(var i = 0; i < r.length; i++) {
        var s = r[i].s.value,
            p = r[i].p.value;

        // create an initial entity which only contains the uri
        if(!sl[s]) {
          sl[s] = {
            uri: s,
            types: []
          };
        }
        var e = sl[s];

        // add types to the entity
        if(p == 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
          e.types.push(r[i].o.value);
        }

        // store labels from the list of configured label props
        else if(_.indexOf(self.config.options.labelProps, p) >= 0) {
          e[p] = r[i].o.value;
        }
      }

      // the result should be a flat list of entities
      sl = _.values(sl);

      // finally generate the labels from the values stored in the entities.
      // This allows to always choose the label value with the highest prio (highest up in the configured list of label props)
      for(var i = 0; i < sl.length; i++) {
        e = sl[i];
        for(var j = 0; j < self.config.options.labelProps.length; j++) {
          if(e[self.config.options.labelProps[j]]) {
            e.label = e[self.config.options.labelProps[j]];
            break;
          }
        }
        if(!e.label) {
          e.label = RDFE.Utils.uri2name(e.uri);
        }
      }
    }
    else if(errorCb) {
      errorCb(r);
    }

    cb(sl);
  });
};

RDFE.Document.prototype.buildEntityUri = function(name) {
  var uri = this.config.options.entityUriTmpl;
  if(!uri || uri.length == 0) {
    uri = 'urn:entities:{NAME}';
  }

  // we use a dummy uri in case there is no open doc
  uri = uri.replace('{DOC-URI}', this.url || 'urn:entities:');

  var n = name || "entity";
  var i = uri.indexOf('{NAME}');
  if(i >= 0) {
    uri = uri.replace('{NAME}', encodeURIComponent(n));
  }
  else {
    if(uri[uri.length-1] != '#' && uri[uri.length-1] != '/' && uri[uri.length-1] != ':') {
      uri += '#';
    }
    uri += encodeURIComponent(n);
  }

  // make the URI unique in the loaded document
  var nuri = uri,
      self = this;
  var uq = function(i) {
    self.store.node(nuri, self.graph, function(s, r) {
      console.log(s,r)
      if(s && r.length) {
        nuri = uri + i;
        uq(i+1);
      }
    });
  };
  uq(1);

  return nuri;
};

RDFE.Document.prototype.addEntity = function(uri, name, type, cb, failCb) {
  var self = this;
  if(!uri || uri.length == 0) {
    uri = self.buildEntityUri(name);
  }

  var t = [
    self.store.rdf.createTriple(
      self.store.rdf.createNamedNode(uri),
      self.store.rdf.createNamedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      self.store.rdf.createNamedNode(type)
    )
  ];

  if(name && name.length > 0) {
    // RDFE.Config makes sure the labelProps array is never empty
    var lp = self.ontologyManager.uriDenormalize(self.config.options.labelProps[0]);
    t.push(self.store.rdf.createTriple(
      self.store.rdf.createNamedNode(uri),
      self.store.rdf.createNamedNode(lp),
      self.store.rdf.createLiteral(name)
    ));
  }

  var ontologyClass = self.ontologyManager.ontologyClassByURI(type);
  var uniqueRestrictions = ontologyClass.getUniqueRestrictions();
  for (var i = 0; i < uniqueRestrictions.length; i++) {
    var property = uniqueRestrictions[i];
    var uniqueValue = self.getUniqueValue(uri, property);
    if (uniqueValue) {
      t.push(self.store.rdf.createTriple(
        self.store.rdf.createNamedNode(uri),
        self.store.rdf.createNamedNode(property.URI),
        self.store.rdf.createLiteral(uniqueValue, null, property.range)
      ));
    }
  }

  self.addTriples(t, function() {
    if(cb) {
      cb({
        "uri": uri,
        "label": name
      });
    }
  }, function() {
    if(failCb) {
      failCb();
    }
  });
};

RDFE.Document.prototype.getUniqueValue = function() {
  var stringTypes = [
    "http://www.w3.org/2000/01/rdf-schema#Literal",
    "http://www.w3.org/2001/XMLSchema#string"
  ];
  var integerTypes = [
    "http://www.w3.org/2001/XMLSchema#integer",
    "http://www.w3.org/2001/XMLSchema#decimal",
    "http://www.w3.org/2001/XMLSchema#nonPositiveInteger",
    "http://www.w3.org/2001/XMLSchema#negativeInteger",
    "http://www.w3.org/2001/XMLSchema#long",
    "http://www.w3.org/2001/XMLSchema#int",
    "http://www.w3.org/2001/XMLSchema#short",
    "http://www.w3.org/2001/XMLSchema#byte",
    "http://www.w3.org/2001/XMLSchema#nonNegativeInteger",
    "http://www.w3.org/2001/XMLSchema#unsignedLong",
    "http://www.w3.org/2001/XMLSchema#unsignedInt",
    "http://www.w3.org/2001/XMLSchema#unsignedShort",
    "http://www.w3.org/2001/XMLSchema#unsignedByte",
    "http://www.w3.org/2001/XMLSchema#positiveInteger"
  ];

  return function(uri, property) {
    var self = this,
        uniqueValue,
        range = property.range;

    if (stringTypes.indexOf(range) !== -1) {
      uniqueValue = uri;
    }
    else if (integerTypes.indexOf(range) !== -1) {
      uniqueValue = 1;
      var sparql = 'SELECT (MAX(?v) as ?mv) FROM <{0}> WHERE {?s <{1}> ?v}'.format(self.graph, property.URI);
      self.store.execute(sparql, function(success, results) {
        if (success) {
          if (results.length !== 0) {
            uniqueValue = parseInt(RDFE.coalesce(results[0]["mv"].value, 0));
            if (isNaN(uniqueValue)) {
              uniqueValue = 0;
            }
            uniqueValue++;
          }
        } else {
          console.log('Failed to determine unique value for ', uri, ' and ', property.URI, results);
        }
      });
    }
    return uniqueValue;
  };
}();
