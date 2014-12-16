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
    io.retrieveToStore(this.store, url, {'success': successFct });
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
        if(mySuccess)
          mySuccess();
      };
      // FIXME: add error handling
      myIo.insertFromStore(self.store, self.graph, {"success": __success});
    }
};
