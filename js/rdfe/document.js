if(!window.RDFE)
  window.RDFE = {};

RDFE.Document = function(config) {
  var self = this;

  self.config = config;
  self.store = rdfstore.create();
  self.store.registerDefaultNamespace('skos', 'http://www.w3.org/2004/02/skos/core#');
  self.graph = 'urn:graph:default';
  self.dirty = false;
};

RDFE.Document.prototype.setChanged = function(d) {
  if(d === undefined)
    d = true;
  this.dirty = d;
  if(d)
    $(this).trigger('changed', this);
};

RDFE.Document.prototype.load = function(url, io, success, fail) {
    var self = this;
    var successFct = function(data) {
        self.url = url;
        self.io = io;
        self.setChanged(false);

        if (success)
            success();
    };
    io.retrieveToStore(url, self.store, self.graph, {'success': successFct });
};

RDFE.Document.prototype.save = function(url, io, success, fail) {
    var self = this;
    var myUrl = url,
        myIo = io,
        mySuccess = success,
        myFail = fail;

     // url is optional
     if(typeof(url) != 'string') {
       myUrl = self.url;
       myIo = url;
       mySuccess = io;
       myFail = success;
     }

    // io is optional
    if(typeof(myIo) == 'function' || !myIo) {
        myFail = mySuccess
        mySuccess = myIo;
        myIo = self.io;
    }

    if(!myUrl) {
      if (myFail)
        myFail("No document loaded");
    }
    else {
      var __success = function() {
        self.url = myUrl;
        self.setChanged(false);

        if(mySuccess)
          mySuccess();
      };
      // FIXME: add error handling
      myIo.insertFromStore(myUrl, self.store, self.graph, {"success": __success});
    }
};

RDFE.Document.prototype.new = function(success, fail) {
  var self = this;
  self.url = null;
  self.io = null;
  self.store.clear(self.graph, function(s) {
    if(s && success)
      success();
    else if(!s && fail)
      fail();
  });
};

RDFE.Document.prototype.deleteEntity = function(uri, success, fail) {
  var self = this;

  if(!uri) {
    if(fail)
      fail('Need Entity URI for deletion.');
    return;
  }

  self.store.execute('with <' + self.graph + '> delete { <' + uri + '> ?p ?o } where { <' + uri + '> ?p ?o }', function(s, r) {
    if(s) {
      self.setChanged();
      self.store.execute('with <' + self.graph + '> delete { ?s ?p <' + uri + '> } where { ?s ?p <' + uri + '> }', function(s, r) {
        if (s) {
          if (success)
            success();
        }
        else if(fail) {
          fail(r);
        }
      });
    }
    else if (fail) {
      fail(r);
    }
  });
};

RDFE.Document.prototype.addTriple = function(triple, success, fail) {
  var self = this;
  self.store.insert(self.store.rdf.createGraph([triple]), self.graph, function(s) {
    if(s) {
      self.setChanged();
      if(success)
        success();
    }
    else if (fail) {
      fail();
    }
  });
};

RDFE.Document.prototype.deleteTriple = function(triple, success, fail) {
  var self = this;
  self.store.delete(self.store.rdf.createGraph([triple]), self.graph, function(s) {
    if(s) {
      self.setChanged();
      if(success)
        success();
    }
    else if (fail) {
      fail();
    }
  });
};

RDFE.Document.prototype.updateTriple = function(oldTr, newTr, success, fail) {
  var self = this;
  self.store.delete(self.store.rdf.createGraph([oldTr]), self.graph, function(s) {
    if (s) {
      triple[field] = newNode;

      self.store.insert(self.store.rdf.createGraph([newTr]), self.graph, function(s) {
        self.setChanged();
        if (s && fail)
          fail();
        else if(success)
          success();
      });
    }
    else if(fail)
      fail();
  });
};

/**
 * Get the label for the given resource using the configured label properties.
 * if no label can be found the last section of the url is used instead.
 */
RDFE.Document.prototype.getEntityLabel = function(url, success) {
  var self = this;
  var getLabel = function(lps, i) {
    // fall back to the last section of the uri
    if(i >= lps.length)
      success(url.split(/[/#]/).pop());
    else
      self.store.execute('select ?l from <' + self.graph + '> where { <' + url + '> <' + lps[i] + '> ?l . }', function(s, r) {
        if(s && r.length > 0) {
          success(r[0].l.value);
        }
        else {
          getLabel(lps, i+1);
        }
      });
  };
  getLabel(self.config.options.labelProps, 0);
};

RDFE.Document.prototype.listProperties = function(callback) {
  var self = this;
  self.store.execute("select distinct ?p from <" + self.graph + "> where { ?s ?p ?o }", function(success, r) {
    var pl = [];

    if(success) {
      for(var i = 0; i < r.length; i += 1)
        pl.push(r[i].p.value);
    }

    callback(pl);
  });
};

/**
 * List all the entities in the document. A "label" property is added to each node
 * in the result passed to the @p callback function.
 * @param type optional type(s) the entities should have. Can be a list or a string.
 * @param callback a function which takes an array of rdfstore nodes as input.
 * @param errorCb Callback function in case an error occurs, takes err msg as input.
 */
RDFE.Document.prototype.listEntities = function(type, callback, errorCb) {
  var t = type,
      cb = callback,
      errCb = errorCb,
      self = this;

  if(typeof(t) == 'function') {
    cb = type;
    errCb = callback;
    t = null;
  }
  else if(typeof(t) == 'string')
    t = [t];

  var q = "select distinct ?s ";
  for(var i = 0; i < self.config.options.labelProps.length; i++) {
    q += "?l" + i + " ";
  }
  q += " from <" + self.graph + "> where { ";
  if(t && t.length > 0) {
    q += "?s a ?t . filter(";
    for(var i = 0; i < t.length; i++) {
      if(i > 0) q += "||";
      q += "?t = <" + t[i] + ">";
    }
    q += ") . ";
  }
  else {
    q += "?s ?p ?o . ";
  }
  for(var i = 0; i < self.config.options.labelProps.length; i++) {
    q += "optional { ?s <" + self.config.options.labelProps[i] + "> ?l" + i + " . } . ";
  }
  q += '}';

  self.store.execute(q, function(success, r) {
    var sl = [];

    if(success) {
      for(var i = 0; i < r.length; i += 1) {
        var n = r[i].s;
        for(var j = 0; j < self.config.options.labelProps.length; j++) {
          if(r[i]["l" + j]) {
            n.label = r[i]["l" + j].value;
            break;
          }
        }
        if(!n.label)
          n.label = r[i].s.value.split(/[/#]/).pop();
        sl.push(n);
      }
    }
    else if(errorCb)
      errorCb(r);

    cb(sl);
  });
};
