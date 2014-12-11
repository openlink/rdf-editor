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
String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) {
        return typeof args[number] != 'undefined' ? args[number] : match;
    });
};

RDFE = {};

// SPARQL I/O statements
RDFE.IO_RETRIEVE = 'SELECT * WHERE {GRAPH <{0}> { ?s ?p ?o. }}';
RDFE.IO_INSERT = 'INSERT DATA {GRAPH <{0}> { {1}}}';
RDFE.IO_INSERT_SINGLE = '<{0}> <{1}> {2}';
RDFE.IO_DELETE = 'DELETE DATA {GRAPH <{0}> { <{1}> <{2}> {3} . }}';
RDFE.IO_CLEAR = 'CLEAR GRAPH <{0}>';

// GSP statements
RDFE.GSP_RETRIEVE = 'SELECT * WHERE {GRAPH <{0}> { ?s ?p ?o. }}';

RDFE.params = function(params, options) {
    return $.extend({}, options, params);
}

RDFE.fileName = function(path) {
    return path.split("/").pop();
}

RDFE.fileParent = function(path) {
    return path.substring(0, path.lastIndexOf('/'));
}

RDFE.io = function(options) {
    var self = this;
    self.options = $.extend({
        "async": true
    }, options);

    self.retrieve = function(params) {
        params = RDFE.params(params, self.options);
        self.exec(RDFE.IO_RETRIEVE.format(params.graph), params);
    }

    self.insert = function(s, p, o, params) {
        params = RDFE.params(params, self.options);
        self.exec(RDFE.IO_INSERT.format(params.graph, RDFE.IO_INSERT_SINGLE.format(s, p, o)), params);
    }

    self.insertFromStore = function(store, graph, params) {
        params = RDFE.params(params, self.options);
        store.graph(graph, function(success, g) {
            if (!success)
              return;

            // clear graph before
            self.clear(params, true);

            var delimiter = '';
            var triples = '';
            for (var i = 0; i < g.length; i++) {
              triples += delimiter + RDFE.IO_INSERT_SINGLE.format(g.toArray()[i].subject, g.toArray()[i].predicate, g.toArray()[i].object);
              delimiter = ' . ';
            }
            if (triples)
              self.exec(RDFE.IO_INSERT.format(params.graph, triples), params);
        });
    }

    self.delete = function(s, p, o, params) {
        params = RDFE.params(params, self.options);
        self.exec(RDFE.IO_DELETE.format(params.graph, s, p, o), params);
    }

    self.clear = function(params, silent) {
        params = RDFE.params(params, self.options);
        if (silent) {
            params["async"] = false;
            params["ajaxError"] = null;
            params["ajaxSuccess"] = null;
            params["success"] = null;
        }
        self.exec(RDFE.IO_CLEAR.format(params.graph), params);
    }

    self.exec = function(q, params) {
        $(document).ajaxError(params.ajaxError);
        $(document).ajaxSuccess(params.ajaxSuccess);

        $.ajax({
            url: params.host,
            success: params.success,
            type: 'GET',
            async: params.async,
            data: {
                "query": q,
                "format": params.format
            },
            dataType: 'text'
        });
    }
}

RDFE.gsp = function(options) {
    var self = this;
    self.options = $.extend({
        "async": true,
        "contentType": 'application/octet-stream',
        "processData": false,
    }, options);

    self.retrieve = function(params) {
        params = RDFE.params(params, self.options);
        $(document).ajaxError(params.ajaxError);
        $(document).ajaxSuccess(params.ajaxSuccess);

        $.ajax({
            url: params.host,
            success: params.success,
            type: 'GET',
            async: params.async,
            data: {
                "query": RDFE.GSP_RETRIEVE.format(params.graph),
                "format": params.format
            },
            dataType: 'text'
        });
    }

    self.insert = function(content, params) {
        params = RDFE.params(params, self.options);
        self.exec('PUT', content, params);
    }

    self.insertFromStore = function(store, graph, params) {
        params = RDFE.params(params, self.options);
        store.graph(graph, function(success, g) {
            if (!success)
              return;

            // clear graph before
            self.clear(params, true);

            var content = g.toNT();
            self.insert(content, params);
        });
    }

    self.update = function(content, params) {
        params = RDFE.params(params, self.options);
        self.exec('POST', content, params);
    }

    self.delete = function(params, silent) {
        params = RDFE.params(params, self.options);
        if (silent) {
            params["async"] = false;
            params["ajaxError"] = null;
            params["ajaxSuccess"] = null;
            params["success"] = null;
        }
        self.exec('DELETE', null, params);
    }

    self.clear = self.delete;

    self.exec = function(method, content, params) {
        $(document).ajaxError(params.ajaxError);
        $(document).ajaxSuccess(params.ajaxSuccess);

        var host = params.host + '?graph=' + encodeURIComponent(params.graph);
        $.ajax({
            url: host,
            success: params.success,
            type: method,
            async: params.async,
            contentType: params.contentType,
            processData: params.processData,
            data: content,
            dataType: 'text'
        });
    }
}

RDFE.LDP_INSERT = 'INSERT DATA {GRAPH <{0}> { <{1}> <{2}> {3} . }}';
RDFE.ldp = function(options) {
    var self = this;
    self.options = $.extend({
        "async": true,
        "dataType": 'text'
    }, options);

    self.retrieve = function(path, params) {
        params = RDFE.params(params, self.options);
        var headers = {
            "Accept": 'text/turtle, */*;q=0.1'
        };
        self.exec('GET', path, headers, null, params);
    }

    self.insert = function(path, content, params) {
        params = RDFE.params(params, self.options);
        var headers = {
            "Content-Type": 'text/turtle',
            "Slug": RDFE.fileName(path)
        };
        self.exec('POST', RDFE.fileParent(path), headers, content, params);
    }

    self.insertFromStore = function(path, store, graph, params) {
        params = RDFE.params(params, self.options);
        store.graph(graph, function(success, g) {
            if (!success)
                return;

            var content = g.toNT();
            self.insert(path, content, params);
        });
    }

    self.update = function(path, s, p, o, params) {
        params = RDFE.params(params, self.options);
        var content = q.format(RDFE.LDP_INSERT, s, p, o);
        var headers = {
            "Content-Type": 'application/sparql-update'
        };
        self.exec('PATCH', path, headers, content, params);
    }

    self.delete = function(path, params) {
        params = RDFE.params(params, self.options);
        self.exec('DELETE', path, null, null, params);
    }

    self.clear = self.delete;

    self.exec = function(method, path, headers, content, params) {
        $(document).ajaxError(params.ajaxError);
        $(document).ajaxSuccess(params.ajaxSuccess);

        $.ajax({
            url: path,
            success: params.success,
            type: method,
            async: params.async,
            headers: headers,
            contentType: 'application/octet-stream',
            processData: false,
            data: content,
            dataType: params.dataType
        });
    }
}
