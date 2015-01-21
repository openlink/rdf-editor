String.prototype.format = function() {
  var args = arguments;
  return this.replace(/{(\d+)}/g, function(match, number) {
    return typeof args[number] != 'undefined' ? args[number] : match;
  });
};

(function($) {
  if (!window.RDFE) {
    window.RDFE = {};
  }
  RDFE.IO = {};

  RDFE.IO.createIO = function(type, options) {
    var t = "sparql";
    var o = {};
    if (typeof(type) == 'string') {
      t = type;
      o = options;
    } else if (typeof(type) == 'object') {
      o = type;
      if (o.type) {
        t = o.type;
      }
    }

    if (t == 'sparql')
      return new RDFE.IO.SPARQL(o);

    else if (t == 'gsp')
      return new RDFE.IO.GSP(o);

    else if (t == 'ldp' || t == "webdav" || t == "dav")
      return new RDFE.IO.LDP(o);

    throw "Unsupport IO type: " + t;
  };

  var extendParams = function(params, options) {
    return $.extend({}, options, params);
  }

  var getFn = function(path) {
    return path.split("/").pop();
  }

  var getFParent = function(path) {
    return path.substring(0, path.lastIndexOf('/'));
  }

  /*
  * Can be used by required callbacks
  */
  var dummyFct = function() {}

  var clearGraph = function(store, graph) {
    store.clear(graph, dummyFct);
  }

  RDFE.IO.Base = (function() {
    // constructor
    var c = function() {
    };

    // class-inheritance utitity function
    c.inherit = function(cls) {
      // We use an intermediary empty constructor to create an
      // inheritance chain, because using the super class' constructor
      // might have side effects.
      var construct = function () {};
      construct.prototype = this.prototype;
      cls.prototype = new construct;
      cls.prototype.constructor = cls;
      cls.super = this;
      return cls;
    };

    return c;
  })();

  /*
  *
  * SPARQL IOD - insert, update, delete
  *
  */
  RDFE.IO.SPARQL = (function() {
    var c = RDFE.IO.Base.inherit(function(options) {
      var self = this;

      // call super-constructor
      self.constructor.super.call(this);

      var defaults = {
        sparqlEndpoint: window.location.protocol + '//' + window.location.host + '/sparql'
      }

      self.options = $.extend({}, defaults, options);
      if (!self.options.sparqlEndpoint || self.options.sparqlEndpoint.length == 0) {
        self.options.sparqlEndpoint = defaults.sparqlEndpoint;
      }
    });

    var SPARQL_RETRIEVE = 'CONSTRUCT {?s ?p ?o} WHERE {GRAPH <{0}> {?s ?p ?o}}';
    var SPARQL_INSERT = 'INSERT DATA {GRAPH <{0}> { {1}}}';
    var SPARQL_INSERT_SINGLE = '<{0}> <{1}> {2}';
    var SPARQL_DELETE = 'DELETE DATA {GRAPH <{0}> { <{1}> <{2}> {3} . }}';
    var SPARQL_CLEAR = 'CLEAR GRAPH <{0}>';

    c.prototype.retrieve = function(graph, params, silent) {
      var self = this;
      params = extendParams(params, self.options);
      if (silent) {
        params["ajaxError"] = null;
        params["ajaxSuccess"] = null;
      }
      self.exec(SPARQL_RETRIEVE.format(graph), params);
    }

    c.prototype.retrieveToStore = function(graph, store, storeGraph, params) {
      var self = this;
      params = extendParams(params, self.options);
      var __success = function(data, textStatus) {
        clearGraph(store, storeGraph);
        store.loadTurtle(data, storeGraph, function(success, r) {
          if (success && params["__success"]) {
            params["__success"]();
          }
          else if(!success && params["error"]) {
            params["error"](r);
          }
        });
      };
      params["__success"] = params["success"];
      params["success"] = __success;
      self.retrieve(graph, params, true);
    }

    c.prototype.insert = function(graph, s, p, o, params) {
      var self = this;
      params = extendParams(params, self.options);
      self.exec(SPARQL_INSERT.format(graph, SPARQL_INSERT_SINGLE.format(s, p, o)), params);
    }

    c.prototype.insertFromStore = function(graph, store, storeGraph, params) {
      var self = this;
      params = extendParams(params, self.options);
      store.graph(storeGraph, function(success, result) {
        if (!success) {
          if (params.error) {
            params.error(result);
          }
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
                triples += delimiter + SPARQL_INSERT_SINGLE.format(result.toArray()[j].subject, result.toArray()[j].predicate, result.toArray()[j].object.toNT());
                delimiter = ' .\n';
              }
              params["success"] = function() {
                chunk(start + chunkSize);
              };
              self.exec(SPARQL_INSERT.format(graph, triples), $.extend({
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

    c.prototype.delete = function(graph, s, p, o, params) {
      var self = this;
      params = extendParams(params, self.options);
      self.exec(SPARQL_DELETE.format(graph, s, p, o), params);
    }

    c.prototype.clear = function(graph, params, silent) {
      var self = this;
      params = extendParams(params, self.options);
      if (silent) {
        params["ajaxError"] = null;
        params["ajaxSuccess"] = null;
      }
      self.exec(SPARQL_CLEAR.format(graph), params);
    }

    c.prototype.exec = function(q, params) {
      var self = this;
      $(document).ajaxError(params.ajaxError);
      $(document).ajaxSuccess(params.ajaxSuccess);

      $.ajax({
        url: params.sparqlEndpoint,
        success: params.success,
        error: params.error,
        type: params.method || 'GET',
        data: {
          "query": q,
          "format": params.format
        },
        dataType: 'text'
      });
    }

    return c;
  }());

  /*
  *
  * SPARQL Graph Store Protocol (GSP)
  *
  */
  RDFE.IO.GSP = (function() {
    var c = RDFE.IO.Base.inherit(function(options) {
      console.log('GSP');
      var self = this;

      // call super-constructor
      self.constructor.super.call(this);

      var defaults = {
        "contentType": 'application/octet-stream',
        "processData": false,
        "gspEndpoint": window.location.protocol + '//' + window.location.host + '/sparql-graph-crud'
      };

      self.options = $.extend({}, defaults, options);
      if (!self.options.gspEndpoint || self.options.gspEndpoint.length == 0) {
        self.options.gspEndpoint = defaults.gspEndpoint;
      }
    });

    // GSP statements
    var GSP_RETRIEVE = 'CONSTRUCT {?s ?p ?o} WHERE {GRAPH <{0}> {?s ?p ?o}}';

    c.prototype.retrieve = function(graph, params, silent) {
      var self = this;
      params = extendParams(params, self.options);
      if (silent) {
        params["ajaxError"] = null;
        params["ajaxSuccess"] = null;
      }
      this.exec("GET", graph, null, params);
    }

    c.prototype.retrieveToStore = function(graph, store, storeGraph, params) {
      var self = this;
      params = extendParams(params, self.options);
      var __success = function(data, textStatus) {
        clearGraph(store, storeGraph);
        store.loadTurtle(data, storeGraph, function(success, r) {
          if (success && params["__success"]) {
            params["__success"]();
          }
          else if(!success && params["error"]) {
            params["error"](r);
          }
        });
      };
      params["__success"] = params["success"];
      params["success"] = __success;
      this.retrieve(graph, params, true);
    }

    c.prototype.insert = function(graph, content, params) {
      params = extendParams(params, this.options);
      this.exec('PUT', graph, content, params);
    }

    c.prototype.insertFromStore = function(graph, store, storeGraph, params) {
      var self = this;
      params = extendParams(params, self.options);
      store.graph(storeGraph, function(success, result) {
        if (!success) {
          if (params.error) {
            params.error(result);
          }
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

    c.prototype.update = function(graph, content, params) {
      var self = this;
      params = extendParams(params, self.options);
      self.exec('POST', graph, content, params);
    }

    self.delete = function(graph, params, silent) {
      var self = this;
      params = extendParams(params, self.options);
      if (silent) {
        params["ajaxError"] = null;
        params["ajaxSuccess"] = null;
      }
      self.exec('DELETE', graph, null, params);
    }

    c.prototype.clear = c.prototype.delete;

    c.prototype.exec = function(method, graph, content, params) {
      $(document).ajaxError(params.ajaxError);
      $(document).ajaxSuccess(params.ajaxSuccess);

      var host = params.gspEndpoint + '?graph=' + encodeURIComponent(graph);
      $.ajax({
        url: host,
        success: params.success,
        error: params.error,
        type: method,
        contentType: params.contentType,
        processData: params.processData,
        data: content,
        dataType: 'text'
      });
    }

    return c;
  })();

  /*
  *
  * SPARQL LDP
  *
  */
  RDFE.IO.LDP = (function() {
    var c = RDFE.IO.Base.inherit(function(options) {
      var self = this;

      // call super-constructor
      self.constructor.super.call(this);

      var defaults = {
        "dataType": 'text'
      };

      self.options = $.extend({}, defaults, options);
    });

    var LDP_INSERT = 'INSERT DATA {GRAPH <{0}> { <{1}> <{2}> {3} . }}';

    c.prototype.retrieve = function(path, params, silent) {
      params = extendParams(params, this.options);
      if (silent) {
        params["ajaxError"] = null;
        params["ajaxSuccess"] = null;
      }
      var headers = {
        "Accept": 'text/turtle, */*;q=0.1'
      };
      this.exec('GET', path, headers, null, params);
    }

    c.prototype.retrieveToStore = function(path, store, storeGraph, params) {
      params = extendParams(params, this.options);
      var __success = function(data, textStatus) {
        clearGraph(store, storeGraph);
        store.loadTurtle(data, storeGraph, function(success, r) {
          if (success && params["__success"]) {
            params["__success"]();
          }
          else if(!success && params["error"]) {
            params["error"](r);
          }
        });
      };
      params["__success"] = params["success"];
      params["success"] = __success;
      this.retrieve(path, params, true);
    }

    c.prototype.insert = function(path, content, params) {
      params = extendParams(params, this.options);
      var headers = {
        "Content-Type": 'text/turtle',
        "Slug": getFn(path)
      };
      this.exec('POST', getFParent(path), headers, content, params);
    }

    c.prototype.insertFromStore = function(path, store, storeGraph, params) {
      var self = this;
      params = extendParams(params, self.options);
      store.graph(storeGraph, function(success, result) {
        if (!success) {
          if (params.error) {
            params.error(result);
          }
          return;
        }

        var content = result.toNT();
        self.insert(path, content, params);
      });
    }

    c.prototype.update = function(path, s, p, o, params) {
      var self = this;
      params = extendParams(params, self.options);
      var content = q.format(LDP_INSERT, s, p, o);
      var headers = {
        "Content-Type": 'application/sparql-update'
      };
      self.exec('PATCH', path, headers, content, params);
    }

    c.prototype.delete = function(path, params) {
      var self = this;
      params = extendParams(params, self.options);
      self.exec('DELETE', path, null, null, params);
    }

    c.prototype.clear = c.prototype.delete;

    c.prototype.exec = function(method, path, headers, content, params) {
      var self = this;
      $(document).ajaxError(params.ajaxError);
      $(document).ajaxSuccess(params.ajaxSuccess);

      $.ajax({
        url: path,
        success: params.success,
        error: params.error,
        type: method,
        headers: headers,
        contentType: 'application/octet-stream',
        processData: false,
        data: content,
        dataType: params.dataType
      });
    }

    return c;
  })();
})(jQuery);
