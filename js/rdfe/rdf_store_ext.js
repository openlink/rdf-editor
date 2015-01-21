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

rdfstore.Store.prototype.rdf.api.NamedNode.prototype.localeCompare = function(compareNode, locales, options) {
    return this.toString().localeCompare(compareNode.toString(), locales, options);
};

rdfstore.Store.prototype.rdf.api.Literal.prototype.localeCompare = function(compareNode, locales, options) {
    return this.toString().localeCompare(compareNode.toString(), locales, options);
};

rdfstore.Store.prototype.loadTurtle = function(data, graph, callback) {
  var self = this;
  var parser = N3.Parser();

  // mapping for blank nodes
  var bns = {};

  var convertNode = function(node) {
    if(N3.Util.isLiteral(node)) {
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

  var cnt = 0;
  parser.parse(data, function(error, triple, prefixes) {
    if (error) {
      if(callback)
        callback(false, error);
    }
    if (triple == null) {
      // exec success function
      if (callback) {
        callback(true, cnt);
      }
    }
    else {
      self.insert([convertTriple(triple)], graph, function() {});
      cnt++;
    }
  });
};
