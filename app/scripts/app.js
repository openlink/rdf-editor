'use strict';

// Declare app level module which depends on views, and components
angular.module('myApp', [
  'ngRoute',
  'angularSpinner',
  'myApp.welcome',
  'myApp.editor',
  'myApp.fileBrowser'
])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.otherwise({redirectTo: '/welcome'});
}])

.run(function($rootScope) {
  $rootScope.version = '##VERSION##';
})

.factory('Notification', function() {
  // set defaults
  $.notifyDefaults({
    "allow_dismiss": true,
    "placement": {
      "from": 'top',
      "align": 'center'
    },
    "template": ' \
      <div data-notify="container" class="col-xs-11 col-sm-6 alert alert-{0}" role="alert">\
      	<button type="button" aria-hidden="true" class="close" data-notify="dismiss">×</button>\
      	<span data-notify="icon"></span>\
      	<span data-notify="title">{1}</span>\
      	<span data-notify="message">{2}</span>\
      	<div class="progress" data-notify="progressbar">\
      		<div class="progress-bar progress-bar-{0}" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%;"></div>\
      	</div>\
      	<a href="{3}" target="{4}" data-notify="url"></a>\
      </div>',
    "z_index": 1050
  });

  function notify(type, msg, icon) {
    if (type === 'error') {
      type = 'danger';
    }
    var o = {
      "type": type
    };
    if (type === 'danger') {
      if (o.delay === undefined) {
        o.delay = 0;
      }
      if (!icon) {
        icon = 'fire';
      }
    }
    if (icon) {
      o.icon = "glyphicon glyphicon-" + icon;
    }

    $.notify(msg, o);
  }

  return {
    notify: notify
  };
})

.controller('AuthInfoDialogCtrl', ["$scope", "$uibModalInstance", "url", function($scope, $uibModalInstance, url) {
  $scope.username = "";
  $scope.password = "";
  $scope.url = url;

  $scope.ok = function() {
    $uibModalInstance.close({
      username: $scope.username,
      password: $scope.password
    });
  };

  $scope.cancel = function() {
    $uibModalInstance.dismiss();
  };
}])

