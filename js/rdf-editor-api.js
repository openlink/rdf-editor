
// useful functions

function escapeHTML(str) {
  return (str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') );
}


// rdf_store bits

function io_draw_graph_contents() {
  var store=rdfstore.create();
  var host= $("#io_spq").val();
  var graph=encodeURIComponent($("#io_g").val());
  var queryurl=host + '?default-graph-uri=' + graph + '&query=construct+%7B+%3Fs+%3Fp+%3Fo+%7D++WHERE+%7B%3Fs+%3Fp+%3Fo%7D&should-sponge=&format=text%2Fturtle&timeout=30000000';
  $("#sparqlcontents").html("");
  store.load('remote', queryurl, IO_SPARQL_GRAPH, function(a,n) {
    store.graph(IO_SPARQL_GRAPH, function(success, g) {
      if(success) {
	for(var i = 0; i < g.length; i++) {
	  $("#sparqlcontents").append(' \
	  <tr class="triple" data-statement="' + i + '"> \
	  <td data-title="Subject"><a href="#" data-type="text" class="triple editable editable-click subject">' + escapeHTML(store.namedNodeToString(g.toArray()[i].subject)) + '</a></td> \
	  <td data-title="Predicate"><a href="#" data-type="text" class="triple editable editable-click predicate">' + escapeHTML(store.namedNodeToString(g.toArray()[i].predicate))+ '</a></td> \
	  <td data-title="Object"><a href="#" data-type="text" class="triple editable editable-click object">' + escapeHTML(store.namedNodeToString(g.toArray()[i].object))  + '</a></td> \
	  <td><a href="#" class="btn btn-danger btn-xs triple-action triple-action-delete">Delete<br></a></td>\
	  </tr>\n');
	}
	$('.editable').editable({ mode: "inline" });
      }
    } )
  }
  );
}
