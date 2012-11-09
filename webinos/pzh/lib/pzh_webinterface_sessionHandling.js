var tls = require("tls"),
  fs = require("fs"),
  path = require("path"),
  crypto = require("crypto"),
  util = require("util");

if (typeof exports !== "undefined") {
  try {
    var webinos        = require("find-dependencies")(__dirname);
    var session        = webinos.global.require(webinos.global.pzp.location, "lib/session");
    var rpc            = webinos.global.require(webinos.global.rpc.location);
    var Registry       = webinos.global.require(webinos.global.rpc.location, "lib/registry").Registry;
    var Discovery      = webinos.global.require(webinos.global.api.service_discovery.location, "lib/rpc_servicedisco").Service;
    var MessageHandler = webinos.global.require(webinos.global.manager.messaging.location, "lib/messagehandler").MessageHandler;
    var RPCHandler     = rpc.RPCHandler;
    var logging        = webinos.global.require(webinos.global.util.location, "lib/logging.js") || console;
    var authcode       = require("./pzh_authcode");
    var pzhapis        = require("./pzh_internal_apis");
    
  } catch (err) {
    console.log("webinos modules missing, please check webinos installation" + err);
    return;
  }
}

/* This module handles connections coming from the PZH Provider's Web Interface
 * In essence, it will feed the web interface with data about the personal
 * zone and respond to authentication, enrollment and certificate exchange
 * requests.
 */

var pzhWI = function(pzhs) {


    this.handleAuthorization = function(conn) {
        console.log("handling Web Interface authorisation");
        console.log("PZHs: " + util.inspect(pzhs));
    }
    
    this.handleData = function(conn, data) {
        console.log("handling Web Interface data");    
        try {
          conn.pause();
          session.common.readJson(this, data, function(obj) {
            processMsg(conn, obj);
          });
        } catch (err) {
          console.log("exception in processing received message " + err);
        } finally {
          conn.resume();
        }
    }

    function processMsg(conn, obj) {
        console.log(util.inspect(obj));    
    }

    function findUserFromEmail(email) {
        for (var p in pzhs) {
            if (pzhs[p].getUserDetails().email === email) {
                return pzhs[p];
            }
        }
        return null;
    }

}


module.exports = pzhWI;
