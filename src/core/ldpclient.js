/**
 * The code in this file is in part based on the warp project by Andrei Sambra (deiu)
 */

(function($) {
  if(!window.RDFE)
    window.RDFE = {};

//   var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
//   var RDFS = $rdf.Namespace("http://www.w3.org/2000/01/rdf-schema#");
//   var LDP = $rdf.Namespace("http://www.w3.org/ns/ldp#");
//   var POSIX = $rdf.Namespace("http://www.w3.org/ns/posix/stat#");

  RDFE.LDPClient = function(config) {
//     if(config.options.proxy) {
//       // add CORS proxy
//       $rdf.Fetcher.crossSiteProxyTemplate=config.options.proxy;
//     }
  };

  RDFE.LDPClient.prototype.listDir = function(url, success, fail) {

    var store = rdfstore.create(),
        io = RDFE.IO.createIO('ldp'),
        graph = 'urn:default';

    store.registerDefaultNamespace('rdfs', 'http://www.w3.org/2000/01/rdf-schema#');
    store.registerDefaultNamespace('posix', 'http://www.w3.org/ns/posix/stat#');

    io.retrieveToStore(url, store, graph, {
      'success': function() {
        var files = [];
        store.execute('select distinct ?s from <urn:default> where { ?s a ?t . FILTER(?t in (posix:File, rdfs:Resource)) . }', function(s,r) {
          for(var i = 0; i < r.length; i++) {
            var uri = r[i].s.value;
            if(!uri.startsWith('http')) {
              uri = url + uri;
            }
            files.push(uri);
          }
          if(success) {
            success(files);
          }
        });
      },
      'error': fail
    });

    /*
    // trueg: rdflib.js is broken atm
    var g = $rdf.graph();
    var f = $rdf.fetcher(g);

    f.nowOrWhenFetched(url, undefined, function(ok, body) {
      if(!ok) {
        if(fail) {
          fail();
        }
      }
      else {
        var files = [];
        var fileStatements = g.statementsMatching(undefined, RDF("type"), POSIX("File"));
        fileStatements = (fileStatements.length > 0) ? fileStatements.concat(g.statementsMatching(undefined, RDF("type"), RDFS("Resource"))) : g.statementsMatching(undefined, RDF("type"), RDFS("Resource"));
        for (i in fileStatements) {
          var uri = fileStatements[i].subject.uri;
          files.push(uri);
        }
        if(success) {
          success(files);
        }
      }
    });
*/
  };

})(jQuery);
