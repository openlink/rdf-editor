#
#  This file is part of the OpenLink RDF Editor
#
#  Copyright (C) 2014-2018 OpenLink Software
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

#
#  Settings
#
BOWER_DIR	= app/bower_components
MODULE_DIR	= node_modules
PKG_NAME	= rdf_editor_pkg


#
#  Get current version
#
VERSION		= `./gen_version.sh`

#
#  What packages to build
#
vad_DATA 	= rdf_editor_dav.vad

noinst_DATA 	= $(PKG_NAME).tar.gz $(PKG_NAME).zip


#
#  Download all the dependency packages and build the app
#
RDF_EDITOR_FILES = dist/index.html

GRUNT_FILES 	= \
	app/styles/*.css \
	css/*.css \
	app/views/*.html \
	app/scripts/*.js \
	app/scripts/controllers/*.js \
	src/deps-orig/*.js \
	src/deps/*.js \
	src/core/*.js \
	src/ui/*.js \
	src/deps-demo/*.js \
	app/data/*.ttl \
	app/config.json

dist/index.html: Gruntfile.js $(GRUNT_FILES) $(BOWER_DIR)
	./gen_version.sh > gen_version
	grunt build

$(BOWER_DIR): $(MODULE_DIR) bower.json
	bower install

$(MODULE_DIR): package.json
	npm install



#
#  Build Virtuoso vad package
#
rdf_editor_dav.vad: $(RDF_EDITOR_FILES) rdf-editor-sticker.xml Makefile vad_version gen_version.sh
	@PYTHON@ @VADPACKER@ -o rdf_editor_dav.vad --var="VERSION=$(VERSION)" rdf-editor-sticker.xml


#
#  Build tar and zip versions of runtime packages for standalone usage
#

$(PKG_NAME).tar.gz: rdf_editor_dav.vad
	-@ln -s dist @PACKAGE@
	-tar cfHz $(PKG_NAME).tar.gz @PACKAGE@
	-@rm -f @PACKAGE@

$(PKG_NAME).zip: rdf_editor_dav.vad
	-@ln -s dist @PACKAGE@
	-zip -9qr $(PKG_NAME).zip @PACKAGE@
	-@rm -f @PACKAGE@


#
#  Cleanup
#
CLEANFILES = *.vad $(PKG_NAME).tar.gz $(PKG_NAME).zip


clean-local: clean-local-check
.PHONY: clean-local-check
clean-local-check:
	-rm -rf dist .tmp


distclean-local: distclean-local-check
.PHONY: distclean-local-check
distclean-local-check:
	-rm -rf $(MODULE_DIR) $(BOWER_DIR)


realclean: clean-local-check distclean-local-check


#
#  Generate ChangeLog
#
.PHONY: changelog
changelog:
	git2cl --format='%s%n%n%b%n' --strip-tab --strip-cherry-pick > ChangeLog


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
	app/views/*.html \
	app/images/*.gif \
	app/images/*.png \
	app/scripts/controllers/*.js \
	app/scripts/*.js \
	app/styles/*.css \
	app/tmpl/*.html \
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
