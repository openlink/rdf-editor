/*
 *  This file is part of the OpenLink RDF Editor
 *
 *  Copyright (C) 2014-2020 OpenLink Software
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

  // we deal with dynamic content which means we do not want any caching
  $.ajaxSetup({ cache: false });

  RDFE.IO.createIO = function(type, options) {
    var t = "http";
    var o = {};
    if (typeof(type) === 'string') {
      t = type;
      o = options;
    }
    else if (typeof(type) === 'object') {
      o = type;
      if (o.type) {
        t = o.type;
      }
    }

    if (t === 'sparql')
      return new RDFE.IO.SPARQL(o);

    else if (t === 'gsp')
      return new RDFE.IO.GSP(o);

    else if (t === 'ldp' || t === "webdav" || t === "dav")
      return new RDFE.IO.LDP(o);

    else if (t === 'http')
      return new RDFE.IO.HTTP(o);

    throw "Unsupport IO type: " + t;
  };

  var extendParams = function(params, options) {
    return $.extend({}, options, params);
  };

  var getFn = function(path) {
    return path.split("/").pop();
  };

  var getFParent = function(path) {
    return path.substring(0, path.lastIndexOf('/'));
  };

  /*
  * Can be used by required callbacks
  */
  var dummyFct = function() {};

  var clearGraph = function(store, graph, callback) {
    callback = callback || dummyFct;
    store.clear(graph, callback);
  };

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
      cls.prototype = new construct();
      cls.prototype.constructor = cls;
      cls.super = this;
      return cls;
    };

    c.prototype.baseExec = function(ajaxParams, params) {
      var self = this;

      $(document).ajaxError(params.ajaxError);
      $(document).ajaxSuccess(params.ajaxSuccess);

      // add auth info from self.options.username and .password via
      ajaxParams.headers = ajaxParams.headers || {};
      if (!params.noWebIDTLS) {
        ajaxParams.headers["WebID-TLS"] = "true";
      }
      if (params.username) {
        ajaxParams.headers["Authorization"] = "Basic " + btoa(params.username + ":" + params.password);
        ajaxParams = $.extend({"withCredentials": true}, ajaxParams);
      }
      if (params.authFunction) {
        if (RDFE.Utils.getUrlBase(ajaxParams.url) === RDFE.Utils.getUrlBase(window.location.href)) {
          ajaxParams.headers["X-Requested-With"] = 'XMLHttpRequest';
        }
      }
      ajaxParams = $.extend({"crossDomain": true, "cache": true}, ajaxParams);
      if (self.options["ioTimeout"]) {
        ajaxParams = $.extend({"timeout": self.options["ioTimeout"]}, ajaxParams);
      }

      var settings = $.jStorage.get('rdfe:settings', {});
      if (settings["userID"]) {
        ajaxParams.headers["On-Behalf-Of"] = settings["userID"];
      }

      if ((RDFE.Utils.getProtocol(ajaxParams.url) !== document.location.protocol) && (document.location.protocol === 'https:')) {
        if (params && params.error) {
          params.error({"httpCode": '', "message": 'Mixed Content Error: This request has been blocked; the content must be served over HTTPS'});
        }
        return;
      }

      $.ajax(ajaxParams).done(function(data, status, xhr) {
        if (params && params.success) {
          params.success(data, status, xhr);
        }
      }).fail(function(xhr, status, data) {
        if (params && params.error) {
          var state = {
            "httpCode": xhr.status,
            "message": xhr.statusText
          };
          if (this.crossDomain && (state.message === 'error') && (xhr.status === 0)) {
            state.message = 'CORS Error: ' + ((self.type !== 'sparql')? ajaxParams.url: 'The document') + ' failed to load - this could be related to missing CORS settings on the server.';
          }
          else if (((xhr.status === 400 && self.type === 'sparql') || (xhr.status === 401) || (xhr.status === 403)) && params.authFunction) {
            params.authFunction(ajaxParams.url, function(r) {
              params.username = r.username;
              params.password = r.password;
              self.baseExec(ajaxParams, params);
            }, function() {
              // user did not provide credentials
              state = 'Error: ' + xhr.status + ' - ' + xhr.statusText + ((self.type !== 'sparql')? ' (' + ajaxParams.url + ')': '');
              params.error(state, data, status, xhr);
            });
            return;
          }
          else if (status === 'timeout') {
            state = {
              "httpCode": status,
              "message": 'Timeout Error: Failed to load ' + ((self.type !== 'sparql')? ajaxParams.url: 'document')
            };
          }
          params.error(state, data, status, xhr);
        }
      });
    };

    c.prototype.acceptParameter = function(params) {
      var self = this;

      if (params && params.accept) {
        return params.accept;
      }

      return self.options.accept;
    };

    c.prototype.rerieveLoadCallback = function(error, params, data, status, xhr) {
      if (!error) {
        if (params["__success"]) {
          params["__success"](data, status, xhr);
        }
      }
      else {
        if (params["error"]) {
          params["error"](error);
        }
      }
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
      };

      self.options = $.extend({}, defaults, options);
      if (!self.options.sparqlEndpoint || self.options.sparqlEndpoint.length === 0) {
        self.options.sparqlEndpoint = defaults.sparqlEndpoint;
      }
    });

    var SPARQL_TRIPLE = '<{0}> <{1}> {2}';
    var SPARQL_RETRIEVE = 'CONSTRUCT { ?s ?p ?o } WHERE { GRAPH <{0}> {?s ?p ?o } }';
    var SPARQL_INSERT = 'INSERT DATA { GRAPH <{0}> { {1} } }';
    var SPARQL_DELETE = 'DELETE DATA { GRAPH <{0}> { {1} } }';
    var SPARQL_CLEAR = 'CLEAR GRAPH <{0}>';

    c.prototype.retrieve = function(graph, params, silent) {
      var self = this;
      params = extendParams(params, self.options);
      if (silent) {
        params["ajaxError"] = null;
        params["ajaxSuccess"] = null;
      }
      self.exec(SPARQL_RETRIEVE.format(graph), params);
    };

    c.prototype.retrieveToStore = function(graph, store, storeGraph, params) {
      var self = this;
      params = extendParams(params, self.options);
      var __success = function(data, status, xhr) {
        clearGraph(store, storeGraph, function () {
          store.load('text/turtle', data, storeGraph, function(error) {
            self.rerieveLoadCallback(error, params, data, status, xhr);
          });
        });
      };
      params["__success"] = params["success"];
      params["success"] = __success;
      self.retrieve(graph, params, true);
    };

    c.prototype.insert = function(graph, s, p, o, params) {
      var self = this;
      params = extendParams(params, self.options);
      self.exec(SPARQL_INSERT.format(graph, SPARQL_TRIPLE.format(s, p, o)), params);
    };

    c.prototype.insertFromStore = function(graph, store, storeGraph, params) {
      var self = this;
      params = extendParams(params, self.options);
      store.graph(storeGraph, function(error, result) {
        if (error) {
          if (params.error) {
            params.error(result);
          }
          return;
        }

        result = result.toArray();
        var __success = function(data, textStatus) {
          var chunkSize = params.chunkSize || 400;
          var chunk = function(start) {
            if (start < result.length) {
              var sparql = '';
              var delimiter = ' \n';
              for (var j = start; j < start + chunkSize && j < result.length; j++) {
                var triple = [j];
                sparql += delimiter + SPARQL_TRIPLE.format(triple.subject, triple.predicate, triple.object.toNT());
                delimiter = ' .\n';
              }
              if (!sparql)
                chunk(start + chunkSize);

              sparql = SPARQL_INSERT.format(graph, sparql);
              params["success"] = function() {
                chunk(start + chunkSize);
              };
              self.exec(sparql, $.extend({method: 'POST'}, params));
            } else {
              params["success"] = params['__success'];
              params['__success'] = null;
              if (params['success'])
                params['success']();
            }
          };
          chunk(0);
        };
        params["__success"] = params["success"];
        params["success"] = __success;
        self.clear(graph, params);
      });
    };

    c.prototype.insertFromPatch = function(graph, patch, params) {
      var self = this;

      params = extendParams(params, self.options);
      var chunkSize = params.chunkSize || 400;
      var chunk = function(start) {
        if (start < patch.length) {
          var sparql = '';
          var delimiter = ' \n';
          for (var i = start; i < start + chunkSize && i < patch.length; i++) {
            var sparqlPart = '';
            var delimiterPart = '\n';
            var triples = patch[i].triples;
            if (triples.length) {
              for (var j = 0; j < triples.length; j++) {
                sparqlPart += delimiterPart + SPARQL_TRIPLE.format(triples[j].subject, triples[j].predicate, triples[j].object.toNT());
                delimiterPart = ' .\n';
              }
              if (patch[i].event === 'added') {
                sparqlPart = SPARQL_INSERT.format(graph, sparqlPart);
              } else {
                sparqlPart = SPARQL_DELETE.format(graph, sparqlPart);
              }
              sparql += delimiter + sparqlPart;
            }
          }
          if (!sparql)
            chunk(start + chunkSize);

          params["success"] = function() {
            chunk(start + chunkSize);
          };
          self.exec(sparql, $.extend({method: 'POST'}, params));
        } else {
          params["success"] = params['__success'];
          params['__success'] = null;
          if (params['success'])
            params['success']();
        }
      };
      params["__success"] = params["success"];
      params["success"] = null;
      chunk(0);
    };

    c.prototype.delete = function(graph, s, p, o, params) {
      var self = this;
      params = extendParams(params, self.options);
      self.exec(SPARQL_DELETE.format(graph, SPARQL_TRIPLE.format(s, p, o)), params);
    };

    c.prototype.clear = function(graph, params, silent) {
      var self = this;
      params = extendParams(params, self.options);
      if (silent) {
        params["ajaxError"] = null;
        params["ajaxSuccess"] = null;
      }
      self.exec(SPARQL_CLEAR.format(graph), params);
    };

    c.prototype.exec = function(q, params) {
      var self = this;
      var ajaxParams = {
        url: params.sparqlEndpoint,
        type: params.method || 'GET',
        data: {
          "query": q,
          "format": params.format
        },
        dataType: 'text'
      };
      return self.baseExec(ajaxParams, params);
    };

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
      if (!self.options.gspEndpoint || self.options.gspEndpoint.length === 0) {
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
    };

    c.prototype.retrieveToStore = function(graph, store, storeGraph, params) {
      var self = this;
      params = extendParams(params, self.options);
      var __success = function(data, status, xhr) {
        clearGraph(store, storeGraph, function() {
          store.loadTurtle(data, storeGraph, graph, null, function(error) {
            self.rerieveLoadCallback(error, params, data, status, xhr);
          });
        });
      };
      params["__success"] = params["success"];
      params["success"] = __success;
      this.retrieve(graph, params, true);
    };

    c.prototype.insert = function(graph, content, params) {
      params = extendParams(params, this.options);
      this.exec('PUT', graph, content, params);
    };

    c.prototype.insertFromStore = function(graph, store, storeGraph, params) {
      var self = this;
      params = extendParams(params, self.options);
      store.graph(storeGraph, function(error, result) {
        if (error) {
          if (params.error) {
            params.error(error);
          }
          return;
        }

        // clear graph before
        var __success = function(data, textStatus) {
          params["success"] = params["__success"];
          self.insert(graph, result.toNT(), params);
        };
        params["__success"] = params["success"];
        params["success"] = __success;
        self.clear(graph, params, true);
      });
    };

    c.prototype.update = function(graph, content, params) {
      var self = this;
      params = extendParams(params, self.options);
      self.exec('POST', graph, content, params);
    };

    c.prototype.delete = function(graph, params, silent) {
      var self = this;
      params = extendParams(params, self.options);
      if (silent) {
        params["ajaxError"] = null;
        params["ajaxSuccess"] = null;
      }
      self.exec('DELETE', graph, null, params);
    };

    c.prototype.clear = c.prototype.delete;

    c.prototype.exec = function(method, graph, content, params) {
      var self = this;
      var host = params.gspEndpoint + '?graph=' + encodeURIComponent(graph);
      var ajaxParams = {
        url: host,
        type: method,
        contentType: params.contentType,
        processData: params.processData,
        data: content,
        dataType: 'text'
      };
      return self.baseExec(ajaxParams, params);
    };

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
      var self = this;
      params = extendParams(params, self.options);
      if (silent) {
        params["ajaxError"] = null;
        params["ajaxSuccess"] = null;
      }
      var headers = {};
      if (self.type != 'webdav') {
        headers = {
          "Accept": 'text/turtle, */*;q=0.1'
        };
      }
      self.exec('GET', path, headers, null, params);
    };

    c.prototype.retrieveToStore = function(path, store, graph, params) {
      var self = this;
      params = extendParams(params, self.options);
      var __success = function(data, status, xhr) {
        clearGraph(store, graph, function() {
          store.load('text/turtle', data, graph, function(error) {
            self.rerieveLoadCallback(error, params, data, status, xhr);
          });
        });
      };
      params["__success"] = params["success"];
      params["success"] = __success;
      self.retrieve(path, params, true);
    };

    c.prototype.insert = function(path, content, params) {
      var self = this;
      var method = 'PUT';
      var headers;
      params = extendParams(params, self.options);
      if (self.type !== 'webdav') {
        headers = {"Content-Type": 'text/turtle'};
      }
      self.exec(method, path, headers, content, params);
    };

    c.prototype.insertFromStore = function(path, store, graph, params) {
      var self = this;
      params = extendParams(params, self.options);
      store.graph(graph, function(error, result) {
        if (error) {
          if (params.error) {
            params.error(error);
          }
          return;
        }

        var content = result.toNTBeatify(store.rdf.prefixes);
        var content1 = result.toNT();
        self.insert(path, content, params);
      });
    };

    c.prototype.insertFromPatch = function(path, patch, params) {
      var self = this;
      var SPARQL_TRIPLE = '<{0}> <{1}> {2}';
      var SPARQL_INSERT = 'INSERT DATA { {0} }';
      var SPARQL_DELETE = 'DELETE DATA { {0} }';

      params = extendParams(params, self.options);
      var chunkSize = params.chunkSize || 400;
      var chunk = function(start) {
        if (start < patch.length) {
          var sparql = '';
          var delimiter = ' \n';
          var headers = {"Content-Type": 'application/sparql-update'};

          for (var i = start; i < start + chunkSize && i < patch.length; i++) {
            var sparqlPart = '';
            var delimiterPart = '\n';
            var triples = patch[i].triples;
            if (triples.length) {
              for (var j = 0; j < triples.length; j++) {
                sparqlPart += delimiterPart + SPARQL_TRIPLE.format(triples[j].subject, triples[j].predicate, triples[j].object.toNT());
                delimiterPart = ' .\n';
              }
              if (patch[i].event === 'added') {
                sparqlPart = SPARQL_INSERT.format(sparqlPart);
              } else {
                sparqlPart = SPARQL_DELETE.format(sparqlPart);
              }
              sparql += delimiter + sparqlPart;
            }
          }
          if (!sparql)
            chunk(start + chunkSize);

          params["success"] = function() {
            chunk(start + chunkSize);
          };
          self.exec('PATCH', path, headers, sparql, params);
        } else {
          params["success"] = params['__success'];
          params['__success'] = null;
          if (params['success'])
            params['success']();
        }
      };
      params["__success"] = params["success"];
      params["success"] = null;
      chunk(0);
    };

    c.prototype.update = function(path, g, s, p, o, params) {
      var self = this;
      params = extendParams(params, self.options);
      var content = LDP_INSERT.format(g, s, p, o);
      var headers = {
        "Content-Type": 'application/sparql-update'
      };
      self.exec('PATCH', path, headers, content, params);
    };

    c.prototype.delete = function(path, params) {
      var self = this;
      params = extendParams(params, self.options);
      self.exec('DELETE', path, null, null, params);
    };

    c.prototype.clear = c.prototype.delete;

    c.prototype.exec = function(method, path, headers, content, params) {
      var self = this;
      var ajaxParams = {
        url: path,
        type: method,
        headers: headers,
        contentType: ((params.contentType)? params.contentType: 'text/turtle'),
        processData: false,
        data: content,
        dataType: params.dataType
      };
      return self.baseExec(ajaxParams, params);
    };

    return c;
  })();

  /*
  *
  * HTTP mode
  *
  */
  RDFE.IO.HTTP = (function() {

    var c = RDFE.IO.Base.inherit(function(options) {
      var self = this;

      // call super-constructor
      self.constructor.super.call(self);

      var defaults = {
        "dataType": 'text',
        "httpTemplate": '{0}',
        "httpProxyTemplate": document.location.protocol + '//' + document.location.host + '/proxy?url={0}&output-format=turtle&force=rdf'
      };

      self.options = $.extend({}, defaults, options);
      if (!self.options.httpTemplate || self.options.httpTemplate.length === 0) {
        self.options.httpTemplate = defaults.httpTemplate;
      }
      if (!self.options.httpProxyTemplate || self.options.httpProxyTemplate.length === 0) {
        self.options.httpProxyTemplate = defaults.httpProxyTemplate;
      }
    });

    c.prototype.retrieve = function(URI, params) {
      var self = this;
      var host = (params.proxy) ? self.options.httpProxyTemplate.format(encodeURIComponent(URI)) : self.options.httpTemplate.format(URI);
      var accept = self.acceptParameter();
      if (!accept) {
        accept = 'text/turtle; q=1, text/n3; q=0.9, application/ld+json; q=0.7, application/rdf+xml; q=0.6';
      }
      var ajaxParams = {
        "url": host,
        "type": 'GET',
        "dataType": 'text',
        "beforeSend": function(xhr) {
          xhr.setRequestHeader("Accept", accept);
        }
      };
      return self.baseExec(ajaxParams, params);
    };

    c.prototype.retrieveToStore = function(URI, store, graph, params) {
      var self = this;

      params.__success = params.success;
      params.success = (function(URI, params) {
        return function(data, status, xhr) {
          var contentType = (xhr.getResponseHeader('content-type') || '').split(';')[0];
          store.load(contentType, data, graph, function(error) {
            self.rerieveLoadCallback(error, params, data, status, xhr);
          });
        };
      })(graph, params);

      var host = (params.proxy) ? self.options.httpProxyTemplate.format(encodeURIComponent(URI)) : self.options.httpTemplate.format(URI);
      var accept = self.acceptParameter();
      if (!accept) {
        accept = 'text/turtle; q=1, text/n3; q=0.9, application/ld+json; q=0.7, application/rdf+xml; q=0.6';
      }
      var ajaxParams = {
        "url": host,
        "type": 'GET',
        "dataType": 'text',
        "beforeSend": function(xhr) {
          xhr.setRequestHeader("Accept", accept);
        }
      };
      return self.baseExec(ajaxParams, params);
    };

    return c;
  })();
})(jQuery);
