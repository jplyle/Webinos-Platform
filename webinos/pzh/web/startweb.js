var util = require('util'),
    path = require('path'),
    crypto = require('crypto'),
    fs = require('fs'),
    net = require("net");

var webinos = require("find-dependencies")(__dirname),
    logger = webinos.global.require(webinos.global.util.location, "lib/logging.js")(__filename) || logger,
    session = webinos.global.require(webinos.global.pzp.location, "lib/session"),
    pzhproviderweb = require('./app.js');

var argv = require('optimist')
    .usage('Usage: $0 --host = [host] --name = [name] (host is the domain of the server, name is the friendly name)')
    .default ('host', "")
    .default ('name', "")
    .argv;

var starter = exports;

starter.startWS = function (hostname, config, callback) {
    "use strict";
    setHostName(hostname, function (address) {
        loadWebServerCertificates(config, function (status, connParam) {
            logger.log("starting the web server on " + config.userPref.ports.provider_webServer);
            pzhproviderweb.startWebServer(hostname, address, config.userPref.ports.provider_webServer, connParam, function (status, value) {
                if (status) {
                    logger.log("Personal zone provider web server started");
                    return callback(true);
                } else {
                    logger.log("Personal zone provider web server failed to start on port " + config.userPref.ports.provider_webServer + ", " + value);
                    return callback(false, value);
                }
            });
        });
    });
};

function loadWebServerCertificates(config, callback) {
    if (!config.cert.internal.web.cert) {
        var cn = "PzhWS" + ":" + config.metaData.serverName;
        config.generateSelfSignedCertificate("PzhWS", cn, function (status, value) {
            if (status) {
                config.generateSignedCertificate(value, 2, function (status, value) {
                    if (status) {
                        config.cert.internal.web.cert = value;
                        config.storeCertificate(config.cert.internal, "internal");
                        setParam(config, function (status, wss) {
                            if (status) {
                                return callback(true, wss);
                            } else {
                                return callback(false);
                            }
                        });
                    } else {
                        return callback(false, value);
                    }
                });
            } else {
                return callback(false, value);
            }
        });
    } else {
        setParam(config, function (status, wss) {
            if (status) {
                return callback(true, wss);
            } else {
                return callback(false);
            }
        });
    }
}

function setParam(config, callback) {
    var key_id = config.cert.internal.web.key_id;
    config.fetchKey(key_id, function (status, value) {
        if (status) {
            callback(true, {
                key: value,
                cert: config.cert.internal.web.cert,
                ca: config.cert.internal.master.cert,
                requestCert: true,
                rejectUnauthorised: false //TODO
            });
        } else {
            callback(false)
        }
    });
}

/**
 * Fetches the public IP address if hostname is not specified
 * @param callback :
 */
function setHostName(hostname, callback) {
    if (hostname === undefined || hostname === null || hostname === "") {
        var socket = net.createConnection(80, "www.google.com");
        socket.on('connect', function () {
            socket.end();
            hostname = socket.address().address;
            return callback(hostname);
        });
        socket.on('error', function () { // Assuming this will happen as internet is not reachable
            hostname = "0.0.0.0";
            return callback(hostname);
        });
    } else {
        callback(hostname);
    }
}

function start(hostname, friendlyName) {
    var config = new session.configuration();
    config.setConfiguration(friendlyName, "PzhP", hostname, function (status, value) {
        if (!status) {
            logger.error(value);
            logger.error("setting configuration for the zone provider failed, the .webinos directory needs to be deleted.")
        } else {
            starter.startWS(hostname, config, function (err, val) {
                //meh.
            });
        }
    });
}

start(argv.host, argv.name);
