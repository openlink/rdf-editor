String.prototype.format = function() {
  var args = arguments;
  return this.replace(/{(\d+)}/g, function(match, number) {
    return typeof args[number] != 'undefined' ? args[number] : match;
  });
};

var RDFE = {};

// GSP statements
RDFE.GSP_RETRIEVE = 'CONSTRUCT {?s ?p ?o} WHERE {GRAPH <{0}> {?s ?p ?o}}';

RDFE.params = function(params, options) {
  return $.extend({}, options, params);
}

RDFE.fileName = function(path) {
  return path.split("/").pop();
}

RDFE.fileParent = function(path) {
  return path.substring(0, path.lastIndexOf('/'));
}

/*
 * Can be used by required callbacks
 */
RDFE.dummy = function() {}

RDFE.graphClear = function(store, graph) {
  store.clear(graph, RDFE.dummy);
}

/*
 *
 * SPARQL IOD - insert, update, delete
 *
 */
RDFE.SPARQL_RETRIEVE = 'CONSTRUCT {?s ?p ?o} WHERE {GRAPH <{0}> {?s ?p ?o}}';
RDFE.SPARQL_INSERT = 'INSERT DATA {GRAPH <{0}> { {1}}}';
RDFE.SPARQL_INSERT_SINGLE = '<{0}> <{1}> {2}';
RDFE.SPARQL_DELETE = 'DELETE DATA {GRAPH <{0}> { <{1}> <{2}> {3} . }}';
RDFE.SPARQL_CLEAR = 'CLEAR GRAPH <{0}>';

RDFE.SPARQL = function(options) {
  var self = this;
  self.options = $.extend({}, options);
}

RDFE.SPARQL.prototype.retrieve = function(graph, params, silent) {
  var self = this;
  params = RDFE.params(params, self.options);
  if (silent) {
    params["ajaxError"] = null;
    params["ajaxSuccess"] = null;
  }
  self.exec(RDFE.SPARQL_RETRIEVE.format(graph), params);
}

RDFE.SPARQL.prototype.retrieveToStore = function(graph, store, storeGraph, params) {
  var self = this;
  params = RDFE.params(params, self.options);
  var __success = function(data, textStatus) {
    RDFE.graphClear(store, storeGraph);
    var parser = N3.Parser();
    parser.parse(data, function(error, triple, prefixes) {
      if (error) {
        // FIXME: proper error handling with a callback
        alert(error);
      }
      if (triple == null) {
        // exec success function
        if (params["__success"]) {
          params["__success"](data);
        }
      } else {
        store.insert([store.n3ToRdfStoreTriple(triple)], storeGraph, function() {});
      }
    });
  };
  params["__success"] = params["success"];
  params["success"] = __success;
  self.retrieve(graph, params, true);
}

RDFE.SPARQL.prototype.insert = function(graph, s, p, o, params) {
  var self = this;
  params = RDFE.params(params, self.options);
  self.exec(RDFE.SPARQL_INSERT.format(graph, RDFE.SPARQL_INSERT_SINGLE.format(s, p, o)), params);
}

RDFE.SPARQL.prototype.insertFromStore = function(graph, store, storeGraph, params) {
  var self = this;
  params = RDFE.params(params, self.options);
  store.graph(storeGraph, function(success, result) {
    if (!success) {
      alert(result);
      return;
    }

    var __success = function(data, textStatus) {
      var chunkSize = params.chunkSize || 400;
      var chunk = function(start) {
        if (start >= result.length) {
          params["success"] = params['__success'];
          params['__success'] = null;
          params['success']();
        } else {
          var triples = '';
          var delimiter = '\n';
          for (var j = start; j < start + chunkSize && j < result.length; j += 1) {
            triples += delimiter + RDFE.SPARQL_INSERT_SINGLE.format(result.toArray()[j].subject, result.toArray()[j].predicate, result.toArray()[j].object.toNT());
            delimiter = ' .\n';
          }
          params["success"] = function() {
            chunk(start + chunkSize);
          };
          self.exec(RDFE.SPARQL_INSERT.format(graph, triples), $.extend({
            method: 'POST'
          }, params));
        }
      };
      chunk(0);
    }
    params["__success"] = params["success"];
    params["success"] = __success;
    self.clear(graph, params);
  });
}

RDFE.SPARQL.prototype.delete = function(graph, s, p, o, params) {
  var self = this;
  params = RDFE.params(params, self.options);
  self.exec(RDFE.SPARQL_DELETE.format(graph, s, p, o), params);
}

RDFE.SPARQL.prototype.clear = function(graph, params, silent) {
  var self = this;
  params = RDFE.params(params, self.options);
  if (silent) {
    params["ajaxError"] = null;
    params["ajaxSuccess"] = null;
  }
  self.exec(RDFE.SPARQL_CLEAR.format(graph), params);
}

RDFE.SPARQL.prototype.exec = function(q, params) {
  var self = this;
  $(document).ajaxError(params.ajaxError);
  $(document).ajaxSuccess(params.ajaxSuccess);

  $.ajax({
    url: params.host,
    success: params.success,
    type: params.method || 'GET',
    data: {
      "query": q,
      "format": params.format
    },
    dataType: 'text'
  });
}

/*
 *
 * SPARQL Graph Store Protocol (GSP)
 *
 */
RDFE.GSP = function(options) {
  var self = this;
  self.options = $.extend({
    "contentType": 'application/octet-stream',
    "processData": false,
  }, options);

}

