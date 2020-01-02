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

if(!window.RDFE)
  window.RDFE = {};

RDFE.EntityModel = Backbone.Model.extend({
  setEntity: function(doc, uri) {
    this.doc = doc;
    this.uri = uri;
    this.individualsCache = {};
  },

  addValue: function(p, val) {
    var d = this.get(p) || [];
    d.push(val);
    this.set(p, d);
  },

  /**
   * Gets individuals for the given range type from both the document
   * and the ontology manager.
   *
   * Results are cached for performance improvement on larger editor
   * forms.
   */
  getIndividuals: function(range, callback) {
    var self = this;

    // check cache first
    if(this.individualsCache[range]) {
      callback(this.individualsCache[range]);
      return;
    }

    var items = [];

    var rc = this.doc.ontologyManager.ontologyClassByURI(range);

    // get individuals from the ontology manager
    if(!range || range === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#Resource') {
      items = this.doc.ontologyManager.individuals;
    }
    else if(range === 'http://www.w3.org/2000/01/rdf-schema#Class') {
      items = this.doc.ontologyManager.ontologyClasses;
    }
    else if(range === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#Property') {
      items = this.doc.ontologyManager.ontologyProperties;
    }
    else {
      if(rc) {
        items = rc.getIndividuals(true);
      }
    }
    // convert the object we get from the ontologyManager into a flat list with labels
    items = _.map(_.values(items), function(cl) {
      var n = new RDFE.RdfNode('uri', cl.URI);
      // FIXME: honor config.labelProps
      n.label = cl.label || cl.name;
      return n;
    });

    // get individuals from the document
    self.doc.listEntities(range, function(el) {
      $.merge(items, el);
    });
    if (rc) {
      var subClasses = rc.getSubClasses(true);
      for (var i = 0, l = subClasses.length; i < l; i++) {
        self.doc.listEntities(subClasses[i].URI, function(el) {
          $.merge(items, el);
        });
      }
    }

    // cache the items for a minor perf improvement
    this.individualsCache[range] = items;

    // return the merged individuals list
    callback(items);
  },

  maxCardinalityForProperty: function(p) {
    for(var i = 0; i < this.types.length; i++) {
      var c = this.types[i].maxCardinalityForProperty(p);
      if(c)
        return c;
    }
    return null;
  },

  restrictionsForProperty: function(p) {
    for(var i = 0; i < this.types.length; i++) {
      var c = this.types[i].restrictions[p];
      if(c)
        return c;
    }
    return null;
  },

  isAggregateProperty: function(p) {
    for(var i = 0; i < this.types.length; i++) {
      if(this.types[i].isAggregateProperty(p))
        return true;
    }
    return false;
  },

  addSchemaEntryForProperty: function(p) {
    var self = this;
    var property = (p.URI ? p : (self.doc.ontologyManager.ontologyProperties[p] || { URI: p }));

    var restrictions = this.restrictionsForProperty(p);
    var restrictionLabel;
    var restrictionComment;
    if (restrictions) {
      restrictionLabel = restrictions["hasCustomLabel"];
      restrictionComment = restrictions["hasCustomComment"];
    }
    var label = RDFE.Utils.createTitle(restrictionLabel || property.label || property.title || RDFE.Utils.uri2name(property.URI))
    var item = {
      titleHTML: '<span title="{0}">{1}</span>'.format(RDFE.Utils.escapeXml(property.URI), label),
      title: label,
      maxCardinality: self.maxCardinalityForProperty(property.URI),
      editorAttrs: {
        "title": RDFE.coalesce(restrictionComment, property.comment, property.description)
      }
    };

    if(self.isAggregateProperty(property.URI)) {
      var range = (property.getRange ? self.doc.ontologyManager.ontologyClassByURI(property.getRange()) : null);
      if(range) {
        item.type = "List";
        item.itemType = "NestedRdf";
        item.model = RDFE.EntityModel.extend({
          defaults: {
            'http://www.w3.org/1999/02/22-rdf-syntax-ns#type': [ new RDFE.RdfNode('uri', property.getRange()) ]
          },
          initialize: function(options) {
            RDFE.EntityModel.prototype.initialize.call(this, options);
            this.doc = self.doc;
            this.buildSchemaFromTypes([range]);
          },
          individualsCache: self.individualsCache
        });
        item.editorAttrs.style = "height:auto;"; //FIXME: use editorClass instead
      }
      else {
        console.log('Caution: invalid range on aggregate: ', property);
        item.type = "List";
        item.itemType = "Rdfnode";
        item.rdfnode = {
          "type": "http://www.w3.org/1999/02/22-rdf-syntax-ns#Resource",
          "create": true //FIXME: make this configurable
        };
      }
    }
    else {
      item.type = "List";
      item.itemType = "Rdfnode";
      item.rdfnode = {};

      var pRange = _.result(property, "getRange");

      // TODO: eventually we should support range inheritence
      if (property.class == self.doc.ontologyManager.uriDenormalize('owl:DatatypeProperty')) {
        item.rdfnode.type = pRange;
      }
      else if (property.class == self.doc.ontologyManager.uriDenormalize('owl:ObjectProperty')) {
        item.rdfnode.type = "http://www.w3.org/1999/02/22-rdf-syntax-ns#Resource";
        item.rdfnode.choices = function(callback) { self.getIndividuals(pRange, callback); };
        item.rdfnode.create = true; //FIXME: make this configurable
      }
      else if (pRange) {
        if (pRange == "http://www.w3.org/2000/01/rdf-schema#Literal" ||
            pRange.startsWith('http://www.w3.org/2001/XMLSchema#')) {
          item.rdfnode.type = pRange;
        }
        else {
          item.rdfnode.type = "http://www.w3.org/1999/02/22-rdf-syntax-ns#Resource";
          item.rdfnode.choices = function(callback) { self.getIndividuals(pRange, callback); };
          item.rdfnode.create = true; //FIXME: make this configurable
        }
      }
    }

    self.schema[property.URI] = item;
  },

  buildSchemaFromTypes: function(cTypes) {
    //
    // Get the list of properties (fresnel lens vs. existing properties)
    //
    var self = this;
    self.schema = {};
    self.fields = [];
    self.lens = null;
    self.types = cTypes;

    for (var i = 0, l = cTypes.length; i < l; i++) {
      var lens = cTypes[i].getFresnelLens();
      if(lens && lens.showProperties.length) {
        self.lens = lens;
        break;
      }
    }

    if(lens) {
      // get the fields from the lens, drop the fresnel special since this is only used for empty models
      self.fields = _.without(lens.showProperties, self.doc.ontologyManager.uriDenormalize('fresnel:allProperties'));
    }
    else {
      // no lens - at least show the type
      self.fields = [ self.doc.ontologyManager.uriDenormalize('rdf:type') ];
    }

    //
    // Build the schema from the list of properties
    //
    for(var i = 0; i < self.fields.length; i++) {
      self.addSchemaEntryForProperty(self.fields[i]);
    }
  },

  /// read the properties of this.uri from the store and put them into the model
  docToModel: function(success, fail) {
    var self = this;
    self.schema = {};
    self.fields = [];

    this.doc.getEntity(self.uri, function(entity) {
      // TODO: optionally load the ontologies for this.types. Ideally through a function in the ontology manager, something like getClass()
      //       however, to avoid async code here, it might be better to load the ontologies once the document has been loaded.
      self.types = _.compact(_.map(entity.types, self.doc.ontologyManager.ontologyClassByURI, self.doc.ontologyManager));
      self.fields = [];
      self.lens = null;
      var domainTypes = [];

      //
      // poor-man's inference: if no type is specified, get the types via property domains
      //
      if(self.types.length === 0) {
        for (var prop in entity.properties) {
          var p = self.doc.ontologyManager.ontologyPropertyByURI(prop);
          if(p && p.domain) {
            self.types = _.union(self.types, p.domain);
          }
        }
      }


      //
      // Get the list of properties (fresnel lens vs. existing properties)
      //
      for (var i = 0, l = self.types.length; i < l; i++) {
        var lens =  self.types[i].getFresnelLens();
        if(lens && lens.showProperties.length > 0) {
          self.lens = lens;
          break;
        }
      }

      if(lens) {
        self.fields = _.clone(lens.showProperties);
      }

      if(!lens) {
        // only chow the "Add Property" button if we have fresnel:allProperties in the lens or we have no lens
        self.allowAddProperty = true;

        // build the list of fields from the existing triples.
        for (var prop in entity.properties) {
          if(!_.contains(self.fields, prop)) {
            prop === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' ? self.fields.unshift(prop) : self.fields.push(prop);
          }
        }
      }
      else {
        // replace fresnel:allProperties with the missing properties, rather than appending them
        var j = self.fields.indexOf(self.doc.ontologyManager.uriDenormalize('fresnel:allProperties'));
        if(j >= 0) {
          // only chow the "Add Property" button if we have fresnel:allProperties in the lens or we have no lens
          self.allowAddProperty = true;

          var mp = [];
          for (prop in entity.properties) {
            if(!_.contains(self.fields, prop) && !_.contains(lens.hideProperties, prop))
              mp.push(prop);
          }
          self.fields.splice.apply(self.fields, [j, 1].concat(mp));
        }
      }

      //
      // Build the schema from the list of properties
      //
      for(var i = 0; i < self.fields.length; i++) {
        self.addSchemaEntryForProperty(self.fields[i]);
      }

      //
      // Add the data to the model
      //
      for (var prop in entity.properties) {
        var isAgg = self.isAggregateProperty(prop),
            vals = entity.properties[prop];
        for(var i = 0; i < vals.length; i++) {
          if(isAgg) {
            var subm = new RDFE.EntityModel();
            subm.setEntity (self.doc, vals[i].value);
            subm.individualsCache = self.individualsCache;
            subm.docToModel(function() {
              self.addValue(prop, subm);
            });
          }
          else {
            self.addValue(prop, vals[i]);
          }
        }
      }

      if(success) {
        success();
      }
    });
  },

  /// save the data in the model back to the store
  modelToDoc: function() {

    // A counter for newly created resource URIs. This is necessary since
    // we might be creating multiple new resource URIs in one go without saving them into
    // the document.
    var newResCnt = 1;

    /**
     * Recursively build the triples from the given resource uri and values.
     *
     * @param res The resource/subject URI (can be empty)
     * @param values An object mapping property URIs to lists of values
     * @param doc The RDFE.Document to save to (required for building nodes)
     *
     * @return A list of rdfstore triples.
     */
    function buildTriples(res, values, doc) { // FIXME: add loop-detection
      var t = [];

      // build a new resource uri. We need to use the depth since doc.buildEntityUri()
      // will only check existing uris, not the ones we created here.
      if(!res || res.length === 0) {
        // find a label
        var name = "";
        for(var i = 0, l = doc.config.options.labelProps.length; i < l; i++) {
          if(values[doc.config.options.labelProps[i]]) {
            name = values[doc.config.options.labelProps[i]];
            break;
          }
        }
        name = (name || 'subres') + '_' + newResCnt;
        res = doc.buildEntityUri(name);
        newResCnt++;
      }

      var resNode = doc.store.rdf.createNamedNode(res);

      // iterate the values and create triples for them
      for(prop in values) {
        var propNode = doc.store.rdf.createNamedNode(prop);
        var val = values[prop];
        if (val.constructor !== Array) {
          val = [val];
        }

        for(var k = 0; k < val.length; k++) {
          var v = val[k];

          // nested model
          if(v.values) {
            // merge in tripels from the nested model
            var nt = buildTriples(v.uri, v.values, doc);
            if(nt.length > 0) {
              // include the relation to the sub-resource itself
              // Here we rely on the fact that the main triples come first since we use the first triple's subject as object.
              // The latter is necessary since v.uri might be empty.
              t.push(doc.store.rdf.createTriple(
                resNode,
                propNode,
                nt[0].subject));

              // the triples that make up the sub-resource
              Array.prototype.push.apply(t, nt);
            }
          }
          else {
            var sv = val[k].toStoreNode(doc.store);
            if(sv && sv.nominalValue.length > 0) {

              t.push(doc.store.rdf.createTriple(
                resNode,
                propNode,
                sv));
            }
          }
        }
      }

      return t;
    }

    return function(success, fail) {
      var self = this;
      // recursively build the set of triples to add
      newResCnt = 1;
      var triples = buildTriples(this.uri, self.attributes, self.doc);

      // get the list of triples to delete by gathering the subjects in the triples to add
      var deleteNodes = [];
      for(var i = 0; i < triples.length; i++) {
        if(_.indexOf(deleteNodes, triples[i].subject.nominalValue) < 0) {
          deleteNodes.push(triples[i].subject.nominalValue);
        }
      }

//       console.log('Triples to add', triples);
//       console.log('Nodes to delete first', deleteNodes);

      // first delete all subjects we create
      var saveTriples = function(i) {
        if(i >= deleteNodes.length) {
          // then add all the triples
          self.doc.addTriples(triples, success, fail);
        }
        else {
          self.doc.deleteBySubject(deleteNodes[i], function() {
            saveTriples(i+1);
          }, fail);
        }
      };
      saveTriples(0);
    };
  }()
});
