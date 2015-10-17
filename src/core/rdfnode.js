if(!window.RDFE)
  window.RDFE = {};

/**
 * The RDFE.RdfNode is a generic representation of an RDF node. URIs and literal are supported.
 */
RDFE.RdfNode = function(t, v, dt, l) {
  this.type = t;
  this.value = v;
  this.datatype = dt;
  this.language = l;
};

RDFE.RdfNode.prototype.toStoreNode = function(store) {
  if(this.type == 'uri')
    return store.rdf.createNamedNode(this.value);

  return store.rdf.createLiteral(this.value, this.language, this.datatype);
};

RDFE.RdfNode.prototype.toString = function() {
  return this.value;
};

/**
 * Converts a node from rdfstore.js into an RDFE.RdfNode. It tries to be smart.
 * @param node The value to be converted. Can be one of:
 * - string - will be converted into a URI node.
 * - RDFE.RdfNode - will simply be returned
 * - rdfstore.js node (RDFJSInterface based or plain) will be converted
 *
 * Signals an error when encountering a blank node as those are not supported.
 */
RDFE.RdfNode.fromStoreNode = function(node) {
  // plain string
  if (typeof(node) === 'string') {
    return new RDFE.RdfNode('uri', node);
  }

  // already an RdfNode
  if (node instanceof RDFE.RdfNode) {
    return node;
  }

  // rdfstore nodes
  if (node.token) {
    return new RDFE.RdfNode(node.token, node.value, node.type, node.lang);
  }

  // rdfstore.rdf nodes
  if (node.interfaceName) {
    var t;

    if (node.interfaceName === 'NamedNode') {
      t = 'uri';
    }
    else if(node.interfaceName === 'Literal') {
      t = 'literal'
    }
    else {
      throw "Blank nodes cannot be converted into RDFE.RdfNode values.";
    }
    return new RDFE.RdfNode(t, node.nominalValue, node.datatype, node.language);
  }

  // entities
  if (node.uri) {
    return new RDFE.RdfNode('uri', node.uri);
  }

  // unknown
  throw "Unsupported node type for RDFE.RdfNode conversion.";
};
