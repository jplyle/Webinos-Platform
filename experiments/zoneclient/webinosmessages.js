var webinosmessages = exports;

webinosmessages.makeMessagePrototype = function(status, cb) {
    var proto = {
            "type" : "",
            "from" : status.connectionId,
            "to"   : status.myPzp,
            "resp_to": status.connectionId,
            "payload" : {
                "serviceAddress" : status.myPzp,   
                "jsonrpc" : '2.0',
                "id" : Math.floor(Math.random() * 1001),
                "fromObjectRef" : Math.floor(Math.random() * 101),
                "method" : "",
                "params" : []

            }
    }
    cb(proto);
}

webinosmessages.makeServiceDiscoveryMsg = function(status, api, cb) {
    webinosmessages.makeMessagePrototype(status, function(proto) {
         proto.type = "JSONRPC";
         proto.payload.method = "ServiceDiscovery.findServices";
         proto.payload.params = [];
         proto.payload.params[0] = { "api" : api };         
         cb(proto);
    });
}


webinosmessages.makeRegisterMsg = function(status, cb) {
    webinosmessages.makeMessagePrototype(status, function(proto) {
        proto.payload = null;
        proto.register = true;
        proto.type = "JSONRPC"   
        cb(proto);
    });
}


webinosmessages.makeInvokeMsg = function(status, api, svc, method, params, cb) {
    webinosmessages.makeMessagePrototype(status, function(proto) {
         proto.type = "JSONRPC";    
        //API@service.method
         proto.payload.method = api + "@" + svc + "." + method + "";     
         proto.payload.params = params;
         cb(proto);
    });
}


//Not valid - this is sent by the PZH, I think.
webinosmessages.makeEnrolMsg = function(status, pzhurl, authCode, cb) {
    webinosmessages.makeMessagePrototype(status, function(proto) {
        proto.type = "prop",
        proto.payload = {
            "status": "enrollPzp",
            "pzhid" : pzhurl,
            "authCode" : authCode
        }
        cb(proto);
    });
}

/*

{ type: 'prop',
  id: 53,
  from: 'gung-ho_Pzp/2',
  to: 'gung-ho_Pzp',
  resp_to: 'gung-ho_Pzp/2',
  payload: 
   { status: 'enrollPzp',
     authCode: 'zlHW1kFi6fs=',
     pzhid: 'pzh.webinos.org/JohnLyle/' } }


*/








