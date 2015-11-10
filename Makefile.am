#
#  This file is part of the OpenLink RDF Editor
#
#  Copyright (C) 2014-2015 OpenLink Software
#
#  This project is free software; you can redistribute it and/or modify it
#  under the terms of the GNU General Public License as published by the
#  Free Software Foundation; only version 2 of the License, dated June 1991.
#
#  This program is distributed in the hope that it will be useful, but
#  WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
#  General Public License for more details.
#
#  You should have received a copy of the GNU General Public License along
#  with this program; if not, write to the Free Software Foundation, Inc.,
#  51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA
#
#

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

VAD_VERSION=`./gen_version.sh`

vad_DATA = rdf_editor_dav.vad

node_modules: package.json
	npm install

app/bower_components: node_modules bower.json
	bower install

dist/index.html: $(GRUNT_FILES)
	grunt build


#
#  Build Virtuoso vad packge
#
rdf_editor_dav.vad: $(RDF_EDITOR_FILES) rdf-editor-sticker.xml Makefile vad_version
	@PYTHON@ @VADPACKER@ -o rdf_editor_dav.vad --var="VERSION=$(VAD_VERSION)" rdf-editor-sticker.xml


#
#  Cleanup
#
CLEANFILES = *.vad


clean-local: clean-local-check
.PHONY: clean-local-check
clean-local-check:
	-rm -rf dist .tmp


distclean-local: distclean-local-check
.PHONY: distclean-local-check
distclean-local-check:
	-rm -rf node_modules app/bower_components


#
#  List all files in distribution
#
RDF_EDITOR_DIST = \
	AUTHORS \
	COPYING \
	CREDITS \
	ChangeLog \
	LICENSE \
	Makefile.am \
	NEWS \
	README \
	README.GIT \
	.bowerrc \
	.gitignore \
	.gitmodules \
	.jshintrc \
	.travis.yml \
	autogen.sh \
	bower.json \
	configure.ac \
	gen_version.sh \
	Gruntfile.js \
	karma.conf.js \
	package.json \
	rdf-editor-sticker.xml \
	vad_version \
	app/*.json \
	app/data/*.ttl \
	app/*.html \
	app/images/*.gif \
	app/images/*.png \
	app/scripts/controllers/*.js \
	app/scripts/*.js \
	app/styles/*.css \
	app/tmpl/*.html \
	app/views/*.html \
	css/bootstrap.css.map \
	css/bootstrap-theme.css.map \
	css/*.css \
	e2e-tests/*.js \
	src/core/*.js \
	src/deps-demo/*.js \
	src/deps/*.js \
	src/deps-orig/backbone-min.map \
	src/deps-orig/*.js \
	src/deps-orig/underscore-min.map \
	src/ui/*.js 

VADPACKER = \
	vadpacker/*.py \
	vadpacker/AUTHORS \
	vadpacker/ChangeLog \
	vadpacker/COPYING \
	vadpacker/elementtree/*.py \
	vadpacker/elementtree/ElementPath.pyc \
	vadpacker/elementtree/ElementTree.pyc \
	vadpacker/elementtree/__init__.pyc \
	vadpacker/NEWS \
	vadpacker/README \
	vadpacker/README-elementtree

EXTRA_DIST = $(RDF_EDITOR_DIST) $(VADPACKER)
