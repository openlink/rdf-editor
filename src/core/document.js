/*
 *  This file is part of the OpenLink RDF Editor
 *
 *  Copyright (C) 2014-2019 OpenLink Software
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

if (!window.RDFE)
  window.RDFE = {};

var SPARQL_TRIPLE = '<{0}> <{1}> {2}';
var SPARQL_INSERT = 'INSERT DATA { GRAPH <{0}> { {1} } }';
var SPARQL_DELETE = 'DELETE DATA { GRAPH <{0}> { {1} } }';

RDFE.Document = function(params, callback) {
  var self = this;

  self.ontologyManager = params["ontologyManager"];
  self.config = params["config"];
  self.documentTree = params["documentTree"];
  self.graph = 'urn:graph:default';
  self.dirty = false;
  self.clearLog();

  // create document RDF store
  rdfstore.create(function(error, store) {
    if (!error) {
      self.store = store;
      self.store.registerDefaultNamespace('skos', 'http://www.w3.org/2004/02/skos/core#');
      self.store.subscribe(null, null, null, self.graph, function(event, triples) {
        self.updateLog(event, triples);
      });

      if (callback) {
        callback(self);
      }
    }
  });
};

RDFE.Document.prototype.setChanged = function(dirty) {
  var self = this;

  self.dirty = dirty;
  if (self.dirty)
    $(self).trigger('changed', self);

  $(self).trigger('docChanged', self);
};

RDFE.Document.prototype.clearLog = function(event, triples) {
  var self = this;

  self.saveLog = [];
  self.editLog = [];
  self.editLogIndex = 0;
  self.editLogEnabled = true;
  self.undoIsDisabled();
  self.redoIsDisabled();
};

RDFE.Document.prototype.updateLog = function(event, triples) {
  var self = this;
  var editLogMax = 16;

  // Update edit log
  if (self.editLogEnabled && ((event === 'added') || (event === 'deleted'))) {
    self.editLog.length = self.editLogIndex;
    if (self.editLog.length >= editLogMax)
      self.editLog = self.editLog.slice(-editLogMax+1);

    self.editLog.push({"event": event, "triples": triples});
    self.editLogIndex = self.editLog.length;
  }
  self.undoIsDisabled();
  self.redoIsDisabled();

  // Update save log
  if ((self.io.type === 'sparql') || (self.io.type === 'ldp')) {
    self.saveLog.push({"event": event, "triples": triples});
  }
};

RDFE.Document.prototype.importLog = function(mimeType, content) {
  var self = this;
  var graph = 'urn:graph:log';

  self.store.clear(graph, function(error, result) {
    if (error && fail)
      return;

    self.store.load(mimeType, content, graph, function(error, result) {
      if (error && fail)
        return;

      self.store.graph(graph, function(error, result) {
        if (!error)
          self.updateLog('added', result.triples);

        self.store.clear(graph, function() {});
      });
    });
  });
};

RDFE.Document.prototype.undoIsDisabled = function() {
  var self = this;

  self.undoDisabled = self.editLogIndex && (self.editLogIndex <= self.editLog.length);
};

RDFE.Document.prototype.undoLog = function(success, fail) {
  var self = this;

  if (self.undoIsDisabled())
    return;

  var undo = self.editLog[self.editLogIndex-1];
  self.editLogIndex--;

  if (!undo.triples.length)
    return;

  var sparql = '';
  var delimiter = ' \n';
  for (var i = 0; i < undo.triples.length; i++) {
    sparql += delimiter + SPARQL_TRIPLE.format(undo.triples[i].subject, undo.triples[i].predicate, undo.triples[i].object.toNT());
    delimiter = ' .\n';
  }
  if (undo.event === 'added') {
    sparql = SPARQL_DELETE.format(self.graph, sparql);
  } else {
    sparql = SPARQL_INSERT.format(self.graph, sparql);
  }

  self.editLogEnabled = false;
  self.store.execute(sparql, function(error, result) {
    self.editLogEnabled = true;
    self.setChanged(false);
    if (!error && success) {
      success(result);
    }
    else if (error && fail) {
      fail(error);
    }
  });
};

RDFE.Document.prototype.redoIsDisabled = function() {
  var self = this;

  self.redoDisabled = self.editLog.length && (self.editLogIndex < self.editLog.length);
};

RDFE.Document.prototype.redoLog = function(success, fail) {
  var self = this;

  if (self.redoIsDisabled())
    return;

  var redo = self.editLog[self.editLogIndex];
  self.editLogIndex++;

  if (!redo.triples.length)
    return;

  var sparql = '';
  var delimiter = ' \n';
  for (var i = 0; i < redo.triples.length; i++) {
    sparql += delimiter + SPARQL_TRIPLE.format(redo.triples[i].subject, redo.triples[i].predicate, redo.triples[i].object.toNT());
    delimiter = ' .\n';
  }
  if (redo.event === 'added') {
    sparql = SPARQL_INSERT.format(self.graph, sparql);
  } else {
    sparql = SPARQL_DELETE.format(self.graph, sparql);
  }

  self.editLogEnabled = false;
  self.store.execute(sparql, function(error, result) {
    self.editLogEnabled = true;
    self.setChanged(false);
    if (!error && success) {
      success(result);
    }
    else if (error && fail) {
      fail(error);
    }
  });
};

RDFE.Document.prototype.load = function(url, io, success, fail) {
  var self = this;

  self.url = null;
  var successFct = function(data, status, xhr) {
    self.url = url;
    self.io = io;
    self.clearLog();
    self.setChanged(false);

    // add current recent doc to the list
    if (data.length)
      self.documentTree.addRecentDoc(self.url, self.io.type);

    // store document identification properties after load
    self.srcParams = {
      "length": data.length,
      "md5": $.md5(data)
    };

    if (success) {
      success();
    }
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
RDFE.Document.prototype.verifyData = function(callback) {
  var self = this;

  if (self.config.options.validateEmptyNodes) {
    // check if there are any invalid uris in the document
    var sparql = "select * from <" + self.graph + "> where {{ <> ?p ?o } union { ?s2 ?p2 <> }}";
    self.store.execute(sparql, function(error, result) {
      if (!error) {
        if (result.length > 0) {
          if (callback) {
            callback(new Error("The document is not valid. It contains empty URI nodes."));
          }
          return false;
        }
        else {
          if (callback) {
            callback();
          }
          return true;
        }
      }
      else {
        if (callback) {
          callback(error);
        }
        return false;
      }
    });
  }
  else {
    if (callback) {
      callback();
    }
    return true;
  }
};

RDFE.Document.prototype.save = function(myUrl, myIo, mySuccess, myFail) {
  var self = this;

  if (!myUrl) {
    if (myFail) {
      myFail("No document loaded");
    }
    return;
  }

  if (!myIo.insertFromStore) {
    myIo = RDFE.IO.createIO('webdav', myIo.options);
    myIo.type = 'webdav';
  }

  self.verifyData(function(error) {
    if (error) {
      if (myFail)
        myFail(error);

      return;
    }

    var __success = function() {
      self.url = myUrl;
      self.io = myIo;
      self.clearLog();
      self.saveLog = [];
      self.setChanged(false);

      // add current recent doc to the list
      self.documentTree.addRecentDoc(self.url, self.io.type);

      // refresh document identification properties after save
      myIo.retrieve(self.url, {
        "success": function (data, status, xhr) {
          self.srcParams = {
            "length": data.length,
            "md5": $.md5(data)
          };
        },
        "error":  function () {
          self.srcParams = null;
        }
      });

      if (mySuccess)
        mySuccess();
    };

    if (self.url && (self.url === myUrl) && myIo.insertFromPatch && ((self.io.type === 'sparql') || (self.io.type === 'ldp')) && (self.io.type == myIo.type)) {
      if (!self.saveLog.length)
        mySuccess();

      myIo.insertFromPatch(myUrl, self.saveLog, {
        "success": __success,
        "error": myFail
      });
    } else {
      myIo.insertFromStore(myUrl, self.store, self.graph, {
        "success": __success,
        "error": myFail
      });
    }
  });
};

RDFE.Document.prototype.new = function(success, fail) {
  var self = this;

  self.url = null;
  self.io = null;
  self.srcParams = null;
  self.signature = null;
  self.clearLog();
  self.store.clear(self.graph, function(error) {
    if (!error) {
      self.setChanged(false);
      if (success) {
        success();
      }
    }
    else if (error && fail) {
      fail(error);
    }
  });
};

RDFE.Document.prototype.import = function(content, contentType, success, fail) {
  var self = this;

  if (typeof(contentType) == 'function') {
    fail = success;
    success = contentType;
    contentType = null;
  }

  // loading local data
  if (contentType === 'application/ld+json') {
    self.importJSON(content, success, fail);
  }
  else if (contentType === 'application/rdf+xml') {
    self.importRDF(content, success, fail);
  }
  else if (contentType === 'text/turtle') {
    self.importTurtle(content, success, fail);
  }
  else {
    var _fail = function (_error) {
      var __fail = function (__error) {
        var ___fail = function (___error) {
          var error = new Error();
          error.name = 'SyntaxError';
          error.message = 'Checked with following parsers:<br /> <b>TTL</b>: ' + RDFE.Utils.escapeXml(_error.message) + '<br /><b>JSON-LD</b>: ' + RDFE.Utils.escapeXml(__error.message) + '<br /><b>RDF</b>: ' + RDFE.Utils.escapeXml(___error.message);
          fail(error);
        };
        self.importRDF(content, success, ___fail);
      };
      self.importJSON(content, success, __fail);
    };
    self.importTurtle(content, success, _fail);
  }
};

RDFE.Document.prototype.importTurtle = function(content, success, fail) {
  var self = this;

  self.store.load('text/turtle', content, self.graph, function(error, result) {
    if (!error) {
      if (success) {
        self.importLog('text/turtle', content);
        success(result);
      }
    }
    else {
      if (error.message.startsWith('Undefined prefix')) {
        var ndx = error.message.indexOf('"');
        var prefix = error.message.substring(ndx+1);
        ndx = prefix.indexOf('"');
        prefix = prefix.substring(0, ndx-1);
        var uri = self.ontologyManager.prefixes[prefix];
        if (uri) {
          content = '@prefix {0}: <{1}> .'.format(prefix, uri) + content;
          return self.importTurtle(content, success, fail);
        }
      }
      if (fail) {
        fail(error);
      }
    }
  });
};

RDFE.Document.prototype.importJSON = function(content, success, fail) {
  var self = this;

  self.store.load('application/ld+json', content, self.graph, function(error, result) {
    if (!error && success) {
      self.importLog('application/ld+json', content);
      success(result);
    }
    else if (error && fail) {
      fail(error);
    }
  });
};

RDFE.Document.prototype.importRDF = function(content, success, fail) {
  var self = this;

  try {
    $.parseXML(content);
    self.store.load('application/rdf+xml', content, self.graph, function(error, result) {
      if (!error && success) {
        self.importLog('application/rdf+xml', content);
        success(result);
      }
      else if (error && fail) {
        fail(error);
      }
    });
  }
  catch (e) {
    fail({"message": 'RDF syntax error!'});
  }
};

// delete all triplets based on subject URI
RDFE.Document.prototype.deleteBySubject = function(uri, success, fail) {
  var self = this;

  if (self.config.options.autoInverseOfHandling) {
    var sparql = 'construct { <{1}> ?p ?o } from <{0}> where { <{1}> ?p ?o. } '.format(self.graph, uri);
    self.store.execute(sparql, function(error, result) {
      if (error) {
        if (fail) {
          fail(error);
        }
      }
      else {
        self.deleteTriples(result.triples, success, fail);
      }
    });
  }
  else {
    var sparql = 'with <{0}> delete { <{1}> ?p ?o } where { <{1}> ?p ?o }'.format(self.graph, uri);
    self.store.execute(sparql, function(error, result) {
      if (!error && success) {
        success();
      }
      else if (error && fail) {
        fail(error);
      }
    });
  }
};

// delete all triplets based on predicatet URI
RDFE.Document.prototype.deleteByPredicate = function(uri, success, fail) {
  var self = this;

  if (self.config.options.autoInverseOfHandling) {
    var sparql = 'construct { ?s <{1}> ?o} from <{0}> where { ?s <{1}> ?o . } '.format(self.graph, uri);
    self.store.execute(sparql, function(error, result) {
      if (error) {
        if (fail) {
          fail(error);
        }
      }
      else {
        self.deleteTriples(result.triples, success, fail);
      }
    });
  }
  else {
    var sparql = 'with <{0}> delete { ?s <{1}> ?o} where { ?s <{1}> ?o . }'.format(self.graph, uri);
    self.store.execute(sparql, function(error, result) {
      if (!error && success) {
        success();
      }
      else if (error && fail) {
        fail(error);
      }
    });
  }
};

// delete all triplets based on object URI
RDFE.Document.prototype.deleteByObjectIRI = function(uri, success, fail) {
  var self = this;

  if (self.config.options.autoInverseOfHandling) {
    var sparql = 'construct { ?s ?p <{1}> } from <{0}> where { ?s ?p <{1}> . } '.format(self.graph, uri);
    self.store.execute(sparql, function(error, result) {
      if (error) {
        if (fail) {
          fail(error);
        }
      }
      else {
        self.deleteTriples(result.triples, success, fail);
      }
    });
  }
  else {
    var sparql = 'with <{0}> delete { ?s ?p <{1}> } where { ?s ?p <{1}> . }'.format(self.graph, uri);
    self.store.execute(sparql, function(error, result) {
      if (!error && success) {
        success();
      }
      else if(error && fail) {
        fail(error);
      }
    });
  }
};

// delete all triplets based on object
RDFE.Document.prototype.deleteByObject = function(object, success, fail) {
  var self = this;

  var sparql;
  if (object.interfaceName === "Literal") {
    sparql = 'construct { ?s ?p ?o } from <{0}> where { ?s ?p ?o. FILTER (str(?o) = "{1}"). } '.format(self.graph, (object.datatype == 'http://www.w3.org/2001/XMLSchema#dateTime')? (new Date(object.nominalValue)).toString(): object.nominalValue);
  }
  else {
    sparql = 'construct { ?s ?p <{1}> } from <{0}> where { ?s ?p <{1}> . } '.format(self.graph, object.toString());
  }

  self.store.execute(sparql, function(error, result) {
    if (error) {
      if (fail) {
        fail(error);
      }
    }
    else {
      self.deleteTriples(result.triples, success, fail);
    }
  });
};

// delete all triplets of entity
RDFE.Document.prototype.deleteEntity = function(uri, success, fail) {
  var self = this;

  if (!uri) {
    if (fail) {
      fail('Need Entity URI for deletion.');
    }
  }
  else {
    self.deleteBySubject(
      uri,
      function () {
        self.deleteByObjectIRI(uri, success, fail);
      },
      fail
    );
  }
};

RDFE.Document.prototype.deleteEntities = function(uris, success, fail) {
  var self = this;
  function deleteUri(i) {
    if (i < uris.length) {
      self.deleteEntity(uris[i], function() {
        delUri(i+1);
      }, fail);
    }
    else {
      success();
    }
  }
  deleteUri(0);
};

// delete all triplets of predicate
RDFE.Document.prototype.deletePredicate = function(uri, success, fail) {
  var self = this;

  if (!uri) {
    if (fail) {
      fail('Need Predicate URI for deletion.');
    }
  } else {
    self.deleteByPredicate (
      uri,
      success,
      fail
    );
  }
};

// delete all triplets of object
RDFE.Document.prototype.deleteObject = function(object, success, fail) {
  var self = this;

  if (!object) {
    if (fail) {
      fail('Need object for deletion.');
    }
  }
  else {
    self.deleteByObject (
      object,
      success,
      fail
    );
  }
};

// add triplet(s)
RDFE.Document.prototype.checkTriple = function(triple, success, fail) {
  var self = this;

  self.store.node(triple.subject.nominalValue, self.graph, function(error, graph) {
    if (error) {
      if (fail)
        fail(false);
    }
    else if (success) {
      var g = graph.match(null, triple.predicate, triple.object);
      success(g.triples.length > 0);
    }
  });
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

  self.store.insert(self.store.rdf.createGraph(triples), self.graph, function(error, result) {
    if (!error) {
      if (self.config.options.autoInverseOfHandling === true && !isInverseTripple) {
        var inverseTriples = self.inverseTriples(triples);
        if (!_.isEmpty(inverseTriples)) {
          self.addTriples(inverseTriples, success, fail, true);
        }
        else {
          self.setChanged(true);
          if (success) {
            success();
          }
        }
      }
      else {
        self.setChanged(true);
        if (success) {
          success();
        }
      }
    }
    else if (fail) {
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

  self.store.delete(self.store.rdf.createGraph(triples), self.graph, function(error, result) {
    if (!error) {
      self.setChanged(true);

      if (self.config.options.autoInverseOfHandling === true && !isInverseTripple) {
        var inverseTriples = self.inverseTriples(triples);
        if (!_.isEmpty(inverseTriples)) {
          self.deleteTriples(inverseTriples, success, fail, true);
        }
        else {
          self.setChanged(true);
          if (success) {
            success();
          }
        }
      }
      else {
        self.setChanged(true);
        if (success) {
          success();
        }
      }
    }
    else if (fail) {
      fail(error);
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
          self.setChanged(true);
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
        inverseTriple = self.store.rdf.createTriple(
          self.store.rdf.createNamedNode(o.nominalValue),
          self.store.rdf.createNamedNode(inverseOfProperty.URI),
          self.store.rdf.createNamedNode(s.nominalValue)
        );
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
RDFE.Document.prototype.getEntityLabel = function(url, properties, success) {
  var self = this,
      props = properties,
      success_ = success;
  if (typeof(props) == 'function') {
    success_ = props;
    props = undefined;
  }

  var getLabel = function(lps, i) {
    // fall back to the last section of the uri
    if(i >= lps.length) {
      success_(RDFE.Utils.uri2name(url), false);
    }
    else {
      self.store.execute('select ?l from <' + self.graph + '> where { <' + url + '> <' + lps[i] + '> ?l . }', function(error, result) {
        if (!error && result.length > 0 && result[0].l.value.length > 0) {
          success_(result[0].l.value, true);
        }
        else {
          getLabel(lps, i+1);
        }
      });
    }
  };
  getLabel(props || self.config.options.labelProps, 0);
};

RDFE.Document.prototype.getEntity = function(url, success) {
  var self = this;

  // Iterating over all triples of the entity is faster than a specific sparql query.
  self.store.node(url, self.graph, function(error, result) {
    var e = {
      uri: url,
      label: RDFE.Utils.uri2name(url),
      types: [],
      properties: {}
    };

    if (!error) {
      var r = result.triples;
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

  self.store.execute("select distinct ?p from <" + self.graph + "> where { ?s ?p ?o }", function(error, result) {
    var pl = [];

    if (!error) {
      for (var i = 0; i < result.length; i++)
        pl.push(result[i].p.value);
    }

    callback(pl);
  });
};

/**
 * List all entities by Iterating over all triples in the store rather than using
 * a sparql query. Experiments showed a 10x performance improvement this way.
 *
 * @param types optional type(s) the entities should have. Can be a list or a string.
 * @param success a function which takes an array of rdfstore nodes as input.
 * @param fail Callback function in case an error occurs, takes err msg as input.
 */