.factory('DocumentTree', ['$q', "$uibModal", 'usSpinnerService', 'WebID', 'RDFEConfig', function($q, $uibModal, usSpinnerService, WebID, RDFEConfig) {
  var locations = [],
      storages = [],
      authCache = {};

  /**
   * Authentication function which requests a username and pwd from the user
   * to provide to the @p success function. If the user canceles the @p fail
   * callback will be invoked instead.
   */
  function getAuthInfo(url, forceUpdate) {
    var cached = authCache[url];
    // try the parent folder in case we have that
    // FIXME: how about mapping into locations and then attaching the cached auth info directly to the RDFE.IO.Resource objects
    if (!cached && url[url.length-1] !== '/') {
      cached = authCache[url.substring(0, url.lastIndexOf('/')+1)];
    }
    if (forceUpdate !== false && (forceUpdate === true || !cached)) {
      return $q(function(resolve, reject) {
        usSpinnerService.stop('editor-spinner');
        $uibModal.open({
          templateUrl: 'tmpl/authinfodlg.html',
          controller: 'AuthInfoDialogCtrl',
          resolve: {
            url: function() {
              return url;
            }
          }
        }).result.then(function(result) {
          authCache[url] = result;
          resolve(result);
        }, reject);
      });
    }
    else {
      return $q.when(cached);
    }
  }

  function loadRecentDocs() {
    var r = new RDFE.IO.Folder();

    r.name = r.path = "Recent Documents";
    r.ioType = 'recent';
    r.comment = 'Documents you recently opened';
    r.children = getRecentDocs();

    return r;
  }

  function getRecentDocs() {
    var files = [];
    var items = $.jStorage.get('rdfe:recentDocuments');

    if (items) {
      for (var i = 0; i < items.length && i < 10; i++) {
        var item = items[i];
        if (item) {
          var file = new RDFE.IO.File(item.url);
          file.ioType = item.ioType;
          file.name = item.title || item.name;
          file.sparqlEndpoint = item.sparqlEndpoint;
          files.push(file);
        }
      }
    }
    return files;
  }

  function getRecentLocations() {
    var folders = [];
    var items = $.jStorage.get('rdfe:recentLocations');

    if (items) {
      for (var i = 0; i < items.length && i < 10; i++) {
        var item = items[i];
        if (item) {
          var folder;
          if (item.ioType === 'webdav') {
            folder = new RDFE.IO.WebDavFolder(item.url);
          }
          else if (item.ioType === 'ldp') {
            folder = new RDFE.IO.LDPFolder(item.url);
          }
          else {
            folder = new RDFE.IO.Folder(item.url);
          }
          folders.push(folder);
        }
      }
    }
    return folders;
  }

  function getLocations() {
    // if we already extracted the profile locations just return them
    if (locations.length)
      return $q.when(locations);

    // extract the locations from the profile
    locations = getRecentLocations();
    locations.unshift(loadRecentDocs());

    return $q(function(resolve, reject) {
      RDFEConfig.getConfig().then(function(config) {
        var storage = config.options.storage || [];
        if (storage.length) {
          RDFE.Utils.resolveStorageLocations(storage, function(files) {
            $.merge(locations, files);
            resolve(locations);
          });
        }
        else {
          resolve(locations);
        }
      }, function() {
        resolve(locations);
      });
    });
  }

  function getStorages() {
    // if we already extracted the profile locations just return them
    if (storages.length)
      return $q.when(storages);

    // extract the locations from the profile
    return $q(function(resolve, reject) {
      WebID.getWebID().then(function() {
        return WebID.getProfile();
      }).then(function(profile) {
        var storage = [];
        var profileStorage = profile.storage || [];
        for (var i = 0; i < profileStorage.length; i++) {
          if (_.isEmpty(_.where(storage, {"uri": profileStorage[i].uri}))) {
            storage = storage.concat(profileStorage[i]);
          }
        }
        if (storage.length) {
          RDFE.Utils.resolveStorageLocations(storage, function(files) {
            $.merge(storages, files);
            resolve(storages);
          });
        }
        else {
          resolve(storages);
        }
      })
    });
  }

  function addRecentDoc(url, ioType) {
    var notFound = true;
    var items = $.jStorage.get('rdfe:recentDocuments') || [];
    var item;

    for (var i = 0; i < items.length; i++) {
      item = items[i];
      if ((item.url === url) && (item.ioType === ioType)) {
        notFound = false;
        items.splice(i, 1);
        items.unshift(item);
        break;
      }
    }

    if (notFound) {
      item = new RDFE.IO.File(url);
      item.ioType = ioType;
      items.unshift(item);
      if (items.length > 10) {
        items.splice(items.length-1, 1);
      }
    }

    $.jStorage.set('rdfe:recentDocuments', items);
  }

  function addRecentLocation(url, ioType) {
    if (ioType === 'recent')
      return;

    var notFound = true;
    var items = $.jStorage.get('rdfe:recentLocations') || [];
    var item;

    for (var i = 0; i < items.length; i++) {
      item = items[i];
      if ((item.url === url) && (item.ioType === ioType)) {
        notFound = false;
        items.splice(i, 1);
        items.unshift(item);
        break;
      }
    }

    if (notFound) {
      item = new RDFE.IO.Folder(url);
      item.ioType = ioType;
      items.unshift(item);
      if (items.length > 10) {
        items.splice(items.length-1, 1);
      }
    }

    $.jStorage.set('rdfe:recentLocations', items);
  }

  function deleteRecentLocation(url, ioType) {
    if (ioType === 'recent')
      return;

    var items = $.jStorage.get('rdfe:recentLocations') || [];

    for (var i = 0; i < items.length; i++) {
      if ((items[i].url === url) && (items[i].ioType === ioType)) {
        items.splice(i, 1);
        $.jStorage.set('rdfe:recentLocations', items);

        return;
      }
    }
  }

  function selectRecentLocation(url, ioType) {
    if (ioType === 'recent')
      return;

    var items = $.jStorage.get('rdfe:recentLocations') || [];
    var item;

    for (var i = 0; i < items.length; i++) {
      item = items[i];
      if ((item.url === url) && (item.ioType === ioType)) {
        items.splice(i, 1);
        items.unshift(item);
        $.jStorage.set('rdfe:recentLocations', items);

        return;
      }
    }
  }

  // Service API
  return {
    "getLocations": getLocations,
    "getStorages": getStorages,
    "getAuthInfo": getAuthInfo,
    "getRecentDocs": getRecentDocs,
    "addRecentDoc": addRecentDoc,
    "getRecentLocations": getRecentLocations,
    "addRecentLocation": addRecentLocation,
    "deleteRecentLocation": deleteRecentLocation,
    "selectRecentLocation": selectRecentLocation
  };
}])

.factory('RDFEConfig', ['$q', 'Notification', function($q, Notification) {
  var config = null;

  function getConfig() {
    if(config) {
      return $q.when(config);
    }
    else {
      return $q(function(resolve, reject) {
        var urlParams = RDFE.Utils.uriParams();
        var configSource = (urlParams['config'])? urlParams['config']: 'config.json';
        config = new RDFE.Config(configSource, function(config) {
          resolve(config);
        }, function() {
          Notification.notify('error', 'Failed to load Editor configuration');
        });
      });
    }
  }

  return {
    getConfig: getConfig
  };
}])

