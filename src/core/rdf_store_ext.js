/*
 *  This file is part of the OpenLink RDF Editor
 *
 *  Copyright (C) 2014-2022 OpenLink Software
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
  if (parts!=-1 && literalString[parts-1]==='"' && literalString.substring(parts, literalString.length).match(/^@[a-zA-Z\-]+$/g)!=null) {
    var value = literalString.substring(1,parts-1);
    var lang = literalString.substring(parts+1, literalString.length);
    return {"token": "literal", "value": value, "lang": lang};
  }
  parts = literalString.lastIndexOf("^^");
  if (parts!=-1 && literalString[parts-1]==='"' && literalString[parts+2] === '<' && literalString[literalString.length-1] === '>') {
    var value = literalString.substring(1,parts-1);
    var type = literalString.substring(parts+3, literalString.length-1);
    return {"token": "literal", "value": value, "type": type};
  }
  var value = literalString.substring(1,literalString.length-1);
  return {"token": "literal", "value": value};
};


rdfstore.Store.prototype.termToNode = function(term) {
  if (term.token == "literal")
    return this.rdf.createLiteral(term.value, term.lang, term.type);

  if(term.token == "uri")
    return this.rdf.createNamedNode(term.value);

  return this.rdf.createNamedNode(term.value); // FIXME: blank nodes are so much trouble. We need to find a way to handle them properly
};

rdfstore.Store.prototype.rdf.api.RDFNode.prototype.localeCompare = function(compareNode, locales, options) {
    return this.toString().localeCompare(compareNode.toString(), locales, options);
};

rdfstore.Store.prototype.loadTurtle = function(data, graph, baseUri, knownPrefixes, callback) {
  var self = this;
  var parser = N3.Parser();
  var triples = [];
  var blanks = [];

  var convertNode = function(node) {
    switch (node[0]) {
        case '"': {
            if (node.indexOf("^^") > 0) {
                var parts = node.split("^^");
                return {"literal": parts[0] + "^^<" + parts[1] + ">" };
            }
            return {"literal": node };
        }
        case '_': return { blank: node.replace('b', '') };
        default:  return { token: 'uri', value: node, prefix: null, suffix: null };
    }
  };

  var convertTriple = function(triple) {
    return self.rdf.createTriple(convertNode(triple.subject), convertNode(triple.predicate), convertNode(triple.object));
  };

  var insertTriples = function() {
    try {
      self.insert(self.rdf.createGraph(triples), graph, function(error) {
        if (error) {
          if (callback) {
            callback(error);
          }
        }
        else if (blanks.length) {
          try {
            self.insert(self.rdf.createGraph(blanks), graph, function(error) {
              if (error) {
                // exec callback (error) function
                if (callback) {
                  callback(error);
                }
              }
              else {
                // exec callback (success) function
                if (callback) {
                  callback(null);
                }
              }
            });
          }
          catch(e) {
            // exec callback (error) function
            if (callback) {
              callback(e);
            }
          }
        }
        else {
          // exec callback (success) function
          if (callback) {
            callback(null);
          }
        }
      });
    }
    catch(e) {
      // exec callback (error) function
      if (callback) {
        callback(e);
      }
    }
  };

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
        callback(error);
      }
      return;
    }
    if (triple === null) {
      insertTriples();
    }
    else {
      var triple = convertTriple(triple);
      if (triple.subject.interfaceName === 'BlankNode' || triple.object.interfaceName === "BlankNode") {
        blanks.push(triple);
      }
      else {
        triples.push(triple);
      }
    }
  });
};

RDFModel.Graph.prototype.toNTBeatify = function(prefixes) {
    var n3 = "";
    var n3Prefixes = {};

    this.forEach(function(triple) {
	    n3 = n3 + triple.toNTBeatify(prefixes, n3Prefixes);
    });

    var p3 = "";
    for (var key in n3Prefixes) {
	    p3 = p3 + '@prefix ' + key + ': <' + n3Prefixes[key] + '>. \r\n';
    }

    return p3 + '\r\n' + n3;
};

RDFModel.NamedNode.prototype.toNTBeatify = function(prefixes, n3Prefixes) {
    var x = this.toString();
    for (var prefix in prefixes) {
        var ns = prefixes[prefix];
        if (ns.length > 0 && x.startsWith(ns)) {
            n3Prefixes[prefix] = ns;
            return x.replace(ns, prefix + ':');
        }
    }
    return "<"+x+">";
};

RDFModel.BlankNode.prototype.toNTBeatify = function() {
    return this.toNT();
};

RDFModel.Literal.prototype.toNTBeatify = function() {
    return this.toNT();
};

RDFModel.Triple.prototype.toNTBeatify = function(prefixes, n3Prefixes) {
    var s = this.subject.toNTBeatify(prefixes, n3Prefixes);
    var p = this.predicate.toNTBeatify(prefixes, n3Prefixes);
    var o = this.object.toNTBeatify(prefixes, n3Prefixes);
    if (p === 'rdf:type')
        p = 'a';

    return s + " " + p + " " + o + " . \r\n";
};
