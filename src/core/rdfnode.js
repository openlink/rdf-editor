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

  if (typeof(node) === 'number') {
    return new RDFE.RdfNode('literal', node);
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
