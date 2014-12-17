if(!RDFE)
  RDFE = {};

RDFE.Document.Model = Backbone.Model.extend({
  setEntity: function(doc, uri) {
    this.doc = doc;
    this.uri = uri;
  },

  addTriple: function(triple) {
    var d = this.get(triple.p.value);
    if(!d)
      d = [];
    d.push(triple.o.value); // FIXME: eventually we will want to include the type and language for decent editors
    this.set(triple.p.value, d);
  },

  /// read the properties of this.uri from the store and put them into the model
  docToModel: function(success, fail) {
    var self = this;
    self.schema = {};

    this.doc.store.execute('select ?p ?o from <' + self.doc.graph + '> where { <' + self.uri + '> ?p ?o } order by ?p', function(s, r) {
      if(!s) {
        if(fail)
          fail();
      }
      else {
        for(var i = 0; i < r.length; i+=1) {
          self.schema[r[i].p.value] = {
            type: "Text", //FIXME: convert the code from Aziz into a function which can be reused here, ideally we should use the property's range
            title: r[i].p.value.split(/[/#]/).pop(),
            itemType: "Text",
            "node-token": r[i].o.token, // FIXME: eventually these need to come from the ontology instead
            "node-type": r[i].o.type
          };

          self.addTriple(r[i]);
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
    self.doc.deleteEntity(this.uri, function() {
      var triples = [];
      for(var prop in self.attributes) {
        var val = self.get(prop);
        var token = self.schema[prop]["node-token"];

        if(val.constructor !== Array) {
          if(token == 'uri')
            val = val.split(',');
          else
            val = [ val ];
        }

        for(var i = 0; i < val.length; i += 1) {
          triples.push(self.doc.store.rdf.createTriple(
            self.doc.store.rdf.createNamedNode(self.uri),
            self.doc.store.rdf.createNamedNode(prop),
            self.doc.store.termToNode({ value: val[i], "token": token, type: self.schema[prop]["node-type"] }) // FIXME: eventually we get the token and type and lang from the editor
          ));
        }

        self.doc.store.insert(triples, self.doc.graph, function(s, r) {
          if(s && success)
            success();
          if(!s && fail)
            fail(r);
        });
      }
      //success();
    }, fail);
  }
});