.factory('WebID', ['$q', 'Notification', function($q, Notification) {
  var webid = null;
  var profile = null;

  function getWebID() {
    var self = this;

    if (webid)
      return $q.when(webid);

    return $q(function(resolve, reject) {
      if (location.protocol == 'chrome-extension:') {
        var opl_youid_id = null;

        chrome.management.getAll(function(ext_info) {
          // try get ID for YoudID extension
          for (var i = 0; i < ext_info.length; i++) {
            if (ext_info[i].shortName === "opl_youid") {
              opl_youid_id = ext_info[i].id;
              break;
            }
          }

          if (opl_youid_id) {
            chrome.runtime.sendMessage(opl_youid_id, {"getWebId": true},
              function(response) {
                if (response)
                  webid = JSON.parse(response.webid).id;

                if (webid) {
                  resolve(webid);
                }

            });
          }
        });
      }
      else {
        function recvMessage(event) {
          var ev_data;

          if (String(event.data).lastIndexOf("youid_rc:", 0) !== 0){
            return;
          }

          try {
            ev_data = JSON.parse(event.data.substr(9));
          } catch(e) {}

          if (ev_data && ev_data.webid) {
            // we have received WebID from YouID extension
            webid = ev_data.webid;
            resolve(webid);
          }
        }
        window.addEventListener("message", recvMessage, false);
        window.postMessage('youid:{"getWebId": true}', "*");
      }
    });
  }

  function getProfile() {
    var self = this;

    if (!webid)
      return $q.reject();

    if (profile)
      return $q.when(profile);

    return $q(function(resolve, reject) {
      $.get(webid)
        .done(function(data) {
          if (profile)
            return resolve(profile);

          new rdfstore.create(function(error, store) {
            var baseURI = webid.split("#")[0];
            store.registerDefaultProfileNamespaces();
            store.load('text/n3', data, {"documentIRI": baseURI}, function(error, result) {
              if (error)
                reject("Failed to load the profile contents.");

              store.execute(
                'select ?uri ?name ?img ?nick where {?x foaf:primaryTopic ?uri . optional { ?uri foaf:name ?name . } . optional { ?uri foaf:nick ?nick . } . optional { ?uri foaf:img ?img . } . }',
                function(error, result) {
                  // console.log(result);
                  if (error)
                    reject("Failed to load the profile contents.");

                  var p = {"uri": webid};
                  if (result.length !== 0) {
                    if (result[0].name) {
                      p.name = result[0].name.value;
                    }
                    if (result[0].img) {
                      p.image = result[0].img.value;
                    }
                    if (result[0].nick) {
                      p.nick = result[0].nick.value;
                    }
                  }

                  store.execute(
                    'select ?storage where { <' + webid + '> <http://www.w3.org/ns/pim/space#storage> ?storage . }',
                    function(error, result) {
                      if (error)
                        reject("Failed to load the profile contents.");

                      for (var i = 0; i < result.length; i++) {
                        if (result[i].storage) {
                          (p.storage = p.storage || []).push({
                            "uri": result[i].storage.value
                          });
                        }
                      }

                      store.execute(
                        'select ?namedGraph ?sparqlEndpoint where { <' + webid + '> <http://www.openlinksw.com/schemas/cert#hasDBStorage> ?namedGraph . ?namedGraph <http://rdfs.org/ns/void#sparqlEndpoint> ?sparqlEndpoint . }',
                        function(error, result) {
                          if (error)
                            reject("Failed to load the profile contents.");

                          for (var i = 0; i < result.length; i++) {
                            if (result[i].namedGraph && result[i].sparqlEndpoint) {
                              (p.storage = p.storage || []).push({
                                "uri": result[i].namedGraph.value,
                                "sparqlEndpoint": result[i].sparqlEndpoint.value
                              });
                            }
                          }

                          profile = p;
                          resolve(profile);
                        }
                      );
                    }
                  );
                }
              );
            });
          });
        })
        .fail(function(data, status, xhr) {
          reject("Failed to load the profile contents.");
        });
    });
  }

  return {
    "getWebID": getWebID,
    "getProfile": getProfile
  };
}])

.controller('AuthHeaderCtrl', ['$rootScope', '$scope', 'WebID', function($rootScope, $scope, WebID) {

  function saveDocument() {
    if ($rootScope.editor && $rootScope.editor.doc && $rootScope.editor.doc.dirty) {
      var doc = $rootScope.editor.doc;
      doc.store.graph(doc.graph, function(success, result) {
        if (success) {
          var content = result.toNT();
          $.jStorage.set('rdfe:savedDocument', content);
        }
      });
    }
  }

  WebID.getWebID().then(function() {
    return WebID.getProfile();
  }).then(function(profile) {
    $scope.profile = profile;
  });

}]);
