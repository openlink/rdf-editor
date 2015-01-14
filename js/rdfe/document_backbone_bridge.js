if (!RDFE)
  RDFE = {};

RDFE.Document.Model = Backbone.Model.extend({
  setEntity: function(doc, uri) {
    this.doc = doc;
    this.uri = uri;
  },

  addTriple: function(triple) {
    var d = this.get(triple.p.value) || [];
    d.push(triple.o);
    this.set(triple.p.value, d);
  },

  /// read the properties of this.uri from the store and put them into the model
  docToModel: function(success, fail) {
    var self = this;
    self.schema = {};
    self.fields = [];

    this.doc.store.execute('select ?p ?o from <' + self.doc.graph + '> where { <' + self.uri + '> ?p ?o } order by ?p', function(s, r) {
      if (!s) {
        if (fail)
          fail();
      } else {
        var uriClass;
        var l = r.length;
        var simpleSchema = function(self, r) {
          for (var i = 0; i < l; i++) {
            if (self.schema[r[i].p.value])
              continue;

            self.schema[r[i].p.value] = {
              type: "List", //FIXME: convert the code from Aziz into a function which can be reused here, ideally we should use the property's range
              title: r[i].p.value.split(/[/#]/).pop(),
              itemType: "Rdfnode"
            };
            self.fields.push(r[i].p.value);
          }
        }

        // search for entity class
        for (var i = 0; i < l; i++) {
          if (!uriClass && (r[i].p.value == RDFE.uriDenormalize('rdf:type')))
            uriClass = r[i].o.value
          self.addTriple(r[i]);
        }

        if (uriClass) {
          var template = new RDFE.Template(ontologyManager, uriClass, null, function(template) {
            var data = template.toBackboneForm(self);
            if (data && data.schema) {
              self.schema = data.schema;
              self.fields = data.fields;
            }
            // add fields related to entity but not in the template ???
            simpleSchema(self, r);

            if (success)
              success();
          });
        } else {
          simpleSchema(self, r);
          if (success)
            success();
        }
      }
    });
  },

  /// save the data in the model back to the store
  modelToDoc: function(success, fail) {
    var self = this;

    // first delete then copy the data back to the store
    self.doc.deleteEntity(this.uri, function() {
      var triples = [];
      for (var i = 0; i < self.fields.length; i++) {
        prop = self.fields[i];
        if (!self.attributes[prop])
          continue;

        var val = self.get(prop);
        if (!val)
          continue;


        if (val.constructor !== Array)
          val = [val];

        for (var j = 0; j < val.length; j++) {
          var node = val[j].toStoreNode(self.doc.store);
          if(node.nominalValue.length > 0)
            triples.push(self.doc.store.rdf.createTriple(
              self.doc.store.rdf.createNamedNode(self.uri),
              self.doc.store.rdf.createNamedNode(prop),
              node));
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
