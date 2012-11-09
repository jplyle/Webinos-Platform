var tls = require('tls'),
    util = require('util');

var webinos = require("find-dependencies")(__dirname),
    session = webinos.global.require(webinos.global.pzp.location, "lib/session"),
    logger  = webinos.global.require(webinos.global.util.location, "lib/logging.js")(__filename) || logger;

var realpzhtls = exports;

var connection;

realpzhtls.init = function(config, webOptions, handler, cb) {
    var tlsServerOptions = {
        host : config.metaData.serverName,
        port : config.userPref.ports.provider,
        key : webOptions.key, //TODO: wont be this key
        cert: webOptions.cert, //TODO: wont be this cert
        ca : null, // TODO: Get the TLS server's certificate
        rejectUnauthorised: false //TODO: set to true
    }    
    connection = tls.connect(tlsServerOptions, function() {
        logger.log("Connected to the PZH TLS server");
        cb(true, connection);
    });
    
    connection.setEncoding("utf8");
    
    connection.on("data", function(data) {
        logger.log(data);
        handler(data);
    });
    
    connection.on("error", function(err) {
        logger.error(err);
        cb(false, err);
    });

}

realpzhtls.send = function(user, message, callback) {
    var realMsg = {
        user : user,
        message : message
    }
    var jsonString = JSON.stringify(realMsg);
    var buf = session.common.jsonStr2Buffer(jsonString);
    sendInner(buf, callback);
}

function sendInner(buf, callback) {
    try {
        connection.write(buf);
        connection.resume();
        callback.success();
    } catch (err) {
        logger.error("Failed to send a message to the PZH TLS Server: " + err);
        callback.err("Failed to send a message to the PZH TLS Server");
    }
}