RDFE.Document.prototype.listEntities = function(types, success, fail) {
  var self = this;

  if (typeof(types) == 'string')
    types = [types];

  var sparql = 'select ?s ?p ?o from <{0}> where { ?s ?p ?o . '.format(self.graph);
  // FIXME: add super-types to t like so: self.ontologyManager.getAllSuperTypes(t)
  if (types.length > 0) {
    sparql += '?s a ?t . filter(';
    for (var i = 0; i < types.length; i++) {
      if (i > 0) {
        sparql += ' || ';
      }
      sparql += '(str(?t) = "{0}")'.format(types[i]);
    }
    sparql += ') . ';
  }
  sparql += '}';

  self.store.execute(sparql, function(error, result) {
    var sl = {};

    if (!error) {
      for (var i = 0; i < result.length; i++) {
        var s = result[i].s.value,
            p = result[i].p.value;

        // create an initial entity which only contains the uri
        if (!sl[s]) {
          sl[s] = {
            "uri": s,
            "types": []
          };
        }
        var e = sl[s];

        // add types to the entity
        if (p == 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
          e.types.push(result[i].o.value);
        }

        // store labels from the list of configured label props
        else if (_.indexOf(self.config.options.labelProps, p) >= 0) {
          e[p] = result[i].o.value;
        }
      }

      // the result should be a flat list of entities
      sl = _.values(sl);

      // finally generate the labels from the values stored in the entities.
      // This allows to always choose the label value with the highest prio (highest up in the configured list of label props)
      for (var i = 0; i < sl.length; i++) {
        sl[i].label = self.getEntityLabel(sl[i]);
      }
    }
    else if (fail) {
      fail(error);
    }
    success(sl);
  });
};

