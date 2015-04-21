if(!window.RDFE)
  window.RDFE = {};

/*
 * RDFE Utility functions
 */
RDFE.Utils = {};

RDFE.Utils.createTitle = function (str) {
  if (str) {
    // replace '_' with space first
    str = str.replace(/_/g, ' ');

    // strip leading spaces
    var out = str.replace(/^\s*/, "");
    out = out.replace(/^[a-z]|[^\sA-Z][A-Z]/g, function(str, offset) {
      if (offset == 0) {
        return(str.toUpperCase());
      } else {
        return(str.substr(0,1) + " " + str.substr(1).toUpperCase());
      }
    });
    return(out);
  }
  return str;
}

RDFE.Utils.escapeXml = function (str) {
  return str.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

RDFE.Utils.namingSchemaLabel = function (input, namingSchema, plural, lowercase) {
  var ndx = (plural === true) ? 1 : 0;
  var value = namingSchema[input][ndx]
  return (lowercase === true) ? value.toLowerCase : value;
}

RDFE.Utils.uriParams = function() {
  var result = {};
  var s = location.search;
  if (s.length > 1) {
    s = s.substring(1);
  }
  if (s) {
    var parts = s.split("&");
    for (var i=0; i < parts.length; i++) {
      var part = parts[i];
      if (part) {
        var index = part.indexOf("=");
        if (index == -1) {
          /* not a pair */
          result[decodeURIComponent(part)] = "";
        } else {
          var key = part.substring(0,index);
          var val = part.substring(index+1);
          key = decodeURIComponent(key);
          val = decodeURIComponent(val.replace(/\+/g,  " "));

          var r = false;
          if ((r = key.match(/(.*)\[\]$/))) {
            key = r[1];
            if (key in result) {
              result[key].push(val);
            } else {
              result[key] = [val];
            }
          } else {
            result[key] = val;
          }
        }
      }
    }
  }
  return result;
}

/**
 * Extract a name from a URI. The name is the last part of the URI which is
 * either the fragment or the last path section.
 */
RDFE.Utils.uri2name = function(u) {
  if(u) {
    var m = u.lastIndexOf('#');
    if(m < 0) {
      m = u.lastIndexOf('/');
    }
    if (m >= 0) {
      return u.substring(m+1, u.length);
    }
  }
  return u;
}

RDFE.Utils.getLabel = function(labels, key) {
  if (!labels || !labels[key]) {
    return key;
  }

  return labels[key];
}

RDFE.Utils.getUrlBase = function(url) {
  var parser = document.createElement('a');
  parser.href = url;
  return parser.protocol + '//' + parser.host;
};

RDFE.Utils.splitUrl = function(url) {
  var parser = document.createElement('a');
  parser.href = url;
  return {
    protocol: parser.protocol,
    host: parser.host,
    hostname: parser.hostname,
    path: parser.pathname,
    port: parser.port,
    search: parser.search
  };
};

/**
 * Find RDF documents at the given locations.
 *
 * A list of @p uris with optional sparqlEndpoint values is checked for LDP containers, WebDAV folders, general
 * Turtle documents.
 *
 * The @p success callback function has one parameter: a list of objects
 * containing a @p uri, a @p ioType, and an optional @p sparqlEndpoint.
 */
RDFE.Utils.resolveStorageLocations = function(uris, success) {
  //
  // check all uris to see what we get
  //
  var files = [];
  function findFiles(i) {
    if(i >= uris.length) {
      success(files);
      return;
    }

    var uri = uris[i].uri,
        sparqlEndpoint = uris[i].sparqlEndpoint;

    // we do not specifically check if the sparql endpoint works.
    if(sparqlEndpoint) {
      var sf = new RDFE.IO.Folder(sparqlEndpoint);
      sf.ioType = "sparql";
      sf.sparqlEndpoint = sparqlEndpoint;
      var gr = new RDFE.IO.File(uri);
      gr.parent = sf;
      gr.ioType = 'sparql';
      gr.sparqlEndpoint = sparqlEndpoint;
      sf.children.push(gr);
      files.push(sf);

      findFiles(i+1);
      return;
    }

    // check if we have an LDP container
    RDFE.IO.openUrl(uri, {
      checkForFiles: true
    }, function(dir) {
      // success, we found a container
      files.push(dir);
      findFiles(i+1);
    }, function(errMsg, status) {
      // not a folder, just add it as a simple url to fetch
      // but remember any error status we got
      var f = new RDFE.IO.File(uri);
      f.errorMessage = errMsg;
      f.httpStatus = status;
      files.push(f);
      findFiles(i+1);
    });
  };
  findFiles(0);
};

RDFE.Utils.extractDomain = function(url) {
  var domain;

  //find & remove protocol (http, ftp, etc.) and get domain
  if (url.indexOf("://") > -1) {
    domain = url.split('/')[2];
  }
  else {
    domain = url.split('/')[0];
  }

  //find & remove port number
  domain = domain.split(':')[0];

  return domain;
}
