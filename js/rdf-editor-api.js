// draw_graph_contents() { }
// insert() { }
// delete() { }
// update() { delete(); insert() ; draw_graph_contents() }


// useful functions

function escapeHTML(str) {
  return (str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') );
}


// rdf_store bits

function io_index_to_triple_old(i) {
  
}

function io_index_to_triple(i) {
}


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
	  var s=store.namedNodeToString(g.toArray()[i].subject);
	  var p=store.namedNodeToString(g.toArray()[i].predicate);
	  var o=store.namedNodeToString(g.toArray()[i].object);
	  $("#sparqlcontents").append(' \
	  <tr class="triple" \
	  data-statement-s-old="' + escape(s) + '" \
	  data-statement-p-old="' + escape(p) + '" \
	  data-statement-o-old="' + escape(o) + '" \
	  data-statement-index="' + i + '"> \
	  <td data-title="Subject"><a href="#" data-type="text" class="triple editable editable-click s">' + escapeHTML(s) + '</a></td> \
	  <td data-title="Predicate"><a href="#" data-type="text" class="triple editable editable-click p">' + escapeHTML(p)+ '</a></td> \
	  <td data-title="Object"><a href="#" data-type="text" class="triple editable editable-click o">' + escapeHTML(o) + '</a></td> \
	  <td><a href="#" class="btn btn-danger btn-xs triple-action triple-action-delete">Delete<br></a></td> \
	  </tr>\n');
	}
	$('.editable').editable({ mode: "inline" });
      }
    } )
  }
  );
}
