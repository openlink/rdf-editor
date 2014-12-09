var VAL = function(config) {
  this.config = jQuery.extend(
    {
      "host": "http://localhost:8899",
      "valApi": "/val/api",
      "loginLink": "/val/authenticate.vsp",
      "sidCookieName": "sid",
      "sidParamName": "sid"
    },
    config
  );
};

(function($) {

  VAL.prototype.checkSession = function() {
    this.sid = $.deparam(window.location.search.substring(1))[this.config.sidParamName];
    if(!this.sid)
      this.sid = $.cookie(this.config.sidCookieName);

    return this.sid;
  }

  VAL.prototype.get = function(path) {
    return $.get (this.config.host + path + "?" + this.config.sidParamName + "=" + encodeURIComponent(this.sid));
  }

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
    if(!this.sid) {
      if(!this.checkSession()) {
        cb(false, "No existing session found.");
        return;
      }
    }

    this.get(this.config.valApi + "/profile").done(function(data) {
      var s = new rdfstore.Store();
      s.registerDefaultProfileNamespaces();
      s.load('text/turtle', data, function(success, result) {
        if(success) {
          s.execute(
            "select ?uri ?name ?img ?nick where { [] foaf:topic ?uri . ?uri a foaf:Agent . optional { ?uri foaf:name ?name . } . optional { ?uri foaf:nick ?nick . } . optional { ?uri foaf:img ?img . } . }",
            function(success, result) {
              if (success && result.length > 0) {
                var p = {
                  "uri": result[0].uri.value
                };
                if(result[0].name)
                  p.name = result[0].name.value;
                if(result[0].img)
                  p.image = result[0].img.value;
                if(result[0].nick)
                  p.nick = result[0].nick.value;

                cb(true, p);
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
