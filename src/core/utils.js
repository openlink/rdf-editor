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
  var m = u.lastIndexOf('#');
  if(m < 0) {
    m = u.lastIndexOf('/');
  }
  if (m >= 0) {
    return u.substring(m+1, u.length);
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
  var fileNameExtRx = /(?:\.([^.]+))?$/;

  function isRdfFile(uri) {
    var ext = uri.match(fileNameExtRx)[0];
    return (ext == '.ttl' || ext == '.rdf' || ext == '.owl');
  };

  /**
    * Check if the given url refers to a DAV folder and if so, try
    * to list the files in that folder.
    */
  function checkDAVFolder(url, cb) {
    $.ajax({
      "url": url,
      "type": 'PROPFIND'
    }).done(function (data) {
      // find rdf files in the folder
      var files = [];

      $(data).find('href').each(function() {
        var fn = $(this).text(),
            urlBase = RDFE.Utils.getUrlBase(url);

        if(isRdfFile(fn)) {
          files.push({ "uri": urlBase + fn, "ioType": "webdav" });
        }
      });

      cb(files);
    }).fail(function() {
      // nothing found
      cb([]);
    });
  };

  /**
    * Check if the given store contains details on an LDP collection
    * and if so, list the resources in it.
    */
  function findLdpFiles(store, baseUrl, cb) {
    var files = [];

    store.registerDefaultNamespace('rdfs', 'http://www.w3.org/2000/01/rdf-schema#');
    store.registerDefaultNamespace('posix', 'http://www.w3.org/ns/posix/stat#');

    store.execute('select distinct ?s from <urn:default> where { ?s a ?t . FILTER(?t in (posix:File, rdfs:Resource)) . }', function(s,r) {
      for(var i = 0; i < r.length; i++) {
        var uri = r[i].s.value;
        if(!uri.startsWith('http')) {
          uri = baseUrl + uri;
        }
        files.push({ "uri": uri, "ioType": "ldp" });
      }
    });

    cb(files);
  };


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
      files.push({
        "uri": uri,
        "ioType": "sparql",
        "sparqlEndpoint": sparqlEndpoint
      });

      findFiles(i+1);
      return;
    }

    function checkNonTurtle() {
      checkDAVFolder(uri, function(newFiles) {
        if(newFiles.length) {
          files = files.concat(newFiles);
          findFiles(i+1);
        }

        // no DAV files found - check if we can access the uri via a sparql endpoint
        else {
          if(sparqlEndpoint) {
            var sparqlUrl = sparqlEndpoint + "?query=" + encodeURIComponent("construct { ?s ?p ?o } where { graph <" + uri + "> { ?s ?p ?o } }");
            $.ajax({
              url: sparqlUrl,
              headers: {
                Accept: "text/turtle"
              }
            }).done(function(data, textStatus, jqXHR) {
              if(jqXHR.getResponseHeader('Content-Type').indexOf('turtle') > 0) {
                files.push({
                  "uri": uri,
                  "ioType": "sparql",
                  "sparqlEndpoint": sparqlEndpoint
                });
              }
            }).then(function() {
              findFiles(i+1);
            })
          }

          // no sparql endpoint - continue with next storage uri
          else {
            findFiles(i+1);
          }
        }
      });
    };

    // get the URI, request Turtle and see what we get
    $.ajax({
      url: uri,
      headers: {
        Accept: "text/turtle"
      }
    }).done(function(data, textStatus, jqXHR) {
      var ct = jqXHR.getResponseHeader('Content-Type');

      // turtle content
      if(ct.indexOf('turtle') >= 0) {
        // look for LDP
        var store = rdfstore.create();
        store.load('text/turtle', data , 'urn:default', function() {
          findLdpFiles(store, uri, function(newFiles) {
            if(newFiles.length) {
              // we found LDP files
              files = files.concat(newFiles);
              findFiles(i+1);
            }
            else if(data.length) {
              // no LDP files found but we have turtle content
              files.push({ "uri": uri, "ioType": "webdav" });
              findFiles(i+1);
            }
            else {
              findFiles(i+1);
            }
          });
        });
      }

      // no turtle content found, check if we have a DAV location
      else {
        checkNonTurtle();
      }
    }).fail(checkNonTurtle);
  };
  findFiles(0);
};