RDFE.Document.prototype.itemsByRange = function(ranges) {
  var self = this;
  var nodeItems;

  if (!ranges)
    return;

  for (var i = 0; i < ranges.length; i++) {
    var ontologyClass = self.ontologyManager.ontologyClassByURI(ranges[i]);

    if (!ontologyClass)
      continue;

    nodeItems = nodeItems || [];
    var items = _.values(ontologyClass.getIndividuals());
    for (var j = 0; j < items.length; j++) {
      var nodeItem = RDFE.RdfNode.fromStoreNode(items[j].URI);
      nodeItem.label = items[j].curi || items[j].URI;
      nodeItems.push(nodeItem);
    }
    self.listEntities(
      ranges[i],
      function(items) {
        for (var j = 0; j < items.length; j++) {
          var nodeItem = RDFE.RdfNode.fromStoreNode(items[j].uri);
          nodeItem.label = items[j].label || items[j].uri;
          nodeItems.push(nodeItem);
        }
      }
    );
  }
  return nodeItems;
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
    self.store.node(nuri, self.graph, function(error, result) {
      console.log(error, result);
      if (!error && result.length) {
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
  var uniqueRestrictions = (ontologyClass ? ontologyClass.getUniqueRestrictions() : []);
  for (var i = 0; i < uniqueRestrictions.length; i++) {
    var property = uniqueRestrictions[i];
    var uniqueValue = self.getUniqueValue(uri, property);
    if (uniqueValue) {
      t.push(self.store.rdf.createTriple(
        self.store.rdf.createNamedNode(uri),
        self.store.rdf.createNamedNode(property.URI),
        self.store.rdf.createLiteral(uniqueValue.toString(), null, property.range)
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

/**
 * List all subjects by iterating over all triples in the store
 *
 * @param success a function which takes an array of rdfstore nodes as input.
 * @param error a function in case an error occurs, takes error message as input.
 */
RDFE.Document.prototype.listSubjects = function(success, fail) {
  var self = this;

  self.store.graph(self.graph, function(error, result) {
    if (!error) {
      var sl = {};
      var triples = result.toArray();
      for (var i = 0; i < triples.length; i+=1) {
        var x = triples[i].subject.toString();
        if (!sl[x]) {
          sl[x] = self.newSubject(x);
        }
        sl[x].items.push(triples[i]);
      }
      sl = _.values(sl);
      success(sl);
    }
    else if (fail) {
      fail(error);
    }
  });
};

RDFE.Document.prototype.getSubject = function(uri, success, fail) {
  var self = this;

  self.store.graph(self.graph, function(error, result) {
    if (!error) {
      var sl = self.newSubject(uri);
      var triples = result.toArray();
      for (var i = 0; i < triples.length; i+=1) {
        if (triples[i].subject.toString() === uri) {
          sl.items.push(triples[i]);
        }
      }
      if (success) {
        success(sl);
      }
    }
    else if (fail) {
      fail(error);
    }
  });
};

RDFE.Document.prototype.newSubject = function(uri) {
  return {"uri": uri, "items": [] };
};

/**
 * List all properties by iterating over all triples in the store
 *
 * @param success a function which takes an array of rdfstore nodes as input.
 * @param error a function in case an error occurs, takes error message as input.
 */
RDFE.Document.prototype.listPredicates = function(success, fail) {
  var self = this;

  self.store.graph(self.graph, function(error, result) {
    if (!error) {
      var sl = {};
      var triples = result.toArray();
      for (var i = 0; i < triples.length; i+=1) {
        var p = triples[i].predicate.toString();
        if (!sl[p]) {
          sl[p] = self.newPredicate(p);
        }
        sl[p].items.push(triples[i]);
      }
      sl = _.values(sl);
      success(sl);
    }
    else if (fail) {
      fail(error);
    }
  });
};

RDFE.Document.prototype.getPredicate = function(uri, success, fail) {
  var self = this;

  self.store.graph(self.graph, function(error, result) {
    if (!error) {
      var sl = self.newPredicate(uri);
      var triples = result.toArray();
      for (var i = 0; i < triples.length; i+=1) {
        if (triples[i].predicate.toString() === uri) {
          sl.items.push(triples[i]);
        }
      }
      if (success) {
        success(sl);
      }
    }
    else if (fail) {
      fail(error);
    }
  });
};

RDFE.Document.prototype.newPredicate = function(uri) {
  return {"uri": uri, "items": [] };
};

/**
 * List all objects by iterating over all triples in the store
 *
 * @param success a function which takes an array of rdfstore nodes as input.
 * @param error a function in case an error occurs, takes error message as input.
 */
RDFE.Document.prototype.listObjects = function(success, fail) {
  var self = this;

  self.store.graph(self.graph, function(error, result) {
    if (!error) {
      var sl = {};
      var triples = result.toArray();
      for (var i = 0; i < triples.length; i+=1) {
        var o = triples[i].object;
        var id = self.formatObjectID(o);
        if (!sl[id]) {
          sl[id] = self.newObject(o);
        }
        sl[id].items.push(triples[i]);
      }
      sl = _.values(sl);
      success(sl);
    }
    else if (fail) {
      fail(error);
    }
  });
};

RDFE.Document.prototype.getObject = function(object, success, fail) {
  var self = this;

  self.store.graph(self.graph, function(error, result) {
    if (!error) {
      var sl = self.newObject(object);
      var triples = result.toArray();
      for (var i = 0; i < triples.length; i+=1) {
        if (self.formatObjectID(triples[i].object) === sl.id) {
          sl.items.push(triples[i]);
        }
      }
      if (success) {
        success(sl);
      }
    }
    else if (fail) {
      fail(error);
    }
  });
};

RDFE.Document.prototype.newObject = function(object) {
  var self = this;

  if (typeof object === 'string') {
    object = new RDFE.RdfNode('literal', object);
  }

  return {
    "id": self.formatObjectID(object),
    "label": self.formatObjectLabel(object),
    "type": self.formatObjectType(object),
    "object": object,
    "items": []
  };
};

RDFE.Document.prototype.formatObjectID = function(o) {
  if (o.interfaceName == "Literal") {
    var v = (o.datatype == 'http://www.w3.org/2001/XMLSchema#dateTime')? (new Date(o.nominalValue)).toString(): o.nominalValue;
    var dt = (o.datatype)? o.datatype: 'literal';

    return dt + ' - ' + v;
  }
  return o.toString();
};

RDFE.Document.prototype.formatObjectLabel = function(o) {
  if (o.interfaceName === "Literal") {
    return (o.datatype == 'http://www.w3.org/2001/XMLSchema#dateTime')? (new Date(o.nominalValue)).toString(): o.nominalValue;
  }
  return o.toString();
};

RDFE.Document.prototype.formatObjectType = function(o) {
  if (o.interfaceName === "Literal") {
    return (o.datatype)? o.datatype: 'http://www.w3.org/2000/01/rdf-schema#Literal';
  }
  return 'IRI';
};

RDFE.Document.prototype.getEntityLabel = function(e) {
  var self = this;

  for (var j = 0; j < self.config.options.labelProps.length; j++) {
    if (e[self.config.options.labelProps[j]]) {
      return  e[self.config.options.labelProps[j]];
    }
  }

  return RDFE.Utils.uri2name(e.uri);
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
      var sparql = 'select (MAX(?v) as ?mv) from <{0}> where {?s <{1}> ?v}'.format(self.graph, property.URI);
      self.store.execute(sparql, function(error, result) {
        if (!error) {
          if (result.length !== 0) {
            uniqueValue = parseInt(RDFE.coalesce(result[0]["mv"].value, 0));
            if (isNaN(uniqueValue)) {
              uniqueValue = 0;
            }
            uniqueValue++;
          }
        }
        else {
          console.log('Failed to determine unique value for ', uri, ' and ', property.URI, result);
        }
      });
    }
    return uniqueValue;
  };
}();

RDFE.Document.prototype.checkForSignature = function(callback) {
  var self = this;

  self.store.registerDefaultNamespace('rdfs', 'http://www.w3.org/2000/01/rdf-schema#');
  self.store.registerDefaultNamespace('cert', 'http://www.w3.org/ns/auth/cert#');
  self.store.registerDefaultNamespace('oplcert', 'http://www.openlinksw.com/schemas/cert#');
  var sparql =
     'SELECT ?signatureDocURI\
        FROM <{0}> \
       WHERE { \
               <{1}> oplcert:hasSignature ?signatureDocURI . \
             }';
  sparql = sparql.format(self.graph, self.url);
  self.store.execute(sparql, function(error, result) {
    if (!error && result.length) {
      self.signature = result[0]['signatureDocURI'].value;
    }
    else {
      self.signature = null;
    }
    if (callback) {
      callback(self.signature);
    }
  });
};

