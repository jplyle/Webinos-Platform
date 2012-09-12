var http = require('http');
var url = require('url');
var util = require('util');
var wsClient = require('websocket').client;

var webinosclient = exports;

var WS_PROTOCOL = "webinos";
var PZP_NAME = "pz-client";

webinosclient.connect = function(host, port, msgHandler) {
    var channel =  new wsClient();

    channel.connect("ws://" + host + ":" + port, WS_PROTOCOL, PZP_NAME);

    channel.on('connect', function(connection) {
        console.log("Connected web socket");
        connection.on('message', function(ev) {
            var data = JSON.parse(ev[ev.type+"Data"]);
            console.log("WebSocket Client: Message Received : " + util.inspect(data));            
            msgHandler(connection, data);
        });
    });    
}

