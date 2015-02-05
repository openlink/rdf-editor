if(!window.RDFE)
  window.RDFE = {};

RDFE.EntityModel = Backbone.Model.extend({
  setEntity: function(doc, uri) {
    this.doc = doc;
    this.uri = uri;
  },

  addValue: function(p, val) {
    var d = this.get(p) || [];
    d.push(val);
    this.set(p, d);
  },

  getIndividuals: function(range, callback) {
    var items = [];

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
      var rc = this.doc.ontologyManager.ontologyClassByURI(range);
      if(rc) {
        items = rc.getIndividuals(true);
      }
    }
    // convert the object we get from the ontologyManager into a flat list with labels
    items = _.map(_.values(items), function(cl) {
      var n = new RDFE.RdfNode('uri', cl.URI);
      // FIXME: honor config.labelProps
      n.label = cl.label;
      return n;
    });

    // get individuals from the document
    this.doc.listEntities(range, function(el) {
      $.merge(items, el);
    });

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
    var label = RDFE.Utils.createTitle(restrictionLabel || property.label || property.title || property.URI.split(/[/#]/).pop())
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
            'http://www.w3.org/1999/02/22-rdf-syntax-ns#type': [ property.getRange() ]
          },
          initialize: function(options) {
            RDFE.EntityModel.prototype.initialize.call(this, options);
            this.doc = self.doc;
            this.buildSchemaFromTypes([range]);
          }
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
      var lens = self.doc.ontologyManager.findFresnelLens(cTypes[i].URI);
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
    self.ontologyManager = ontologyManager;

    this.doc.store.execute('select ?p ?o from <' + self.doc.graph + '> where { <' + self.uri + '> ?p ?o } order by ?p', function(s, r) {
      if (!s) {
        if (fail) {
          fail();
        }
      } else {
        self.types = [];
        self.fields = [];
        self.lens = null;
        var domainTypes = [];

        //
        // Get the types of the resource
        //
        for (var i = 0, l = r.length; i < l; i++) {
          if (r[i].p.value == self.doc.ontologyManager.uriDenormalize('rdf:type')) {
            // TODO: optionally load the ontologies for this.types. Ideally through a function in the ontology manager, something like getClass()
            //       however, to avoid async code here, it might be better to load the ontologies once the document has been loaded.
            var oc = self.doc.ontologyManager.ontologyClassByURI(r[i].o.value);
            if(oc) {
              self.types.push(oc);
            }
          }
          else {
            var p = self.doc.ontologyManager.ontologyPropertyByURI(r[i].p.value);
            if(p && p.domain) {
              domainTypes = _.union(domainTypes, p.domain);
            }
          }
        }

        //
        // poor-man's inference: if no type is specified, get the types via property domains
        //
        if(self.types.length === 0) {
          self.types = _.compact(domainTypes);
        }


        //
        // Get the list of properties (fresnel lens vs. existing properties)
        //
        for (var i = 0, l = self.types.length; i < l; i++) {
          var lens = self.doc.ontologyManager.findFresnelLens(self.types[i].URI);
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
          for (var i = 0, l = r.length; i < l; i++) {
            var p = r[i].p.value;
            if(!_.contains(self.fields, p)) {
              p === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' ? self.fields.unshift(p) : self.fields.push(p);
            }
          }
        }
        else {
          // replace fresnel:allProperties with the missing properties, rather than appending them
          var j = self.fields.indexOf(self.ontologyManager.uriDenormalize('fresnel:allProperties'));
          if(j >= 0) {
            // only chow the "Add Property" button if we have fresnel:allProperties in the lens or we have no lens
            self.allowAddProperty = true;

            var mp = [];
            for (var i = 0, l = r.length; i < l; i++) {
              var p = r[i].p.value;
              if(!_.contains(self.fields, p) && !_.contains(lens.hideProperties, p))
                mp.push(p);
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
        for (var i = 0, l = r.length; i < l; i++) {
          if(self.isAggregateProperty(r[i].p.value)) {
            var v = r[i];
            var subm = new RDFE.EntityModel();
            subm.setEntity (self.doc, v.o.value);
            subm.docToModel(function() {
              self.fields.push(v.p.value);
              self.addValue(v.p.value, subm);
            });
          }
          else {
            self.addValue(r[i].p.value, RDFE.RdfNode.fromStoreNode(r[i].o));
          }
        }

        if(success)
          success();
      }
    });
  },

  /// save the data in the model back to the store
  modelToDoc: function(success, fail) {
    var self = this;

    // first delete then copy the data back to the store
    self.doc.deleteTriples(self.doc.store.rdf.createNamedNode(this.uri), null, null, function() {
      var triples = [];
      for (prop in self.attributes) {
        var val = self.get(prop);
        if (!val) {
          continue;
        }

        if (val.constructor !== Array) {
          val = [val];
        }

        for (var j = 0; j < val.length; j++) {
          var node;
          if(val[j].values) {
            console.log('Need to save sub-model', val[j])
            var subVal = val[j];
            if(!subVal.uri) {
              // find a label
              var name = null;
              for(var i = 0, l = self.doc.config.options.labelProps.length; i < l; i++) {
                if(subVal.values[self.doc.config.options.labelProps[i]]) {
                  name = subVal.values[self.doc.config.options.labelProps[i]];
                  break;
                }
              }
              subVal.uri = self.doc.buildEntityUri(name);
            }
            node = self.doc.store.rdf.createNamedNode(subVal.uri);

            // add the sub-model triples. FIXME: use recursion to support more nesting depth, and protect against loops!
            self.doc.deleteTriples(node, null, null);
            var haveSubT = false;
            for(subP in subVal.values) {
              var sv = subVal.values[subP];
              for(var k = 0; k < sv.length; k++) {
                var svv = sv[k].toStoreNode(self.doc.store);
                if(svv && svv.nominalValue.length > 0) {
                  haveSubT = true;
                  triples.push(self.doc.store.rdf.createTriple(
                    node,
                    self.doc.store.rdf.createNamedNode(subP),
                    svv));
                }
              }
            }
            if(!haveSubT) {
              node = null;
            }
          }
          else {
            node = val[j].toStoreNode(self.doc.store);
          }

          // add the main triple
          if(node && node.nominalValue.length > 0) {
            triples.push(self.doc.store.rdf.createTriple(
              self.doc.store.rdf.createNamedNode(self.uri),
              self.doc.store.rdf.createNamedNode(prop),
              node));
          }
          else {
            console.log('Empty value in', node)
          }
        }
      }

      self.doc.store.insert(triples, self.doc.graph, function(s, r) {
        if (s && success)
          success();

        else if (!s && fail)
          fail(r);
      });
    }, fail);
  }
});
