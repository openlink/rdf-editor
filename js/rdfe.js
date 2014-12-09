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
String.prototype.format = function () {
  var args = arguments;
  return this.replace(/{(\d+)}/g, function (match, number) {
    return typeof args[number] != 'undefined' ? args[number] : match;
  });
};

RDFE = {};

// SPARQL I/O statements
RDFE.IO_INSERT = 'INSERT DATA {GRAPH <{0}> { <{1}> <{2}> {3} . }}';
RDFE.IO_DELETE = 'DELETE DATA {GRAPH <{0}> { <{1}> <{2}> {3} . }}';

RDFE.fileName = function (path)
{
  return path.split("/").pop();
}

RDFE.fileParent = function (path)
{
  return path.substring(0, path.lastIndexOf('/'));
}

RDFE.io = function (options) {
	var self = this;

	this.options = options;

	this.insert = function (s, p, o) {
	  this.call(RDFE.IO_INSERT, s, p, o);
  }

	this.delete = function (s, p, o) {
	  this.call(RDFE.IO_DELETE, s, p, o);
	}

	this.call = function (q, s, p, o) {
    $(document).ajaxError(function(){alert('IO Sparql Request Failed');});
    $(document).ajaxSuccess(function(){alert('IO Sparql Request Success');});

	  var query = q.format(this.options.graph, s, p, o);
    $.ajax({
      url:  this.options.host,
      type: 'GET',
      data: {"query": query}
    });
  }
}

RDFE.gsp = function (options) {
	var self = this;

	this.options = options;

	this.insert = function (content) {
	  this.call('PUT', content);
  }

	this.update = function (content) {
	  this.call('POST', content);
	}

	this.delete = function (content) {
	  this.call('DELETE');
	}

	this.call = function (method, content) {
    $(document).ajaxError(function(){alert('GSP Sparql Request Failed');});
    $(document).ajaxSuccess(function(){alert('GSP Sparql Request Success');});

	  var host = this.options.host + '?graph=' + encodeURIComponent(this.options.graph);
    $.ajax({
      url:  host,
      type: method,
      contentType: 'application/octet-stream',
      processData: false,
      data: content
    });
  }
}

RDFE.LDP_INSERT = 'INSERT DATA {GRAPH <{0}> { <{1}> <{2}> {3} . }}';
RDFE.ldp = function (options) {
	var self = this;

	this.options = options;

	this.insert = function (path, content) {
    var headers = {"Content-Type": 'text/turtle', "Slug": RDFE.fileName(path)};
	  this.call('POST', RDFE.fileParent(path), headers, content);
  }

	this.update = function (path, s, p, o) {
	  var content = q.format(RDFE.LDP_INSERT, s, p, o);
    var headers = {"Content-Type": 'application/sparql-update'};
	  this.call('PATCH', path, headers, content);
	}

	this.delete = function (path) {
	  if (name) {
	    alert('LDP Sparql Request Failed');
	    return;
	  }
	  this.call('DELETE', path);
	}

	this.call = function (method, path, headers, content) {
    $(document).ajaxError(function(){alert('LDP Sparql Request Failed');});
    $(document).ajaxSuccess(function(){alert('LDP Sparql Request Success');});

    $.ajax({
      url: path,
      type: method,
      headers: headers,
      contentType: 'application/octet-stream',
      processData: false,
      data: content
    });
  }
}
