/*
 *  This file is part of the OpenLink RDF Editor
 *
 *  Copyright (C) 2014-2016 OpenLink Software
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

/* Extensions for rdfstore.js */
/**
 * Try to abbreviate a URI using the prefixes defined in the rdfstore.
 * @param uri An rdfstore URI node
 * @return The abbreviated CURI string or a @p null if no prefix could be found to match the URI.
 */
rdfstore.Store.prototype.uriToCuri = function(uri) {
    var x = node.toString();
    for (prefix in this.rdf.prefixes) {
        var ns = this.rdf.prefixes[prefix];
        if(ns.length > 0 && x.startsWith(ns)) {
            return x.replace(ns, prefix + ':');
        }
    }
    return null;
};

/**
 * Try to convert an abbreviated CURI into a URI using the prefixes defined in the rdfstore.
 * @param curi The abbreviated URI (Example: @p rdf:type)
 * @return The full URI if the prefix could be found, @p null otherwise.
 */
rdfstore.Store.prototype.curiToUri = function(curi) {
    return this.rdf.resolve(curi);
};

rdfstore.Store.prototype.parseLiteral = function(literalString) {
    var parts = literalString.lastIndexOf("@");
    if(parts!=-1 && literalString[parts-1]==='"' && literalString.substring(parts, literalString.length).match(/^@[a-zA-Z\-]+$/g)!=null) {
        var value = literalString.substring(1,parts-1);
        var lang = literalString.substring(parts+1, literalString.length);
        return {token: "literal", value:value, lang:lang};
    }
    var parts = literalString.lastIndexOf("^^");
    if(parts!=-1 && literalString[parts-1]==='"' && literalString[parts+2] === '<' && literalString[literalString.length-1] === '>') {
        var value = literalString.substring(1,parts-1);
        var type = literalString.substring(parts+3, literalString.length-1);
        return {token: "literal", value:value, type:type};
    }
    var value = literalString.substring(1,literalString.length-1);
    return {token:"literal", value:value};
};


rdfstore.Store.prototype.termToNode = function(term) {
  if (term.token == "literal")
    return this.rdf.createLiteral(term.value, term.lang, term.type);
  else if(term.token == "uri")
    return this.rdf.createNamedNode(term.value);
  else
    return this.rdf.createNamedNode(term.value); // FIXME: blank nodes are so much trouble. We need to find a way to handle them properly
};

rdfstore.Store.prototype.rdf.api.RDFNode.prototype.localeCompare = function(compareNode, locales, options) {
    return this.toString().localeCompare(compareNode.toString(), locales, options);
};

rdfstore.Store.prototype.loadTurtle = function(data, graph, baseUri, knownPrefixes, callback) {
  var self = this;
  var parser = N3.Parser();

  // mapping for blank nodes
  var bns = {};

  var convertNode = function(node) {
    if(!node) {
      return self.rdf.createNamedNode(baseUri);
    }
    else if(N3.Util.isLiteral(node)) {
      // rdfstore treats the empty string as a valid language
      var l = N3.Util.getLiteralLanguage(node);
      if(l == '')
        l = null;
      return self.rdf.createLiteral(N3.Util.getLiteralValue(node), l, N3.Util.getLiteralType(node));
    }
    else if(N3.Util.isBlank(node)) {
      var bn = bns[node];
      if(!bn) {
        bn = self.rdf.createBlankNode();
        bns[node] = bn;
      }
      return bn;
    }
    else {
      return self.rdf.createNamedNode(node);
    }
  };

  var convertTriple = function(triple) {
    return self.rdf.createTriple(convertNode(triple.subject), convertNode(triple.predicate), convertNode(triple.object));
  };

  var addTriples = function(triples) {
    if(triples.length) {
      try {
        self.insert(self.rdf.createGraph(triples), graph, function(s, r) {
          if(!s) {
            if(callback)
              callback(false, 'Failed to add new triple to store: ' + r.toString());
          }
        });
      }
      catch(e) {
        if(callback)
          callback(false, 'Failed to add new triple to store: ' + e.toString());
      }
    }
  };

  var cnt = 0;
  var triples = [];
  parser.parse(data, function(error, triple, prefixes) {
    if (error) {
      if (error.message.startsWith('Undefined prefix') && knownPrefixes) {
        var ndx = error.message.indexOf('"');
        var prefix = error.message.substring(ndx+1);
        ndx = prefix.indexOf('"');
        prefix = prefix.substring(0, ndx-1);
        if (knownPrefixes[prefix]) {
          data = '@prefix ' + prefix + ': <' + knownPrefixes[prefix] + '> .' + data;
          return self.loadTurtle(data, graph, baseUri, knownPrefixes, callback);
        }
      }
      if (callback) {
        callback(false, error);
      }
      return;
    }
    if (triple == null) {
      addTriples(triples);

      // exec success function
      if (callback) {
        callback(true, cnt);
      }
    }
    else {
      var t = convertTriple(triple);
      if (t.subject.interfaceName == 'BlankNode' || t.object.interfaceName == "BlankNode") {
        triples.push(t);
      }
      else {
        self.insert(self.rdf.createGraph([t]), graph, function() {});
      }
      cnt++;
    }
  });
};
