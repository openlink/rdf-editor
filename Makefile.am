RDF_EDITOR_FILES = \
  *.html \
  css/*.css \
  fonts/* \
  img/*.gif \
  img/*.png \
  js/*.js \
  js/rdfe/*.js \
  test/*.ttl \
  test/*.rdf \
  config.json

VERSION=`./version`

vad_DATA = rdf_editor_dav.vad

# Rule to create our vad
rdf_editor_dav.vad: $(RDF_EDITOR_FILES) rdf-editor-sticker.xml Makefile vad_version
	@PYTHON@ @VADPACKER@ -o rdf_editor_dav.vad --var="VERSION=$(VERSION)" rdf-editor-sticker.xml

CLEANFILES = *.vad

EXTRA_DIST = $(RDF_EDITOR_FILES) rdf-editor-sticker.xml
