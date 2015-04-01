GRUNT_FILES = \
	app/bower_components \
	app/styles/*.css \
	css/*.css \
	app/scripts/*.js \
	app/scripts/controllers/*.js \
	src/deps-orig/*.js \
	src/deps/*.js \
	src/core/*.js \
	src/ui/*.js \
	src/deps-demo/*.js \
	app/data/*.ttl \
	app/config.json

RDF_EDITOR_FILES = dist/index.html

VERSION=`./version`

vad_DATA = rdf_editor_dav.vad

node_modules: package.json
	npm install

app/bower_components: node_modules bower.json
	bower install

dist/index.html: $(GRUNT_FILES)
	grunt build

# Rule to create our vad
rdf_editor_dav.vad: $(RDF_EDITOR_FILES) rdf-editor-sticker.xml Makefile vad_version
	@VADPACKER@ -o rdf_editor_dav.vad --var="VERSION=$(VERSION)" rdf-editor-sticker.xml

CLEANFILES = *.vad

EXTRA_DIST = $(RDF_EDITOR_FILES) rdf-editor-sticker.xml
