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

rdfstore.Store.prototype.parseLiteral = function(literalString) {
    var parts = literalString.lastIndexOf("@");
    if(parts!=-1 && literalString[parts-1]==='"' && literalString.substring(parts, literalString.length).match(/^@[a-zA-Z\-]+$/g)!=null) {
        var value = literalString.substring(1,parts-1);
        var lang = literalString.substring(parts+1, literalString.length);
        return {token: "literal", value:value, lang:lang};
    }
    var parts = literalString.lastIndexOf("^^");
    if(parts!=-1 && literalString[parts-1]==='"' && literalString[parts+2] === '<' && literalString[literalString.length-1] === '>') {
        var value = literalString.substring(1,parts-1);
        var type = literalString.substring(parts+3, literalString.length-1);
        return {token: "literal", value:value, type:type};
    }
    var value = literalString.substring(1,literalString.length-1);
    return {token:"literal", value:value};
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

/**
 * Parse a string into a node object.
 */
function parseNTNode(s) {
    if(s[0] == '<')
        return store.rdf.createNamedNode(io_strip_URL_quoting(s));
    else if(s.startsWith('_:'))
        return store.rdf.createNamedNode(s); // FIXME: blank nodes are so much trouble. We need to find a way to handle them properly
    else {
        var l = store.parseLiteral(s);
        return store.rdf.createLiteral(l.value, l.lang, l.type);
    }
}

function io_make_triple(s, p, o) {
    ss=store.rdf.createNamedNode(io_strip_URL_quoting(s));
    pp=store.rdf.createNamedNode(io_strip_URL_quoting(p));
    // let's be dumb about this for now
    o = io_strip_URL_quoting (o);
    if(o.startsWith("http") || o.startsWith("urn")) {
        oo=store.rdf.createNamedNode(o);
    } 
    else {
        var l = store.parseLiteral(o);
        oo = store.rdf.createLiteral(l.value, l.lang, l.type);
    }
    return(store.rdf.createTriple(ss, pp, oo));
}


function io_index_to_triple_old(i) {
    //   Return old values of a triple by index i, prior to having been edited
    var el=$("#sparqlcontents").children("tr[data-statement-index="+i+"]");
    var s=unescape(el.attr("data-statement-s-old"));
    var p=unescape(el.attr("data-statement-p-old"));
    var o=unescape(el.attr("data-statement-o-old"));
    return store.rdf.createTriple(parseNTNode(s), parseNTNode(p), parseNTNode(o));
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
                    var updated_field = $(this).hasClass("o") ? 'o' : $(this).hasClass("s") ? 's' : $(this).hasClass("p") ? 'p' : '';
                    var ind = $(this).closest('tr').attr("data-statement-index");
                    var s = updated_field == 's' ? params.newValue : $(this).closest('tr').find('a.s').text();
                    var p = updated_field == 'p' ? params.newValue : $(this).closest('tr').find('a.p').text();
                    var o = updated_field == 'o' ? params.newValue : $(this).closest('tr').find('a.o').text();
                    var old_graph = store.rdf.createGraph();
                    var old_var = io_index_to_triple_old(ind);
                    old_graph.add(old_var);
                    store.delete(old_graph, graphURI, function(success){
                        if(success) {
                            console.log("DELETED!!!")
                        }
                    });
                    var new_graph = store.rdf.createGraph();
                    var new_var = io_make_triple(s, p, o);
                    new_graph.add(new_var);
                    store.insert(new_graph, graphURI, function(success){
                        if(success) {
                            store.graph(graphURI, function(success, g) {
                                $("#sparqlcontents").html("");
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
                            });
                        }
                    });
                });
                $('.triple-action-delete').on("click", function(e) {
                    var ind = $(this).closest('tr').attr("data-statement-index");
                    var row_to_rem = $(this).closest('tr');
                    var graphURI = $("#io_g").val();
                    var old_graph = store.rdf.createGraph();
                    var old_var = io_index_to_triple_old(ind);
                    old_graph.add(old_var);
                    store.delete(old_graph, graphURI, function(success){
                        if(success) {
                            row_to_rem.remove();
                        }
                    });
                });
            }
		})
    });
}
