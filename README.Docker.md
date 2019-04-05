# OpenLink Structured Data Editor - Docker

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**

- [Introduction](#introduction)
- [License](#license)
- [Quickstart](#quickstart)
- [See Also](#see-also)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


##  Introduction
The [OpenLink Structured Data Editor](http://osde.openlinksw.com/) (or OSDE) is a tool for
creating and editing structured data using RDF Language statements/triples using a browser.

OSDE enables the creation and editing of data using abstract **subject** &rightarrow; **predicate**
&rightarrow; **object** or **entity** &rightarrow; **attribute** &rightarrow; **value** notations.

OSDE can currently ingest RDF from documents serialised as
[RDF-Turtle](http://dbpedia.org/resource/Turtle_(syntax)),
[JSON-LD](http://dbpedia.org/resource/JSON-LD) and [RDF/XML](http://dbpedia.org/resource/RDF/XML).

Documents can be saved to either local or remote storage or directly copied as RDF-Turtle
documents.


## License
Copyright 2014-2019 [OpenLink Software](mailto:opensource@openlinksw.com)

This software is licensed under the GNU General Public License (see
[COPYING](http://github.com/openlink/rdf-editor/blob/develop/COPYING)).

**Note**: that the only valid version of the GPL license as far as this project is concerned
is the original GNU General Public License Version 2, dated June 1991.


## Quickstart
First we need to pull the docker image to our local system using the following command:

    $ docker pull openlink/osde

Now we can start the image using the following command:

    $ docker run -i -t -p 8081:8080 openlink/osde

This instantiates the docker container on your computer, starts a small http server
inside the container which starts to listen on TCP port 8080.  The command then maps TCP port 8081 on
your computer to this http server which hosts the OSDE application.

You now can connect to this docker container by opening the following URL in your favourite
browser: http://localhost:8081/.

The [OSDE website](http://osde.openlinksw.com) has a good tutorial on [how to
use OSDE](http://osde.openlinksw.com/#How_do_I_use_OSDE) including some [screen
casts](http://osde.openlinksw.com/#UsageScreencasts).


## See Also
  - [OSDE website](http://osde.openlinksw.com/)
  - [Github project](https://github.com/openlink/rdf-editor/)
  - [Docker repository](https://cloud.docker.com/repository/docker/openlink/osde/)
  - [OpenLink website](https://www.openlinksw.com/)
