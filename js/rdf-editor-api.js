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

function makeTriple(s, p, o) {
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


function getOldTriple(el) {
    var s=unescape(el.attr("data-statement-s-old"));
    var p=unescape(el.attr("data-statement-p-old"));
    var o=unescape(el.attr("data-statement-o-old"));
    return store.rdf.createTriple(parseNTNode(s), parseNTNode(p), parseNTNode(o));
}

function getNewTriple(el) {
    var s=el.find("td[data-title='Subject'] a").text();
    var p=el.find("td[data-title='Predicate'] a").text();
    var o=el.find("td[data-title='Object'] a").text();
    return(makeTriple(s,p,o));
}

function saveTripleToElem(tripleTr, triple) {
    tripleTr.attr ('data-statement-s-old', escape(triple.subject.toNT()));
    tripleTr.attr ('data-statement-p-old', escape(triple.predicate.toNT()));
    tripleTr.attr ('data-statement-o-old', escape(triple.object.toNT()));
}

function createEditorUi(store, graphUri, container) {
    store.graph(graphUri, function(success, g) {
        if(success) {
          container.empty();
            for(var i = 0; i < g.length; i++) {
                var s=g.toArray()[i].subject;
                var p=g.toArray()[i].predicate;
                var o=g.toArray()[i].object;
                container.append(' \
                    <tr class="triple" \
                    data-statement-s-old="' + escape(s.toNT()) + '" \
                    data-statement-p-old="' + escape(p.toNT()) + '" \
                    data-statement-o-old="' + escape(o.toNT()) + '"> \
                    <td data-title="Subject"><a href="#" data-type="text" class="triple editable editable-click s">' + escapeHTML(s.toString()) + '</a></td> \
                    <td data-title="Predicate"><a href="#" data-type="text" class="triple editable editable-click p">' + escapeHTML(p.toString())+ '</a></td> \
                    <td data-title="Object"><a href="#" data-type="text" class="triple editable editable-click o">' + escapeHTML(o.toString()) + '</a></td> \
                    <td><a href="#" class="btn btn-danger btn-xs triple-action triple-action-delete">Delete<br></a></td> \
                    </tr>\n');
            }

            $('.editable').editable({ mode: "inline" }).on('save', function(e, params) {
                var $this = $(this);
                var $tripleTr = $this.closest('tr');

                var updated_field = $this.hasClass("o") ? 'o' : $this.hasClass("s") ? 's' : $this.hasClass("p") ? 'p' : '';
                var s = updated_field == 's' ? params.newValue : $tripleTr.find('a.s').text();
                var p = updated_field == 'p' ? params.newValue : $tripleTr.find('a.p').text();
                var o = updated_field == 'o' ? params.newValue : $tripleTr.find('a.o').text();

                store.delete(store.rdf.createGraph([getOldTriple($tripleTr)]), graphUri, function(success) {
                    if(success) {
                        console.log("Successfully deleted old triple")

                        var newTriple = makeTriple(s, p, o);

                        store.insert(store.rdf.createGraph([newTriple]), graphUri, function(success){
                            if(success) {
                                // we simply update the old triple values in the tr tag
                                saveTripleToElem($tripleTr, newTriple);
                            }
                            else {
                                console.log('Failed to add new triple to store.');
                                // FIXME: Error handling!!!
                            }
                        });
                    }
                    else {
                      console.log('Failed to add delete old triple from store.');
                        // FIXME: Error handling!!!
                    }
                });
            });

            $('.triple-action-delete').on("click", function(e) {
                var $this = $(this);
                var $tripleTr = $this.closest('tr');
                store.delete(store.rdf.createGraph([getOldTriple($tripleTr)]), graphUri, function(success){
                    if(success) {
                        $tripleTr.remove();
                    }
                    else {
                        // FIXME: Error handling!!!
                    }
                });
            });
        }
    });
}

function io_draw_graph_contents(sourceUri, sparqlEndpoint) {
//   Retrieve a graph via SPARQL construct query and render HTML table
    var host=sparqlEndpoint;
    var graph=encodeURIComponent($("#io_g").val());
    var queryurl=host + '?default-graph-uri=' + graph + '&query=construct+%7B+%3Fs+%3Fp+%3Fo+%7D++WHERE+%7B%3Fs+%3Fp+%3Fo%7D&should-sponge=&format=text%2Fturtle&timeout=30000000';
    $("#sparqlcontents").html("");

    store.clear(sourceUri, function(success) {
      if (success) {
        console.log('Successfully cleared store before loading contents.');
      }
      else {
        console.log('Failed to clear store before loading contents.');
      }
    });

    store.load('remote', queryurl, sourceUri, function(a,n) {
        createEditorUi(store, sourceUri, $("#sparqlcontents"));
    });
}
