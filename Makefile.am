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

VERSION=`./gen_version.sh`

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
