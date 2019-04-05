/*
 *  This file is part of the OpenLink RDF Editor
 *
 *  Copyright (C) 2014-2019 OpenLink Software
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

/*
 * RDFE Validate functions
 */
if(!window.RDFE)
  window.RDFE = {};

RDFE.Validate = {};

RDFE.Validate.error = function(fld, msg)
{
  $.notify({"message": msg}, {"type": 'danger'});
  setTimeout(function(){fld.focus();}, 1);

  return false;
};

RDFE.Validate.integer = function(fld, v)
{
  var regex = /^[0-9]+$/;
  if (!regex.test(v))
    return RDFE.Validate.error(fld, 'Invalid integer value: ' + v);

  return true;
};

RDFE.Validate.float = function(fld, v)
{
  var regex = /^[-+]?([0-9]*\.)?[0-9]+([eE][-+]?[0-9]+)?$/;
  if (!regex.test(v))
    return RDFE.Validate.error(fld, 'Invalid float value: ' + v);

  return true;
};

RDFE.Validate.date = function(fld, v)
{
  var regex = /^((?:19|20)[0-9][0-9])[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/;
  if (!regex.test(v))
    return RDFE.Validate.error(fld, 'Invalid date value: ' + v);

  return true;
};

RDFE.Validate.time = function(fld, v)
{
  var regex = /^([01]?[0-9]|[2][0-3])(:[0-5][0-9])?$/;
  if (!regex.test(v))
    return RDFE.Validate.error(fld, 'Invalid time value: ' + v);

  return true;
};

RDFE.Validate.dateTime = function(fld, v)
{
  var regex = /^((?:19|20)[0-9][0-9])[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])( ([01]?[0-9]|[2][0-3])(:[0-5][0-9])?)?$/;
  if (!regex.test(v))
    return RDFE.Validate.error(fld, 'Invalid date value: ' + v);

  return true;
};

RDFE.Validate.mail = function(fld, v)
{
  if ((v.length == 0) || (v.length > 40))
    return RDFE.Validate.error(fld, 'E-mail address cannot be empty or longer then 40 chars');

  var regex = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
  if (!regex.test(v))
    return RDFE.Validate.error(fld, 'Invalid E-mail address: ' + v);

  return true;
};

RDFE.Validate.URL = function(fld, v)
{
  var regex = /^(ftp|http|https):(\/\/)?(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
  if (!regex.test(v))
    return RDFE.Validate.error(fld, 'Invalid URL address: ' + v);

  return true;
};

RDFE.Validate.URI = function(fld, v)
{
  var regex = /^([a-z0-9+.-]+):(\/\/)?(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
  var mail = /^acct:([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
  if (!regex.test(v) && !mail.test(v))
    return RDFE.Validate.error(fld, 'Invalid URI address: ' + v);

  return true;
};

RDFE.Validate.WebID = function(fld, v)
{
  if (v == 'foaf:Agent')
    return true;

  var regex = /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
  if (regex.test(v))
    return true;

  regex  = /^acct:([a-zA-Z0-9_\.\-\+])+\@(([a-zA-Z0-9\-:])+)+\.?([a-zA-Z0-9]{0,4})+$/;
  if (regex.test(v))
    return true;

  regex = /^acct:([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
  if (regex.test(v))
    return true;

  return RDFE.Validate.error(fld, 'Invalid URI address: ' + v);
};

RDFE.Validate.check = function(fld, v, params)
{
  v = RDFE.Utils.trim(v);
  params = params || [];
  if ((v.length == 0) && (params.indexOf('canEmpty') !== -1))
    return true;

  if (params.indexOf('integer') !== -1)
    return RDFE.Validate.integer(fld, v);

  if (params.indexOf('float') !== -1)
    return RDFE.Validate.float(fld, v);

  if (params.indexOf('date') !== -1)
    return RDFE.Validate.date(fld, v);

  if (params.indexOf('time') !== -1)
    return RDFE.Validate.time(fld, v);

  if (params.indexOf('dateTime') !== -1)
    return RDFE.Validate.dateTime(fld, v);

  if (params.indexOf('mail') !== -1)
    return RDFE.Validate.mail(fld, v);

  if (params.indexOf('URL') !== -1)
    return RDFE.Validate.URL(fld, v);

  if (params.indexOf('URI') !== -1)
    return RDFE.Validate.URI(fld, v);

  if (params.indexOf('WebID') !== -1)
    return RDFE.Validate.WebID(fld, v);

  if (v.length == 0)
    return RDFE.Validate.error(fld, 'Field cannot be empty');

  return true;
};
