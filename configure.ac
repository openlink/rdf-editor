define([RDF_EDITOR_VERSION], [esyscmd([./gen_version.sh | sed -e 's/_git.*//' | tr -d '\n'])])

AC_INIT([rdf-editor], [RDF_EDITOR_VERSION], [opensource@openlinksw.com])
AM_INIT_AUTOMAKE([foreign])
AM_MAINTAINER_MODE

# --------------------------------------------------------------
#  Save configuration for later reuse
# --------------------------------------------------------------
echo creating config.nice
rm -f config.nice
cat >config.nice<<CONFIG_NICE_EOF
#!${SHELL-/bin/sh}
#
# Created by configure for $PACKAGE_STRING
#

# Environment
CONFIG_NICE_EOF
for var in SHELL CFLAGS CXXFLAGS CPPFLAGS LDFLAGS INCLUDES LIBS CC CXX
do
    eval val=\$$var
    if test -n "$val"
    then
        echo "$var=\"$val\"; export $var" >> config.nice
    fi
done

echo "" >> config.nice
echo ${SHELL} "\"$0\" \\" >> config.nice

eval "set -- $ac_configure_args"

for arg
do
    echo "\"$arg\" \\" >> config.nice
done

echo '"$@"' >> config.nice
chmod +x config.nice



# --------------------------------------------------------------
# Check for python (vadpacker)
# --------------------------------------------------------------
AM_PATH_PYTHON([2.5])


# --------------------------------------------------------------
# Check for vadpacker as distributed with Virtuoso
# Allow a manual override
# --------------------------------------------------------------
AC_ARG_WITH(
  [vadpacker],
  [AS_HELP_STRING(
    [--with-vadpacker=PATH],
    [Specify the full path to the vadpacker script to use. If not provided configure will search the PATH.])],
  [VADPACKER="${withval}"],
  [
    AC_PATH_PROG([VADPACKER], [vadpacker.py], notfound, ["./vadpacker:$PATH"])
  ])

if test \! -x "$VADPACKER" ; then
  AC_MSG_ERROR([cannot find vadpacker.py. Consider using --with-vadpacker=<PATH>.])
fi


# --------------------------------------------------------------
# Allow to specify the installation vad dir
# --------------------------------------------------------------
AC_ARG_WITH(
  [vaddir],
  [AS_HELP_STRING(
    [--with-vaddir=PATH],
    [Specify the full path to where the vad packages should be installed. Defaults to DATADIR/virtuoso/vad.])],
  [vaddir=${withval}],
  [vaddir=$datadir/virtuoso/vad])


# Make all required variables available
AC_SUBST([vaddir])

AC_CONFIG_FILES([Makefile])

AC_OUTPUT

echo ""
echo "Configuration results:"
echo "----------------------"
echo "VAD version:   $PACKAGE_VERSION"
echo "Python:        $PYTHON ($PYTHON_VERSION)"
echo "Vadpacker:     $VADPACKER"
echo ""
