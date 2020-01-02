#
#  Use alpine based node 11 as our base image
#
FROM node:11-alpine


#
#  Setup default environment variables
#
ENV	NODE_ENV=production


#
#  Set arguments in GNUmakefile
#
ARG 	VERSION


#
#  Labels
#
LABEL   com.openlinksw.vendor	= "OpenLink Software"
LABEL   maintainer		= "OpenLink Support <support@openlinksw.com>"
LABEL   copyright		= "Copyright (C) 2020 OpenLink Software"
LABEL   version			= "$VERSION"
LABEL   description		= "OpenLink Structured Data Editor v$VERSION (Docker Image)"


#
#  Install the HTTP server
#
RUN	npm install -g http-server


#
#  The default directory for this application
#
WORKDIR	/opt/rdf-editor


#
#  Copy the application
#
COPY dist ./


#
#  Expose the TCP port for the service
#
EXPOSE	8080


#
#  Start the HTTP server
#
CMD ["http-server", ".", "--gzip", "--robots"]
