var VAL = function(config) {
  this.config = jQuery.extend(
    {
      "host": window.location.protocol + '//' + window.location.host,
      "valApi": "/val/api",
      "loginLink": "/val/authenticate.vsp",
      "logoutLink": "/val/logout.vsp"
    },
    config
  );
};

(function($) {

  /**
   * Get the user profile. The only parameter is a callback function which
   * takes two parameters: a boolean indicating success and a second which
   * in the case of success contains the profile as an object (see below)
   * and in the case of an error contains the error message.
   *
   * The profile object contains at least the personal "uri" and optionally
   * the "nick" nickname, the "name" and an "image" url.
   */
  VAL.prototype.profile = function(cb) {
    $.get(this.config.host + this.config.valApi + "/profile").done(function(data) {
      var s = new rdfstore.Store();
      s.registerDefaultProfileNamespaces();
      s.load('text/turtle', data, function(success, result) {
        if(success) {
          s.execute(
            "select ?uri ?name ?img ?nick where { [] foaf:topic ?uri . ?uri a foaf:Agent . optional { ?uri foaf:name ?name . } . optional { ?uri foaf:nick ?nick . } . optional { ?uri foaf:img ?img . } . }",
            function(success, result) {
              console.log(result);
              if (success && result.length > 0) {
                var p = {
                  "uri": result[0].uri.value
                };
                if(result[0].name) {
                  p.name = result[0].name.value;
                }
                if(result[0].img) {
                  p.image = result[0].img.value;
                }
                if(result[0].nick) {
                  p.nick = result[0].nick.value;
                }

                s.execute('select ?storage where { <' + p.uri + '> <http://www.w3.org/ns/pim/space#storage> ?storage . }', function(success, result) {
                  if(success) {
                    for(var i = 0; i < result.length; i++) {
                      if(result[i].storage) {
                        (p.storage = p.storage || []).push({
                          uri: result[i].storage.value
                        });
                      }
                    }
                  }

                  s.execute('select ?namedGraph ?sparqlEndpoint where { <' + p.uri + '> <http://www.openlinksw.com/schemas/cert#hasDBStorage> ?namedGraph . ?namedGraph <http://rdfs.org/ns/void#sparqlEndpoint> ?sparqlEndpoint . }', function(success, result) {
                    if(success) {
                      for(var i = 0; i < result.length; i++) {
                        if(result[i].namedGraph && result[i].sparqlEndpoint) {
                          (p.storage = p.storage || []).push({
                            uri: result[i].namedGraph.value,
                            sparqlEndpoint: result[i].sparqlEndpoint.value
                          });
                        }
                      }
                    }

                    cb(true, p);
                  });
                });
              }
              else {
                cb(false, "Failed to query the user profile.");
              }
            }
          );
        }
        else {
          cb(false, "Failed to load the profile contents.");
        }
      });
    }).fail(function() {
      cb(false);
    });
  }

})(jQuery);
