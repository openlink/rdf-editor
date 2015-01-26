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
