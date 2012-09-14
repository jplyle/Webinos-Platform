var webinosclient = require('./webinosclient.js');
var webinosmsgs = require('./webinosmessages.js');
var webinoshandler = require('./webinoshandler.js');
var util = require('util');
var express = require('express');

var PROP = 'prop';
var REGISTER = 'registeredBrowser';
var GEO_API = "http://www.w3.org/ns/api-perms/geolocation";

webinosclient.connect('localhost', 8081, function(session, msg) {
    webinoshandler.handleMessage(session, msg, main);
});

function main(session) {
    webinosmsgs.makeRegisterMsg(webinoshandler.status, function(msg) {
        webinoshandler.send(msg, null, function() {
            startServer();
        });
    }); 
}

function startServer() {
    var app = express();
    var svclist = [];
    
    getAllServices(svclist);
    
    app.engine('.html', require('ejs').__express);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'html');

    app.use(express.static(__dirname + '/public'));
    
    app.get('/', function(req,res) {
        getRoot(req,res)
    });
    
    app.get('/refresh', function(req,res) {
        getAllServices(svclist);
        res.send(
        "<html><head></head><body>" + 
            "<p>Services refreshing..., try <a href=\"list\">here</a></p>" +    
        "</body></html>");
    });
    
    app.get('/list', function(req,res) {
       listServices(res, svclist);
    });
    app.get('/service', function(req,res) {
       listServices(res, svclist);
    });
    
    app.get('/intent-register', function(req,res) {
       listIntents(res, svclist);
    });
    
    app.get('/service/:service', function(req, res) {
        getServiceInfo(req,res,svclist);
    });



    app.get('/service/:service/intent/:intentname', function(req, res) {
        handleIntent(req,res,svclist);    
    });
    
    app.get('/service/:service/intent/:intentname/do', function(req, res) {
        handleIntentDo(req,res,svclist);    
    });
        

    app.get('/service/:service/json/:method', function(req, res) {
        handleInvokeJSON(req,res,svclist);    
    });
    
    app.get('/service/:service/:method', function(req, res) {
        handleInvoke(req,res,svclist);    
    });
    
    app.get('/service/:service/response/:msgid', function(req, res) {
        handleReplyMessages(req,res,svclist);    
    });

    app.listen(3000);
    console.log("Listening on port 3000");

}


function listIntents(res, svclist) {
    res.render("intent-register", { services : svclist });
}


function handleIntent(req,res,svclist) {
    var service = req.params.service;
    var intentname = req.params.intentname;
    if (!(service in svclist)) {
        res.send(404, "Sevice " + service + " not found");
        return;
    }
    service = svclist[req.params.service];
    
    getIntentReply(service, intentname, function(reply) {

        res.render("intent", {
                "service" : service,
                "intentname" : intentname,
                "reply" : reply
            });
    
    })
}


function handleIntentDo(req,res,svclist) {
    var service = req.params.service;
    var intentname = req.params.intentname;
    if (!(service in svclist)) {
        res.send(404, "Sevice " + service + " not found");
        return;
    }
    service = svclist[req.params.service];
    
    res.render("intent-service", {
        "service" : service,
        "intentname" : intentname,
    });
    
}


function getIntentReply(service, intentname, cb) {
    cb(null);
/*
    if (service.api === GEO_API) {
            
        invokeAPI(service, "getCurrentPosition", {}, function(reply, orig) {
            cb(reply);
        });
        
    } else {
        cb("No reply message");
    }
*/
}



function handleReplyMessages(req,res,svclist) {
    var service = req.params.service;
    var msgid = req.params.msgid;
    if (!(service in svclist)) {
        res.send(404, "Sevice " + service + " not found");
        return;
    }
    
    service = svclist[req.params.service];
 
    console.log("Looking for responses to service " + service.displayName + ", with message id: " + msgid);
 
    msgqueue = webinoshandler.status.receivedMessages.byConv[msgid];
    if (msgqueue === undefined || msgqueue === null | msgqueue === []) {
        res.send(404, "Message " + msgid + " responses not found");
        return;
    } else {    
        res.render("message", { 
            messagelist : webinoshandler.status.receivedMessages.byConv[msgid] 
        });
    }
}






function getServiceInfo(req,res,svclist) {
    console.log(util.inspect(req.params));
    if (req.params.service in svclist) {
        res.render("service", { service : svclist[req.params.service] });
    } else {
        res.send(404, "Not found.");
    }
}

function handleInvoke(req, res, svclist) {
    var service = req.params.service;
    var method = req.params.method;
    var args = req.query;
    
    if (!(service in svclist)) {
        res.send(404, "Sevice " + service + " not found");
        return;
    }
    
    service = svclist[req.params.service];
    console.log("You want to call " + service.displayName + "'s method " + method + " with arguments : " + util.inspect(args));
    invokeAPI(service, method, args, function(reply, orig) {;
        webinoshandler.findMessageConversationId(reply, function(err) {
            console.log(err);
            renderInvoke(service,method,args,null,res);
        }, function(index) {
            renderInvoke(service, method, args,index,res);
        });
    });
}

function handleInvokeJSON(req, res, svclist) {
    var service = req.params.service;
    var method = req.params.method;
    var args = req.query;
    
    if (!(service in svclist)) {
        res.send(404, "Sevice " + service + " not found");
        return;
    }
    
    service = svclist[req.params.service];
    console.log("You want to call " + service.displayName + "'s method " + method + " with arguments : " + util.inspect(args));
    invokeAPI(service, method, args, function(reply, orig) {;
        webinoshandler.findMessageConversationId(reply, function(err) {
            console.log(err);
            
        }, function(index) {
            res.json(reply.payload);
        });
    });
}


function renderInvoke(service, method, args, index, res) {
    res.render("invoke", 
    {
        "service" : service,
        "method" : method,
        "args" : args,
        "index" : index
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



function listServices(res, svclist) {
    res.render("list", { services : svclist });
}


function getAllServices(svclist) {
    webinosmsgs.makeServiceDiscoveryMsg(webinoshandler.status, "*", function(msg1) {
        webinoshandler.send(msg1, 
            function(msg2, original) {
                loadServices(msg2, svclist);
            }, 
            function() { 
                // Do nothing  
            }   
        );
    });  
}

function loadServices(msg, svclist) {
    console.log("Found: " + msg.payload.params.displayName + "");
    svclist[msg.payload.params.id] = msg.payload.params;
}


function getRoot(req,res) {
    var params = {
        pzpName      : webinoshandler.status.myPzp,
        connectedPzh : util.inspect(webinoshandler.status.connectedPZH),
        connectedPzp : util.inspect(webinoshandler.status.connectedPZP),
        connectionId : util.inspect(webinoshandler.status.connectionId),
        sentMsgs     : webinoshandler.status.sentMessages.count,
        receivedMsgs : webinoshandler.status.receivedMessages.count
    };

    res.render("index", params);
}


