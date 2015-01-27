if(!window.RDFE)
  window.RDFE = {};

RDFE.Document.Model = Backbone.Model.extend({
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
    var items = self.ontologyManager.individualsByClassURI(range);
    $.merge(items, RDFE.individuals(this.doc, range));
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

  isAggregateProperty: function(p) {
    for(var i = 0; i < this.types.length; i++) {
      if(this.types[i].isAggregateProperty(p))
        return true;
    }
    return false;
  },

  addSchemaEntryForProperty: function(p) {
    var self = this;
    var property = (p.URI ? p : (self.ontologyManager.ontologyProperties[p] || { URI: p }));

    var label = RDFE.Utils.createTitle(property.label || property.title || property.URI.split(/[/#]/).pop())
    var item = {
      titleHTML: '<span title="{0}">{1}</span>'.format(RDFE.Utils.escapeXml(property.URI), label),
      title: label,
      maxCardinality: self.maxCardinalityForProperty(property.URI),
      editorAttrs: {
        "title": RDFE.coalesce(property.comment, property.description)
      }
    };

    if(self.isAggregateProperty(property.URI)) {
      item.type = "NestedModel";
      item.model = RDFE.Document.Model;
      item.editorAttrs.style = "height:auto;"; //FIXME: use editorClass instead
    }
    else {
      item.type = "List";
      item.itemType = "Rdfnode";
      item.rdfnode = {};

      // TODO: eventually we should support range inheritence
      if (property.class == self.ontologyManager.uriDenormalize('owl:DatatypeProperty')) {
        item.rdfnode.type = property.range;
      }
      else if (property.class == self.ontologyManager.uriDenormalize('owl:ObjectProperty')) {
        item.rdfnode.type = "http://www.w3.org/1999/02/22-rdf-syntax-ns#Resource";
        item.rdfnode.choices = function(callback) { self.getIndividuals(property.range, callback); };
        item.rdfnode.create = true; //FIXME: make this configurable
      }
      else if (property.range) {
        if (property.range == "http://www.w3.org/2000/01/rdf-schema#Literal" ||
            property.range.startsWith('http://www.w3.org/2001/XMLSchema#')) {
          item.rdfnode.type = property.range;
        }
        else {
          item.rdfnode.type = "http://www.w3.org/1999/02/22-rdf-syntax-ns#Resource";
          item.rdfnode.choices = function(callback) { self.getIndividuals(property.range, callback); };
          item.rdfnode.create = true; //FIXME: make this configurable
        }
      }
    }

    self.schema[property.URI] = item;
  },

  /// read the properties of this.uri from the store and put them into the model
  docToModel: function(ontologyManager, success, fail) {
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
        //
        // Get the list of properties (fresnel lens vs. existing properties)
        //
        self.types = [];
        self.fields = [];
        var lens = null;
        for (var i = 0, l = r.length; i < l; i++) {
          if (r[i].p.value == self.ontologyManager.uriDenormalize('rdf:type')) {
            if(!lens) {
              lens = ontologyManager.findFresnelLens(r[i].o.value);
              if(lens && lens.showProperties.length == 0) {
                console.log('Empty fresnel lens. Ignoring...');
                lens = null;
              }
            }
            // TODO: optionally load the ontologies for this.types. Ideally through a function in the ontology manager, something like getClass()
            //       however, to avoid async code here, it might be better to load the ontologies once the document has been loaded.
            var oc = ontologyManager.ontologyClassByURI(r[i].o.value);
            if(oc) {
              self.types.push(oc);
            }
          }
        }
        if(lens) {
          self.fields = lens.showProperties;
        }

        if(!lens) {
          for (var i = 0, l = r.length; i < l; i++) {
            var p = r[i].p.value;
            if(!_.contains(self.fields, p))
              self.fields.push(p);
          }
        }
        else {
          // replace fresnel:allProperties with the missing properties, rather than appending them
          var j = self.fields.indexOf(self.ontologyManager.uriDenormalize('fresnel:allProperties'));
          if(j >= 0) {
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
            var subm = new RDFE.Document.Model();
            subm.setEntity (self.doc, v.o.value);
            subm.docToModel(ontologyManager, function() {
              self.fields.push(v.p.value);
              self.set(v.p.value, subm);
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
          if(val[j].toStoreNode) {
            var node = val[j].toStoreNode(self.doc.store);
            if(node.nominalValue.length > 0) {
              triples.push(self.doc.store.rdf.createTriple(
                self.doc.store.rdf.createNamedNode(self.uri),
                self.doc.store.rdf.createNamedNode(prop),
                node));
            }
          }
          else {
            console.log('Need to save sub-model', val[j])
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
