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
    
    app.get('/service/:service', function(req, res) {
        getServiceInfo(req,res,svclist);
    });

    app.get('/service/:service/:method', function(req, res) {
        handleInvoke(req,res,svclist);    
    });
    
    app.get('/service/:service/response/:msgid', function(req, res) {
        handleInvokeMultiResponse(req,res,svclist);    
    });

    app.listen(3000);
    console.log("Listening on port 3000");

}

function handleInvokeMultiResponse(req,res,svclist) {
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

function renderInvoke(service, method, args, index, res) {
    res.render("invoke", 
    {
        "service" : service,
        "method" : method,
        "args" : args,
        "index" : index
    });  
}


/*

function manageAPIReply(service, method, args, res, reply, orig) {

    displayService(service, function(html) {
        webinoshandler.findMessageConversationId(reply, 
                function(err) {  }, 
                function(index) {
            var output = "<html><head></head><body>";
            output = output + "<h1>Response from " + service.displayName + " </h1>"; 
            output = output + "<hr/>";
            output = output + "<h2>Service details</h2>";
            output = output +  html;  
            output = output + "<hr/>";         
            output = output + "<h2>Invocation details</h2>";
            output = output + "<p>Called method <b>" + method + "</b> with arguments: ";
            output = output + "<ul>";
            for (var a in args) {
                output = output + "<li>" + a + " = " + args[a] + "</li>";
            }
            output = output + "</ul>";  
            output = output + "<hr/>";
            
            output = output + "<iframe width=\"600\" height=\"600\" src=\"./response/" + index + "\"></iframe>"
            
            output = output + "<hr/>";
            output = output + "<p><a href=\"../../list\">Back to the list</a></p>"        
            output = output + "</body></html>";
            res.send(output);
        });
    });

}
*/
/*
function renderReceivedMessage(reply, cb) {
    var output = "";
    output = output + "<h2>Response</h2>";
    output = output + "<p>" + "<pre style=\"color:red;\">";
    output = output + util.inspect(reply.payload.result);
    output = output + "</pre></p>";
    output = output + "<p>Full response: <br /><pre>" + util.inspect(reply);
    output = output + "</pre></p>";
    cb(output);
}
*/

/*
function renderMultipleReceivedMessages(list, cb) {
    var output = "<html><head></head><body>";
    output = output + "<input type=\"button\" " +
        "value=\"Reload Page\" onClick=\"window.location.reload()\">";
    for(var i=0; i<list.length; i++) {
        var reply = list[i];    
        output = output + "\n<h2>Response</h2>";
        output = output + "<p>" + "<pre style=\"color:red;\">";
        output = output + util.inspect(reply.payload.result);
        output = output + "</pre></p>";
        output = output + "<p>Full response: <br /><pre>" + util.inspect(reply);
        output = output + "</pre></p>\n";    
        output = output + "<hr />\n";
    }
    output = output + "</body></html>";
    cb(output);
}
*/

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


/*
function displayService(service, cb) {
    var html = "";
    
    html = html + "<p>";
    html = html +   "<b>" + service.displayName + "</b>" + "<br />";
    html = html +   "API: <a href='" + service.api + "'>" + service.api + "" + "</a><br />";
    if (service.serviceAddress !== '') {
        html = html +   "Address: <a href='" + service.serviceAddress + "'>" + service.serviceAddress + "</a>" + "<br />";
    }
    html = html +   "Description: " + service.description + "<br />";
    html = html + "</p>";
    cb(html);
}
*/

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


