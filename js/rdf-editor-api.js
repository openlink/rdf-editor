if (typeof String.prototype.startsWith != 'function') {
  // see below for better implementation!
  String.prototype.startsWith = function (str){
    return this.indexOf(str) == 0;
  };
}

/* Extensions for rdfstore.js */
/**
 * Try to abbreviate a URI using the prefixes defined in the rdfstore.
 * @param uri An rdfstore URI node
 * @return The abbreviated CURI string or a @p null if no prefix could be found to match the URI.
 */
rdfstore.Store.prototype.uriToCuri = function(uri) {
  var x = node.toString();
  for (prefix in this.rdf.prefixes) {
    var ns = this.rdf.prefixes[prefix];
    if(ns.length > 0 && x.startsWith(ns)) {
      return x.replace(ns, prefix + ':');
    }
  }
  return null;
};

/**
 * Try to convert an abbreviated CURI into a URI using the prefixes defined in the rdfstore.
 * @param curi The abbreviated URI (Example: @p rdf:type)
 * @return The full URI if the prefix could be found, @p null otherwise.
 */
rdfstore.Store.prototype.curiToUri = function(curi) {
  return this.rdf.resolve(curi);
};


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

function io_draw_graph_contents(sourceUri, sparqlEndpoint) {
//   Retrieve a graph via SPARQL construct query and render HTML table
  var host=sparqlEndpoint;
  var graph=encodeURIComponent($("#io_g").val());
  var queryurl=host + '?default-graph-uri=' + graph + '&query=construct+%7B+%3Fs+%3Fp+%3Fo+%7D++WHERE+%7B%3Fs+%3Fp+%3Fo%7D&should-sponge=&format=text%2Fturtle&timeout=30000000';
  $("#sparqlcontents").html("");
  store.load('remote', queryurl, sourceUri, function(a,n) {
    store.graph(sourceUri, function(success, g) {
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
		$('.editable').editable({ mode: "inline" }).on('save', function(e, params) {
			var graphURI = $("#io_g").val();
			console.log("GRAPH: ", graphURI);
			var updated_field = $(this).hasClass("o") ? 'o' : $(this).hasClass("s") ? 's' : $(this).hasClass("p") ? 'p' : '';
			console.log("updated:"+updated_field);
			var ind = $(this).closest('tr').attr("data-statement-index");
			console.log(ind);
			var s = updated_field == 's' ? params.newValue : $(this).closest('tr').find('a.s').text();
			var p = updated_field == 'p' ? params.newValue : $(this).closest('tr').find('a.p').text();
			var o = updated_field == 'o' ? params.newValue : $(this).closest('tr').find('a.o').text();

			console.log(s, p, o);
			
			var old_graph = store.rdf.createGraph();
			var old_var = io_index_to_triple_old(ind);
			console.log("OLD VARS: "+ old_var);
			old_graph.add(old_var);
			console.log("OLD GRAPH: "+ old_graph);
			store.delete(old_graph, graphURI, function(success){
				if(success) {
					console.log("DELETED!!!")
				}
			});

			var new_graph = store.rdf.createGraph();
			console.log("NEW GRAPH: "+ new_graph);
			var new_var = io_make_triple(s, p, o);
			console.log("NEW VAR: "+ new_var);
			new_graph.add(new_var);
			store.insert(new_graph, graphURI, function(success){
				if(success) {
					console.log("Inserted");		
					
					store.graph(graphURI, function(success, g) {
						console.log("Loading...");
						$("#sparqlcontents").html("");
						for(var i = 0; i < g.length; i++) {
						  var s=g.toArray()[i].subject;
						  var p=g.toArray()[i].predicate;
						  var o=g.toArray()[i].object;
						  console.log(s.toString(), p.toString(), o.toString());
						  
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
					});
				}
			});
			
			//store.функци€_сохран€юща€_значени€( $(this).text() ) 
		});
			
		$('.triple-action-delete').on("click", function(e) {
			var ind = $(this).closest('tr').attr("data-statement-index");
			var graphURI = $("#io_g").val();
			var old_graph = store.rdf.createGraph();
			var old_var = io_index_to_triple_old(ind);
			console.log("OLD VARS: "+ old_var);
			old_graph.add(old_var);
			console.log("OLD GRAPH: "+ old_graph);
			store.delete(old_graph, graphURI, function(success){
				if(success) {
					console.log("DELETED!!!");
					store.graph(graphURI, function(success, g) {
						console.log("Loading...");
						$("#sparqlcontents").html("");
						for(var i = 0; i < g.length; i++) {
						  var s=g.toArray()[i].subject;
						  var p=g.toArray()[i].predicate;
						  var o=g.toArray()[i].object;
						  console.log(s.toString(), p.toString(), o.toString());
						  
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
					});
				}
			});
			

		});
		
		  }
		} )
  }
  );
}
