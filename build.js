var buildify = require('buildify');

// the main sources of the RDF Editor - core part
var jsRdfeCore = [
  "src/core/utils.js",
  "src/core/rdf_store_ext.js",
  "src/core/io.js",
  "src/core/dav.js",
  "src/core/config.js",
  "src/core/rdfnode.js",
  "src/core/ontology.js",
  "src/core/document.js"
];

// the main sources of the RDF Editor - ui part
var jsRdfeUi = [
  "src/ui/jquery.rdfnodeinput.js",
  "src/ui/editable-rdfnode.js",
  "src/ui/jquery.ontobox.js",
  "src/ui/jquery.propertybox.js",
  "src/ui/editable-propertybox.js",
  "src/ui/tripleview.js",
  "src/ui/backbone-forms-rdfnode.js",
  "src/ui/backbone-forms-nestedrdf.js",
  "src/ui/entitymodel.js",
  "src/ui/entityeditor.js",
  "src/ui/entityview.js",
  "src/ui/predicateeditor.js",
  "src/ui/predicateview.js",
  "src/ui/editor.js"
];

// Third-party libs which we modified in one way or another for RDFE
var jsRdfeCustomCoreDeps = [
  "src/deps/rdf_store.js"
];
var jsRdfeCustomUiDeps = [
  "src/deps/backbone-forms-list.js",
  "src/deps/backbone-forms-bootstrap3.js",
  "src/deps/bootstrap-table.js",
  "src/deps-orig/bootstrap-table-editable.js" // needs to be here because it depends on bs-table.
];

// Vanilla Third-party libs which were not modified and could theoretically be loaded differently
var jsRdfeCoreDeps = [
  "src/deps-orig/jquery-1.11.1.min.js",
  "src/deps-orig/jquery.md5.js",
  "src/deps-orig/underscore-min.js",
  "src/deps-orig/backbone-min.js",
  "src/deps-orig/n3-browser.min.js"
];
var jsRdfeUiDeps = [
  "src/deps-orig/selectize.js",
  "src/deps-orig/backbone-forms.js",
  "src/deps-orig/bootstrap.js",
  "src/deps-orig/bootstrap-editable.js",
  "src/deps-orig/bootstrap-datetimepicker.min.js",
  "src/deps-orig/bootstrap-toggle.min.js"
];

// Third-party dependencies for the demo page
var demoPageDeps = [
  "js/val.js",
  "js/jstorage.js",
  "js/bootstrap-growl.min.js",
  "js/dummy.js", // growl does not end in a ";" which breaks the parsing
  "js/spin.js",
  "js/jquery.spin.js",
  "js/jquery.cookie.js",
  "js/bootbox.min.js",
  "js/jquery-deparam.min.js"
];

var cssRdfe = [
  "css/jquery.rdfnodeinput.css",
  "css/bootstrap-fixes.css",
  "css/rdfe.css"
];

var cssCustomDeps = [
  "css/backbone-forms-bootstrap3.css"
];

var cssDeps = [
  "css/bootstrap.css",
  "css/bootstrap-datetimepicker.min.css",
  "css/bootstrap-editable.css",
  "css/bootstrap-theme.css",
  "css/bootstrap-table.min.css",
  "css/bootstrap-toggle.min.css",
  "css/selectize.bootstrap3.css"
];

// build the basic js distribution files
buildify()
  .concat(jsRdfeCustomCoreDeps)
  .concat(jsRdfeCore)
  .save('distribution/rdfe-core.js')
  .uglify()
  .save('distribution/rdfe-core.min.js');

buildify()
  .concat(jsRdfeCustomUiDeps)
  .concat(jsRdfeUi)
  .save('distribution/rdfe-ui.js')
  .uglify()
  .save('distribution/rdfe-ui.min.js');


// build the all-in-one js files
buildify()
  .concat(jsRdfeCoreDeps)
  .concat(['distribution/rdfe-core.js'])
  .save('distribution/rdfe-core-standalone.js');
buildify()
  .concat(jsRdfeCoreDeps)
  .uglify()
  .concat(['distribution/rdfe-core.min.js'])
  .save('distribution/rdfe-core-standalone.min.js');

buildify()
  .concat(jsRdfeUiDeps)
  .uglify()
  .concat(['distribution/rdfe-ui.min.js'])
  .save('distribution/rdfe-ui-standalone.min.js');
buildify()
  .concat(jsRdfeUiDeps)
  .concat(['distribution/rdfe-ui.js'])
  .save('distribution/rdfe-ui-standalone.js');


buildify()
  .concat([
    'distribution/rdfe-core-standalone.min.js',
    'distribution/rdfe-ui-standalone.min.js'
  ])
  .save('distribution/rdfe-standalone.min.js');
buildify()
  .concat([
    'distribution/rdfe-core-standalone.js',
    'distribution/rdfe-ui-standalone.js'
  ])
  .save('distribution/rdfe-standalone.js');


// build the stand-alone css files
buildify()
  .concat(cssRdfe)
  .cssmin()
  .save('distribution/rdfe.min.css');

buildify()
  .concat(cssDeps)
  .cssmin()
  .concat(['distribution/rdfe.min.css'])
  .save('distribution/rdfe-standalone.min.css');
