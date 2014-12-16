if(!RDFE)
  RDFE = {};

RDFE.Document = function(params) {
  var self = this;

  self.store = rdfstore.create();
  self.graph = 'urn:graph:default';
};

RDFE.Document.prototype.load = function(url, io, success, fail) {
    var self = this;
    var successFct = function(data) {
        self.url = url;
        self.io = io;

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

        if(mySuccess)
          mySuccess();
      };
      // FIXME: add error handling
      myIo.insertFromStore(self.url, self.store, self.graph, {"success": __success});
    }
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
