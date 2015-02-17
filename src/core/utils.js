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
