/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";
var getStorage = require("./index");


function StorageProxy(conf, options) {
  var volatileStorageMethods = [
    "setCode", "verifyCode",
    "setCodeWrongTry", "expireCode",
    "storeMSISDN", "getMSISDN",
    "setSession", "getSession"
  ];

  var persistentStorageMethods = [
    "setCertificateData", "getCertificateData"
  ];

  var proxyMethods = [
    "cleanSession", "drop", "ping", "setup"
  ];

  var volatileStorage = getStorage(conf.volatileStorageConf, options);
  var persistentStorage = getStorage(conf.persistentStorageConf, options);

  var self = this;

  function setupMethods(name, storage, methods) {
    methods.forEach(function(method) {
      if (typeof storage[method] !== "function") {
        var type = storage.constructor.name;
        throw new Error(type + " need a " + method +
                        " to be used as " + name + " storage.");
      }
      self[method] = storage[method].bind(storage);
    });
  }

  function setProxyMethods(_volatileStorage, _persistentStorage, methods) {
    methods.forEach(function(method) {
      var type;
      if (typeof _volatileStorage[method] !== "function") {
        type = _volatileStorage.constructor.name;
        throw new Error(type + " need a " + method +
                        " to be used as volatile storage.");
      }
      if (typeof _persistentStorage[method] !== "function") {
        type = _persistentStorage.constructor.name;
        throw new Error(type + " need a " + method +
                        " to be used as volatile storage.");
      }
      self[method] = function() {
        var args = Array.prototype.slice.call(arguments);
        var callback = args.pop();
        _volatileStorage[method].apply(_volatileStorage, args.concat([
          function() {
            var cbArgs = Array.prototype.slice.call(arguments);
            if (cbArgs[0]) {
              callback(cbArgs[0]);
              return;
            }
            _persistentStorage[method].apply(
              _persistentStorage, args.concat(callback));
          }
        ]));
      };
    });
  }

  setupMethods("volatile", volatileStorage, volatileStorageMethods);
  setupMethods("persistent", persistentStorage, persistentStorageMethods);
  setProxyMethods(volatileStorage, persistentStorage, proxyMethods);

  this.cleanVolatileData = volatileStorage.cleanSession.bind(volatileStorage);
}

module.exports = StorageProxy;
