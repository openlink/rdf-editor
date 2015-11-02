#!/bin/bash
#
#  Calculate version number for vad package based on the number of
#  commits since the last release
#
#  Copyright (C) 2015 OpenLink Software
#

export LC_ALL=C

# ======================================================================
#  CONFIGURATION
# ======================================================================
export STABLE=${STABLE-master}
export ORIGIN=${ORIGIN-origin}
export VAD_VERSION=${VAD_VERSION-0.1}
# ======================================================================


#
# If we have a local file vad_version then use contents as version
#
VERSION_DIR=`dirname $0`
if test -f "${VERSION_DIR}/vad_version"
then
    VAD_VERSION=`cat "${VERSION_DIR}/vad_version"`
fi


#
#  Check if we are actually inside a git tree,
#  else we return whatever version we found so far
#
GIT_DIR=`git rev-parse --git-dir 2>/dev/null || echo does_not_exist`
if test \! -d "$GIT_DIR"
then
    echo "ERROR: Not inside a git repository" >&2
    echo $VAD_VERSION
    exit 1
fi


#
#  If we use gitflow, we can get the real name for the stable branch
#
export STABLE_BRANCH=`git config gitflow.branch.master || echo ${STABLE}`


#
#  Get the remote name for the stable branch
#
export STABLE_REMOTE=`git config branch.${STABLE_BRANCH}.remote || echo ${ORIGIN}`


#
#  If the stable branch can be found, fetch its changes and tags without merging
#  else we may end up with the wrong information to calculate the version
#
git show-ref --verify --quiet refs/remotes/${STABLE_REMOTE}/${STABLE_BRANCH}
if test "$?" = "0"
then
    git fetch --quiet ${STABLE_REMOTE} ${STABLE} -t
else
    echo "Error: Unable to find ${STABLE_REMOTE}/${STABLE_BRANCH}" >&2
    echo "VAD_VERSION"
    exit 1
fi


#
#  Get number of commits between stable branch and current HEAD excluding merge records
#
GIT_V=`git rev-list --no-merges ${STABLE_REMOTE}/${STABLE}..HEAD | wc -l | sed -e 's/[ \t]*//g'`
if test "$GIT_V" != "0"
then
    VAD_VERSION="${VAD_VERSION}_git${GIT_V}"
fi

echo $VAD_VERSION

exit 0
