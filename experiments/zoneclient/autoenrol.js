var webinosclient = require('./webinosclient.js');
var webinosmsgs = require('./webinosmessages.js');
var webinoshandler = require('./webinoshandler.js');
var util = require('util');

var PROP = 'prop';
var REGISTER = 'registeredBrowser';
var GEO_API = "http://www.w3.org/ns/api-perms/geolocation";

webinosclient.connect('localhost', 8081, function(session, msg) {
    webinoshandler.handleMessage(session, msg, main);
});

function main(session) {
    webinosmsgs.makeRegisterMsg(webinoshandler.status, function(msg) {
        webinoshandler.send(msg, null, function() {
            useWebinos();
        });
    }); 
}

/* Edit from here */





function useWebinos() {
    webinosmsgs.makeEnrolMsg(webinoshandler.status, "129.67.150.227/JohnLyle/", "3UybKcuKkhw=", function(msg) {
    
        webinoshandler.send(
            msg,
            function(response, original) {
                console.log("Response! " + util.inspect(response));
            },
            function() {
    
            }
        );
        
        
    });    
}


function findServices(criteria, cb) {
    webinosmsgs.makeServiceDiscoveryMsg(webinoshandler.status, criteria, function(discoveryMsg) {
        webinoshandler.send(discoveryMsg, 
            function(response, original) {
                cb(response);
            }, 
            function() { 
                // Do nothing  
            }   
        );
    });  
}


function invokeAPI(service, method, args, cb) {
    //create and send a message.
    webinosmsgs.makeInvokeMsg(
        webinoshandler.status, 
        service.api, 
        service.id, 
        method, 
        args, 
        function(msg) {
            webinoshandler.send(msg, 
                function(reply, orig) {
                    cb(reply,orig);
                }, 
                function() { }
            );
        }
    );
}


