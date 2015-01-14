/*
 *
 *  This file is part of the OpenLink Software Virtuoso Open-Source (VOS)
 *  project.
 *
 *  Copyright (C) 1998-2014 OpenLink Software
 *
 *  This project is free software; you can redistribute it and/or modify it
 *  under the terms of the GNU General Public License as published by the
 *  Free Software Foundation; only version 2 of the License, dated June 1991.
 *
 *  This program is distributed in the hope that it will be useful, but
 *  WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 *  General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License along
 *  with this program; if not, write to the Free Software Foundation, Inc.,
 *  51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA
 *
 */
if (!RDFE) RDFE = {};

/*
 *
 * Config class
 *
 */
RDFE.Config = function(source, callback) {
  var self = this;
  this.options = {};

  // defaults
  this.options.Ontology = {};
  this.options.Ontology.proxy = false;

  this.options.Templates = {};

  this.options.Bookmarks = {};

  this.options.Actions = ['open', 'save', 'saveAs'];

  if (!source) return;
  $.ajax({
    url: source,
    type: 'GET',
    dataType: 'json',
    success: (function(callback) {
      return function(data) {
        self.options.Ontology = $.extend(self.options.Ontology, data.Ontology);

        // Templates options
        self.options.Templates = $.extend(self.options.Templates, data.Templates);

        // Bookmarks options
        self.options.Bookmarks = $.extend(self.options.Bookmarks, data.bookmarks);

        // Editor options
        if (data.Actions)
          self.options.Actions = data.Actions;

        if (callback) callback(self);
      };
    })(callback),
    error: function(jqXHR, textStatus, errorThrown) {
      console.error('config load =>', errorThrown);
    }
  });
}
