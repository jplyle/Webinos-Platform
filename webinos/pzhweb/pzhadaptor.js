var path            = require('path'),
    util            = require('util'),
    crypto          = require('crypto'),
    fs              = require('fs');
    
var webinos = require("find-dependencies")(__dirname),
    logger   = webinos.global.require(webinos.global.util.location, "lib/logging.js")(__filename) || logger,
    pzhtls  = require('./realpzhtls.js');    


var pzhadaptor = exports;

pzhadaptor.getZoneStatus = function(user, res) {
    pzhtls.send(user, 
        {
            type : "getZoneStatus"
        }, 
        {
            err: function(err) {
                logger.log("Failed to get zone status");
            },
            success: function(val) {
                res.json(val);
            }
    });
}

pzhadaptor.approveFriend = function(user, externalEmail) {
    pzhtls.send(user, {type:"approveFriend", externalEmail:externalEmail}, {
        err : function(err) { 
            console.log(err);
        },
        success : function(val) {

        }
    });
}

pzhadaptor.rejectFriend = function(user, externalEmail) {
    pzhtls.send(user, {type:"rejectFriend", externalEmail:externalEmail}, {
        err : function(err) { 
            console.log(err);
        },
        success : function(val) {

        }
    });
}


pzhadaptor.getRequestingExternalUser = function(user, externalEmail, cb) {
    pzhtls.send(user, {type:"getExpectedExternal", externalEmail:externalEmail}, {
        err : function(err) { 
            console.log(err);
            cb(false);
        },
        success : function(val) {
            cb(val);
        }
    });
}

pzhadaptor.setExpectedExternalUser = function(user, externalEmail, externalPzh, externalCerts) {
    pzhtls.send(user, {type:"setExpectedExternal", externalEmail:externalEmail, externalPzh:externalPzh, externalCerts: externalCerts}, {
        err : function(err) { 
            //do nothing
        },
        success : function(val) {
            //do nothing
        }
    });
}

//unauthenticated input
pzhadaptor.setRequestingExternalUser = function(internaluser, externaluser, externalPzhDetails) {
    var user = getUserFromEmail(internaluser, function(user, err) {
        pzhtls.send(user, {type:"requestAddFriend", externalUser:externaluser, externalPzh:externalPzhDetails}, {
            err : function(err) { 
                //do nothing
            },
            success : function(val) {
                //do nothing
            }
        });
    });
}



pzhadaptor.fromWebUnauth = function(userEmail, body, res) {

    // we've received a request from the web interface over XHR.
    // translate and send to the PZH TLS server
    
    //it's not necessarily from a trusted or authenticated user, it's a public
    //request for something.  E.g., for our certificates.
    //first, check that the user is meaningful
    
    var user = getUserFromEmail(userEmail, function(result, err) {
        if (err) {
            res.writeHead(200);
            res.end('Request failed: ' + err);
            return;
        } else {
            switch (body.type) {
                case "certificates":
                    pzhtls.send(user, {type:"certificates"}, responseCertHandler(res));
                    break;
                default:
                    res.writeHead(200);
                    res.end('Request failed: ' + err);
            }
        }
    });
}


function getUserFromEmail(userEmail, cb) {
    //TODO
    cb(userEmail, false);
}




pzhadaptor.fromWeb = function(user, body, res) {

    // we've received a request from the web interface over XHR.
    // translate and send to the PZH TLS server
    
    if (typeof(body.payload) === 'undefined') {
        manageStatus(body.cmd, user, res);
    } else { 
        manageStatus(body.payload, user, res);
    }
}

function responseCertHandler(res) {
    return {
        err : function(err) {
            logger.log(err);
            res.status(500);
        },
        success : function(val) {
            var result = val;
            res.json(result);
        }
    }
}

function responseHandler(status, res) {
    return {
        err : function(err) {
            logger.log(err);
            res.status(500);
        },
        success : function(val) {
            var result = { payload : val };
            result.status = "";
            result.cmd = status;
            res.json(result);
        }
    }
}


function manageStatus(payload, user, res) {
    switch (payload.status) {
      case 'listDevices':
          pzhtls.send(user, {type:"getZoneStatus"}, responseHandler(payload.status, res));
        break;
      case 'userDetails':
          pzhtls.send(user, {type:"getUserDetails"}, responseHandler(payload.status, res));
        break;
      case 'crashLog':
          pzhtls.send(user, {type:"getCrashLog"}, responseHandler(payload.status, res));
        break;
      case 'infoLog':
          pzhtls.send(user, {type:"getInfoLog"}, responseHandler(payload.status, res));
        break;
      case 'pzhPzh':
//        instance.addOtherZoneCert(query.payload.message, parent.fetchPzh, parent.refreshCert, result);
        break;
      case 'listPzp':
          pzhtls.send(user, {type:"getPzps"}, responseHandler(payload.status, res));
        break;
      case 'revokePzp':
          pzhtls.send(user, {type:"revokePzp", pzpid: payload.pzpid}, responseHandler(payload.status, res));
//        instance.revokeCert(query.payload.pzpid, parent.refreshCert, result);
        break;
      case 'addPzp':
          pzhtls.send(user, {type:"addPzp"}, responseHandler(payload.status, res));
        break;
      case 'login':
        pzhtls.send(user, {type:"hasLoggedIn"}, responseHandler(payload.status, res));                  
      case 'logout':
        pzhtls.send(user, {type:"hasLoggedOut"}, responseHandler(payload.status, res));            
        break;
      case 'listAllServices':
        pzhtls.send(user, {type:"listAllServices"}, responseHandler(payload.status, res));
//        pzh_api.listAllServices(instance, result);
        break;
      case 'listUnregServices':
        pzhtls.send(user, {type:"listUnregServices"}, responseHandler(payload.status, res));
//        pzh_api.listUnregServices(instance, query.at, result);
        break;
      case 'registerService':
        pzhtls.send(user, {type:"registerService", name: payload.name}, responseHandler(payload.status, res));
//        pzh_api.registerService(instance, query.at, query.name, result);
        break;
      case 'unregisterService':
        pzhtls.send(user, {type:"unregisterService", svId: payload.svId, svAPI: payload.svAPI }, responseHandler(payload.status, res));
//        pzh_api.unregisterService(instance, query.at, query.svId, query.svAPI, result);
        break;
    }
}



