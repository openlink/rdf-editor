if(!RDFE)
  RDFE = {};

RDFE.Document = function(params) {
  var self = this;

  self.store = rdfstore.create();
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
