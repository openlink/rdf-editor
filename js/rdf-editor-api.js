// draw_graph_contents() { }
// insert() { }
// delete() { }
// update() { delete(); insert() ; draw_graph_contents() }


// useful functions

function escapeHTML(str) {
  return (str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') );
}


// rdf_store bits

function io_strip_URL_quoting(str) {
  return(str.replace(RegExp('^<(.*)>$'), '$1'));
}

function io_strip_litstr_quoting(str) {
  return(str.replace(RegExp('^"(.*)"$'), '$1'));
}

function io_make_triple(s, p, o) {
  ss=store.rdf.createNamedNode(io_strip_URL_quoting(s));
  pp=store.rdf.createNamedNode(io_strip_URL_quoting(p));

  if(o[0]=="<") {
    oo=store.rdf.createNamedNode(io_strip_URL_quoting(o));
  } else {
    oo=store.rdf.createLiteral(io_strip_litstr_quoting(o));
  }

  return(store.rdf.createTriple(ss, pp, oo));
}


function io_index_to_triple_old(i) {
//   Return old values of a triple by index i, prior to having been edited
  var el=$("#sparqlcontents").children("tr[data-statement-index="+i+"]");
  var s=unescape(el.attr("data-statement-s-old"));
  var p=unescape(el.attr("data-statement-p-old"));
  var o=unescape(el.attr("data-statement-o-old"));
  return(io_make_triple(s,p,o));
}

function io_index_to_triple(i) {
//   Return new values of a triple by index i, after having been edited
  var el=$("#sparqlcontents").children("tr[data-statement-index="+i+"]");
  var s=el.children("td[data-title='Subject']").text();
  var p=el.children("td[data-title='Predicate']").text();
  var o=el.children("td[data-title='Object']").text();
  return(io_make_triple(s,p,o));
}

function io_draw_graph_contents() {
//   Retrieve a graph via SPARQL construct query and render HTML table
  var host= $("#io_spq").val();
  var graph=encodeURIComponent($("#io_g").val());
  var queryurl=host + '?default-graph-uri=' + graph + '&query=construct+%7B+%3Fs+%3Fp+%3Fo+%7D++WHERE+%7B%3Fs+%3Fp+%3Fo%7D&should-sponge=&format=text%2Fturtle&timeout=30000000';
  $("#sparqlcontents").html("");
  store.load('remote', queryurl, IO_SPARQL_GRAPH, function(a,n) {
    store.graph(IO_SPARQL_GRAPH, function(success, g) {
      if(success) {
	for(var i = 0; i < g.length; i++) {
	  var s=g.toArray()[i].subject;
	  var p=g.toArray()[i].predicate;
	  var o=g.toArray()[i].object;
	  $("#sparqlcontents").append(' \
	  <tr class="triple" \
	  data-statement-s-old="' + escape(s.toNT()) + '" \
	  data-statement-p-old="' + escape(p.toNT()) + '" \
	  data-statement-o-old="' + escape(o.toNT()) + '" \
	  data-statement-index="' + i + '"> \
	  <td data-title="Subject"><a href="#" data-type="text" class="triple editable editable-click s">' + escapeHTML(s.toString()) + '</a></td> \
	  <td data-title="Predicate"><a href="#" data-type="text" class="triple editable editable-click p">' + escapeHTML(p.toString())+ '</a></td> \
	  <td data-title="Object"><a href="#" data-type="text" class="triple editable editable-click o">' + escapeHTML(o.toString()) + '</a></td> \
	  <td><a href="#" class="btn btn-danger btn-xs triple-action triple-action-delete">Delete<br></a></td> \
	  </tr>\n');
	}
	$('.editable').editable({ mode: "inline" });
      }
    } )
  }
  );
}
