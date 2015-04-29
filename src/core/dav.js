(function($) {
if(!window.RDFE)
  window.RDFE = {};

if(!RDFE.IO) {
  RDFE.IO = {};
}

/**
 * The base class for any type of resource (file or folder)
 */
RDFE.IO.Resource = (function() {
  // constructor
  var c = function(url) {
    this.url = url || "";
    if(url) {
      this.path = decodeURIComponent(RDFE.Utils.splitUrl(url).path);
      this.host = RDFE.Utils.splitUrl(url).host;
      this.name = this.path.match(/([^\/]+)\/?$/);
      if(this.name && this.name.length > 1) {
        this.name = this.name[1];
      }
      else {
        this.name = this.url;
      }
    }
    this.options = {};
  };

  // class-inheritance utitity function
  c.inherit = function(cls) {
    // We use an intermediary empty constructor to create an
    // inheritance chain, because using the super class' constructor
    // might have side effects.
    var construct = function () {};
    construct.prototype = this.prototype;
    cls.prototype = new construct;
    cls.prototype.constructor = cls;
    cls.super = this;
    cls.inherit = this.inherit;
    return cls;
  };

  c.prototype.isFolder = function() {
    return this.type === "folder";
  };

  c.prototype.isFile = function() {
    return this.type === "file";
  };

  /**
   * Recursively search for an option value for the given @p key.
   * If the Resource itself does not have the option, its parent
   * it checked instead.
   */
  c.prototype.getOption = function(key) {
    if(this.options[key]) {
      return this.options[key];
    }
    else if(this.parent) {
      return this.parent.getOption(key);
    }
    else {
      return undefined;
    }
  };

  /**
   * Add standard request headers to be used with every HTTP request.
   * For now this method only creates an @p Authorization header if
   * appropriate, i.e. if @p username and @p password options are available.
   *
   * @return The possible enriched value of @p headers.
   */
  c.prototype.standardAjaxHeaders = function(headers) {
    var uid = this.getOption('username');
    headers = headers || {};
    if(uid) {
      headers["Authorization"] = "Basic " + btoa(uid + ":" + this.getOption('password'));
    }
    return headers;
  };

  return c;
})();

/**
 * A simple class representing a file.
 */
RDFE.IO.File = (function() {
  var c = RDFE.IO.Resource.inherit(function(url, options) {
    var self = this;

    // call super-constructor
    self.constructor.super.call(this, url);

    self.type = "file";
    self.dirty = true;

    var defaults = {
    }

    self.options = $.extend({}, defaults, options);
  });

  return c;
})();

/**
 * The base class for any type of folder.
 * @param url The URL of the folder
 * @param options An optional object of options:
 * - @p username Auth information
 * - @p password Auth information
 */
RDFE.IO.Folder = (function() {
  var c = RDFE.IO.Resource.inherit(function(url, options) {
    var self = this;

    // call super-constructor (directly since we have 2 inheritance levels)
    RDFE.IO.Resource.call(this, url);

    self.type = "folder";
    self.dirty = true;

    // add trailing slash if necessary
    if (self.url.length > 0 && self.url.substring(self.url.length-1) != "/") {
      self.url += "/";
    }

    // set the default root url which is the url browsing started at
    self.rootUrl = self.url;

    self.children = [];

    var defaults = {
    }

    self.options = $.extend({}, defaults, options);
  });

  /**
   * Update the folder contents.
   *
   * @param force If @p true then the contents will always be updated, otherwise only if the folder is @p dirty. (optional)
   * @param success An optional callback function which gets the folder itself as a parameter.
   * @param fail An optional callback function which gets the folder itself, an error message, and an http result code as parameters.
   */
  c.prototype.update = function(force, success, fail) {
    var _force = force,
        _success = success,
        _fail = fail;
    if(typeof(_force) === 'function') {
      _fail = _success;
      _success = _force;
      _force = false;
    }
    if(_force || this.dirty) {
      var self = this;
      this.listDir(function() {
        // update the root dir of all children
        $(self.children).each(function() {
          this.rootUrl = self.rootUrl;
          this.parent = self;
        });

        self.dirty = false;

        if(_success) {
          _success(self);
        }
      }, function(err, status) {
        // get auth information from the user if possible
        if((status === 401 || status === 403) &&
            self.options.authFunction) {
          self.options.authFunction(self.url, function(r) {
            self.options.username = r.username;
            self.options.password = r.password;
            self.update(_force, _success, _fail);
          }, function() {
            if(_fail) {
              _fail(self, err, status);
            }
          });
        }
        else if(_fail) {
          _fail(self, err, status);
        }
      });
    }
    else {
      _success(this);
    }
  };

  /**
   * Sub-classes implement this function to update the children property.
   */
  c.prototype.listDir = function(success) {
    success();
  };

  var childrenDefaults = {
    sort: "name",
    foldersFirst: true,
    sortOrder: "asc"
  };

  /**
   * List all the children in the folder.
   * @param options An optional set of parameters:
   * - @p sort Which criteria to sort by. Supported are all possible properties of the resources. Default is sorting by @p name.
   * - @p sortOrder @p desc or @p acs. Defaults to @p asc
   * - @p foldersFirst This is @p true by default
   * - @p type Can be @p folder or @p file to return only one of those types
   */
  c.prototype.getChildren = function(options) {
    var o = $.extend({}, childrenDefaults, options),
        files = [],
        folders = [];

    for(var i = 0; i < this.children.length; i++) {
      if((o.type !== 'folder' && this.children[i].type === "file") || (o.type !== 'file' && !o.foldersFirst)) {
        files.push(this.children[i]);
      }
      else if (o.type !== 'file') {
        folders.push(this.children[i]);
      }
    }

    var desc = (o.sortOrder.toLowerCase() === 'desc');
    var sorter = function(a, b) {
      if(desc) {
        return a[o.sort] > b[o.sort];
      }
      else {
         return a[o.sort] < b[o.sort];
      }
    };

    if(o.sort) {
      files.sort(sorter);
      folders.sort(sorter);
    }

    return $.merge(folders, files);
  }

  return c;
})();


RDFE.IO.WebDavFolder = (function() {
  var c = RDFE.IO.Folder.inherit(function(url, options) {
    var self = this;

    // call super-constructor
    self.constructor.super.call(this, url);

    var defaults = {
    }

    self.ioType = 'webdav';
    self.options = $.extend({}, defaults, options);
  });

  function parseDavFolder(folder, data) {
    var urlBase = RDFE.Utils.getUrlBase(folder),
        ress = [],
        haveSelf = false;

    $(data).find('response').each(function() {
      var res = null,
          $this = $(this);
      var url = urlBase + $this.find('href').text();

      // ignore the details of the listed url itself
      if(url != folder) {
        // the first propstat contains http/200
        var $prop = $($(this).find('propstat').find('prop')[0]);

        if($prop.find('collection').length > 0) {
          res = new RDFE.IO.WebDavFolder(url);
        }
        else {
          res = new RDFE.IO.File(url);
          res.size = parseInt($prop.find('getcontentlength').text());
          res.dirty = false; // we already got all the properties below
          res.ioType = "dav";
        }

        var tmp = $prop.find('creationdate');
        if (tmp.length) { res.creationDate = new Date(tmp.text()); }
        tmp = $prop.find("getlastmodified");
        if (tmp.length) { res.modificationDate = new Date(tmp.text()); }

        /* perms, uid, gid */
        tmp = $prop.find("virtpermissions");
        if (tmp.length) { res.permissions = tmp.text(); }
        tmp = $prop.find("virtowneruid");
        if (tmp.length) { res.uid = tmp.text(); }
        tmp = $prop.find("virtownergid");
        if (tmp.length) { res.gid = tmp.text(); }

        /* type & length */
        tmp = $prop.find("getcontenttype");
        if (tmp.length) { res.contentType = tmp.text(); }
        tmp = $prop.find("getcontentlength");
        if (tmp.length) { res.size = parseInt(tmp.text()); }

        ress.push(res);
      }
      else {
        haveSelf = true;
      }
    });

    // no children and no self reference means - not a folder
    if(ress.length === 0 && !haveSelf) {
      return null;
    }

    return ress;
  }

  c.prototype.listDir = function(success, fail) {
    var self = this,
        body = '<?xml version="1.0" encoding="utf-8" ?>' +
      '<propfind xmlns="DAV:"><prop>' +
      '<creationdate/><getlastmodified/><href/>' +
      '<resourcetype/><getcontentlength/><getcontenttype/>' +
      '<virtpermissions xmlns="http://www.openlinksw.com/virtuoso/webdav/1.0/"/>' +
      '<virtowneruid xmlns="http://www.openlinksw.com/virtuoso/webdav/1.0/"/>' +
      '<virtownergid xmlns="http://www.openlinksw.com/virtuoso/webdav/1.0/"/>' +
      '</prop></propfind>';

    var ref = function(data) {
      self.children = parseDavFolder(self.url, data);
      if (!self.children) {
        fail('Failed to parse WebDAV result for "' + self.url + '".', 200);
      }
      else {
        success();
      }
    }

    $.ajax({
      url: this.url,
      method: "PROPFIND",
      contentType: "text/xml",
      data: body,
      dataType: "xml",
      headers: this.standardAjaxHeaders()
    }).done(ref).fail(function(xhr) {
      fail(RDFE.IO.ajaxFailMessage(xhr, 'Failed to list WebDAV folder for "{0}"', self.url), xhr.status);
    });
  }

  return c;
}());

RDFE.IO.LDPFolder = (function() {
  var c = RDFE.IO.Folder.inherit(function(url, options) {
    var self = this;

    // call super-constructor
    self.constructor.super.call(this, url);

    var defaults = {
    }

    self.ioType = 'ldp';
    self.options = $.extend({}, defaults, options);
  });

  function findLdpFiles(store, baseUrl, success, fail) {

    store.registerDefaultNamespace('rdfs', 'http://www.w3.org/2000/01/rdf-schema#');
    store.registerDefaultNamespace('posix', 'http://www.w3.org/ns/posix/stat#');

    var files = [];

    // query files
    store.execute('select distinct ?s ?size ?mtime from <urn:default> where { ?s a ?t . FILTER(?t in (posix:File, rdfs:Resource)) . optional { ?s posix:size ?size . } . optional { ?s posix:mtime ?mtime . } }', function(s,r) {
      if(!s) {
        fail('Failed to query LDP the container at ' + baseUrl + '.');
      }
      else {
        for(var i = 0; i < r.length; i++) {
          var uri = r[i].s.value;
          if(!uri.startsWith('http')) {
            uri = baseUrl + uri;
          }

          var file = new RDFE.IO.File(uri);
          if(r[i].mtime) {
            file.modificationDate = new Date(r[i].mtime.value*1000);
          }
          if(r[i].size) {
            file.size = r[i].size.value;
          }
          file.dirty = false;
          file.ioType = "ldp";

          files.push(file);
        }

        // query folders
        store.execute('select distinct ?s ?size ?mtime from <urn:default> where { ?s a posix:Directory . optional { ?s posix:mtime ?mtime } }', function(s,r) {
          if(!s) {
            fail('Failed to query LDP the container at ' + baseUrl + '.');
          }
          else {
            for(var i = 0; i < r.length; i++) {
              var uri = r[i].s.value;
              if(!uri.startsWith('http')) {
                uri = baseUrl + uri;
              }

              if(uri != baseUrl) {
                var dir = new RDFE.IO.LDPFolder(uri);
                if(r[i].mtime) {
                  dir.modificationDate = new Date(r[i].mtime.value*1000);
                }
                files.push(dir);
              }
            }

            success(files);
          }
        });
      }
    });
  };

  c.prototype.listDir = function(success, fail) {
    var self = this;

    $.ajax({
      url: self.url,
      headers: self.standardAjaxHeaders({
        Accept: "text/turtle"
      })
    }).done(function(data, textStatus, jqXHR) {
      // check if we have a BasicContainer which is what we currently support
      var haveBasicContainer = false;
      var lnk = jqXHR.getResponseHeader('Link');
      if (lnk) {
        var lh = lnk.split(',');
        for(var i = 0; i < lh.length; i++) {
          if(lh[i].replace(/ /g, '').toLowerCase().indexOf('rel="type"') >= 0 &&
            lh[i].indexOf('http://www.w3.org/ns/ldp#BasicContainer') >= 0) {
            haveBasicContainer = true;
            break;
          }
        }
      }

      if(!haveBasicContainer) {
        fail('Only LDP Basic containers are supported at the moment.');
      }
      else if(jqXHR.getResponseHeader('Content-Type').indexOf('turtle') < 0) {
        fail('The LDP container at ' + self.url + ' does not return Turtle content.');
      }
      else {
        // look for LDP resources
        var store = rdfstore.create();
        store.load('text/turtle', data, 'urn:default', function() {
          findLdpFiles(store, self.url, function(newFiles) {
            self.children = newFiles;
            if(success) {
              success();
            }
          }, fail);
        });
      }
    }).fail(function(jqXHR) {
      if(fail) {
        fail(RDFE.IO.ajaxFailMessage(jqXHR, 'Failed to fetch Turtle content from "{0}"', self.url), jqXHR.status);
      }
    });
  };

  return c;
})();

/**
 * Open a DAV or LDP folder at the given location.
 * @param url the Url to open
 * @param optional object with options like @p authFunction - a function with three param: @p url, @p success callback (one objet param with @p username and @p password) and @p error callback.
 * @param success Callback with the Folder instance on success. If @p options contains @p checkForFiles with value @p true
 *        then the result can also be a file.
 * @param fail optional callback in the case of an error with an error message and an HTTP status code.
 */
RDFE.IO.openUrl = function(url, options, success, fail) {
  var _success = success,
      _fail = fail,
      _options = options;
  if(typeof(options) === 'function') {
    _fail = _success;
    _success = _options;
    _options = undefined;
  }

  var ldp = new RDFE.IO.LDPFolder(url, _options);
  ldp.update(function() {
    // success, we found an ldp container
    _success(ldp);
  }, function(folder, errMsg, status) {
    // there is no need to continue if we get access denied. The only thing this will
    // do is show the auth dlg twice.
    if(status === 401 || status === 403) {
      _fail(errMsg, status);
    }
    else {
      // not an ldp container, try webdav, reusing the auth info we might have gotten for ldp
      var dav = new RDFE.IO.WebDavFolder(url, ldp.options);
      dav.update(function() {
        // success, we have a webdav folder
        _success(dav);
      }, function(folder, errMsg, status) {
        // not a known folder
        if(_options && _options.checkForFiles) {
          $.ajax({
            url: url,
            headers: folder.standardAjaxHeaders() // use the headers from the folder for the basic auth info
          }).done(function(data, textStatus, jqXHR) {
            // create a new file and reuse the options for auth information
            var f = new RDFE.IO.File(url, folder.options);
            f.content = data;
            f.contentType = jqXHR.getResponseHeader('Content-Type');
            f.size = parseInt(jqXHR.getResponseHeader('Content-Length'));
            f.dirty = false; // there is nothing more to get
            f.ioType = "http";

            _success(f);
          }).fail(function(jqXHR) {
            // nothing
            if(_fail) {
              _fail(RDFE.IO.ajaxFailMessage(jqXHR, 'Failed to get "{0}"', url), jqXHR.status);
            }
          });
        }
        else if(_fail) {
          _fail(errMsg, status);
        }
      });
    }
  });
};

RDFE.IO.ajaxFailMessage = function(jqXHR, message, url) {
  if ((jqXHR.statusText = 'error') && (RDFE.Utils.extractDomain(url) !== window.location.hostname)) {
    return message.format(url) + ' - this could be related to missing CORS settings on the server.';
  }
  return message.format(url) + '.';
};

})(jQuery);