RDFE.GSP.prototype.retrieve = function(graph, params, silent) {
  params = RDFE.params(params, self.options);
  if (silent) {
    params["ajaxError"] = null;
    params["ajaxSuccess"] = null;
  }
  $(document).ajaxError(params.ajaxError);
  $(document).ajaxSuccess(params.ajaxSuccess);

  $.ajax({
    url: params.host,
    success: params.success,
    type: 'GET',
    data: {
      "query": RDFE.GSP_RETRIEVE.format(graph),
      "format": params.format
    },
    dataType: 'text'
  });
}

RDFE.GSP.prototype.retrieveToStore = function(graph, store, storeGraph, params) {
  params = RDFE.params(params, self.options);
  var __success = function(data, textStatus) {
    RDFE.graphClear(store, storeGraph);
    var parser = N3.Parser();
    parser.parse(data, function(error, triple, prefixes) {
      if (error) {
        // FIXME: proper error handling with a callback
        alert(error);
      }
      if (triple == null) {
        // exec success function
        if (params["__success"]) {
          params["__success"](data);
        }
      } else {
        store.insert([store.n3ToRdfStoreTriple(triple)], storeGraph, function() {});
      }
    });
  };
  params["__success"] = params["success"];
  params["success"] = __success;
  self.retrieve(graph, params, true);
}

RDFE.GSP.prototype.insert = function(graph, content, params) {
  params = RDFE.params(params, self.options);
  self.exec('PUT', graph, content, params);
}

RDFE.GSP.prototype.insertFromStore = function(graph, store, storeGraph, params) {
  params = RDFE.params(params, self.options);
  store.graph(storeGraph, function(success, result) {
    if (!success) {
      alert(result);
      return;
    }

    // clear graph before
    var __success = function(data, textStatus) {
      params["success"] = params["__success"];
      self.insert(graph, result.toNT(), params);
    }
    params["__success"] = params["success"];
    params["success"] = __success;
    self.clear(graph, params, true);
  });
}

RDFE.GSP.prototype.update = function(graph, content, params) {
  params = RDFE.params(params, self.options);
  self.exec('POST', graph, content, params);
}

self.delete = function(graph, params, silent) {
  params = RDFE.params(params, self.options);
  if (silent) {
    params["ajaxError"] = null;
    params["ajaxSuccess"] = null;
  }
  self.exec('DELETE', graph, null, params);
}

RDFE.GSP.prototype.clear = RDFE.GSP.prototype.delete;

RDFE.GSP.prototype.exec = function(method, graph, content, params) {
  $(document).ajaxError(params.ajaxError);
  $(document).ajaxSuccess(params.ajaxSuccess);

  var host = params.host + '?graph=' + encodeURIComponent(graph);
  $.ajax({
    url: host,
    success: params.success,
    type: method,
    contentType: params.contentType,
    processData: params.processData,
    data: content,
    dataType: 'text'
  });
}

/*
 *
 * SPARQL LDP
 *
 */
RDFE.LDP_INSERT = 'INSERT DATA {GRAPH <{0}> { <{1}> <{2}> {3} . }}';
RDFE.LDP = function(options) {
  var self = this;
  self.options = $.extend({
    "dataType": 'text'
  }, options);

}

RDFE.LDP.prototype.retrieve = function(path, params, silent) {
  params = RDFE.params(params, self.options);
  if (silent) {
    params["ajaxError"] = null;
    params["ajaxSuccess"] = null;
  }
  var headers = {
    "Accept": 'text/turtle, */*;q=0.1'
  };
  self.exec('GET', path, headers, null, params);
}

RDFE.LDP.prototype.retrieveToStore = function(path, store, storeGraph, params) {
  params = RDFE.params(params, self.options);
  var __success = function(data, textStatus) {
    RDFE.graphClear(store, storeGraph);
    var parser = N3.Parser();
    parser.parse(data, function(error, triple, prefixes) {
      if (error) {
        // FIXME: proper error handling with a callback
        alert(error);
      }
      if (triple == null) {
        // exec success function
        if (params["__success"]) {
          params["__success"](data);
        }
      } else {
        store.insert([store.n3ToRdfStoreTriple(triple)], storeGraph, function() {});
      }
    });
  };
  params["__success"] = params["success"];
  params["success"] = __success;
  self.retrieve(path, params, true);
}

RDFE.LDP.prototype.insert = function(path, content, params) {
  params = RDFE.params(params, self.options);
  var headers = {
    "Content-Type": 'text/turtle',
    "Slug": RDFE.fileName(path)
  };
  self.exec('POST', RDFE.fileParent(path), headers, content, params);
}

RDFE.LDP.prototype.insertFromStore = function(path, store, storeGraph, params) {
  params = RDFE.params(params, self.options);
  store.graph(storeGraph, function(success, result) {
    if (!success) {
      alert(result);
      return;
    }

    var content = result.toNT();
    self.insert(path, content, params);
  });
}

RDFE.LDP.prototype.update = function(path, s, p, o, params) {
  params = RDFE.params(params, self.options);
  var content = q.format(RDFE.LDP_INSERT, s, p, o);
  var headers = {
    "Content-Type": 'application/sparql-update'
  };
  self.exec('PATCH', path, headers, content, params);
}

RDFE.LDP.prototype.delete = function(path, params) {
  params = RDFE.params(params, self.options);
  self.exec('DELETE', path, null, null, params);
}

RDFE.LDP.prototype.clear = RDFE.LDP.prototype.delete;

RDFE.LDP.prototype.exec = function(method, path, headers, content, params) {
  $(document).ajaxError(params.ajaxError);
  $(document).ajaxSuccess(params.ajaxSuccess);

  $.ajax({
    url: path,
    success: params.success,
    type: method,
    headers: headers,
    contentType: 'application/octet-stream',
    processData: false,
    data: content,
    dataType: params.dataType
  });
}
