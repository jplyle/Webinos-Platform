var util = require('util');
var webinoshandler = exports;

var PROP = 'prop';
var REGISTER = 'registeredBrowser';

/* This whole thing is a horrible piece of hackery.  It's global state! */


/* This section handles the current message history and connection status */

webinoshandler.status = {
  connectedPZP : [],
  connectedPZH : [],
  connectionId : null,
  sentMessages : { anon : [], byRef: {}, byId: {}, count: 0},
  receivedMessages : { byConv: {}, count: 0 },
  session : null,
  myPzp : null,
  toString : function() {
    var str;
    str =       "Connection status with PZP\n"
    str = str + "Id:         " + this.connectionId + "\n";
    str = str + "My PZP:     " + this.myPzp + "\n";
    str = str + "Other PZPs: " + util.inspect(this.connectedPZP) + "\n";
    str = str + "PZH:        " + util.inspect(this.connectedPZH) + "\n";
    return str;
  },
}



webinoshandler.prettyStart = function(cb) {
    console.log("\n");
    console.log("----------- FAKE CLIENT STARTED -----------");
    console.log("Status: " + webinoshandler.status);
    console.log("-------------------------------------------");
    console.log("\n");
    cb();
}


/* What do I do if I get a message?  Panic, and call this function */
webinoshandler.handleMessage = function(session, msg, main) {
    console.log("Receiving: " + util.inspect(msg) + "\n");
    webinoshandler.status.session = session;
    webinoshandler.status.receivedMessages.count += 1; 
    if (msg.type === 'prop') {
        handleProp(session, msg, main);
    } else if (msg.type === 'JSONRPC') {
        handleJSON(session, msg);
    } else {
        handleOther(session, msg);
    }
}


function handleOther(session, msg) {
    console.log("Not sure how to handle message type: " + msg.type);
}

function handleProp(session, msg, main) {
    if (msg.payload.status === REGISTER) {
        handleRegister(session, msg, main);
    } else {
        console.log("Not sure how to handle message " + msg.payload.status);
    }
}

function handleJSON(session, msg) {
    if (msg.payload.method === null && msg.payload.id === null) {
        console.log("Could not handle message - no 'id' or 'method' : " + util.inspect(msg));
    } 
    /* If I get a message, it's because I was asking for one (maybe?) So 
       look for the original and invoke any handler code it had. */
    webinoshandler.findOriginalMessage(msg, errFinding, function(orig, index) {
        //also, lets maintain conversations, shall we?
        addReceivedMessage(msg, orig, index);
        orig.handler(msg, orig);
    });
}

function addReceivedMessage(msg, orig, index) {
    if (!(index in webinoshandler.status.receivedMessages.byConv)) {
        webinoshandler.status.receivedMessages.byConv[index] = [];
    }
//    console.log("Adding message to conversation " + index);
    webinoshandler.status.receivedMessages.byConv[index].push(msg);
}

function errFinding(why) {
    console.log("Could not match message " + why);
}

//Sigh. Messages have Ids in different fields.  Work it out.
webinoshandler.findMessageConversationId = function(msg, errcb, cb) {
    if (msg.payload.method !== undefined ) {
        var index = "" +  msg.payload.method.split('.')[0];
    } else if (msg.payload.id !== undefined )  {
        var index = "" +  msg.payload.id;
    } else {
        errcb("Could not find ID for message: " + util.inspect(msg));
        return;
    }
    cb(index);
}

// returns the original message that this is a response to.
webinoshandler.findOriginalMessage = function(msg, errcb, cb) {
    webinoshandler.findMessageConversationId(msg, errcb, function(index) {
    
        if (index in webinoshandler.status.sentMessages.byRef) {
            var orig = webinoshandler.status.sentMessages.byRef[index];
            cb(orig, index);
        } else if (index in webinoshandler.status.sentMessages.byId) {
            var orig = webinoshandler.status.sentMessages.byId[index];
            cb(orig, index);
        } else {
        
            errcb("Could not find " + index + " in " + 
                util.inspect(webinoshandler.status.sentMessages.byRef) + 
                "\n or " + 
                util.inspect(webinoshandler.status.sentMessages.byId));
        }
    
    })
}


function handleRegister(session, msg, main) {
    var data = msg.payload.message;
    webinoshandler.status.connectedPZP = 
        webinoshandler.status.connectedPZP.concat(data.connectedPzp);
    webinoshandler.status.connectedPZH = 
        webinoshandler.status.connectedPZH.concat(data.connectedPzh);
    webinoshandler.status.connectionId = msg.to;   

    msgToSplit = msg.to.split('/');
    if (msgToSplit.length == 2) {
        webinoshandler.status.myPzp = msgToSplit[0];
    } else {
        webinoshandler.status.myPzp = msgToSplit[0] + "/" + msgToSplit[1];    
    } 
    
    webinoshandler.prettyStart(function() {
        main();
    });
}



// takes the websocket session, the message you want to send, any 
// follow-up function you want it to call afterwards, and a call-back.
webinoshandler.send = function(msg, followUpFn, cb) {
    console.log("sending: " + util.inspect(msg));
    var msgjson = JSON.stringify(msg);
    webinoshandler.status.session.send(msgjson); 
    webinoshandler.status.sentMessages.count += 1;
    var msgHistory = {    
        orig : msg,
        handler : followUpFn
    }         
    if (msg.payload !== null && msg.payload.id !== null) {
        webinoshandler.status.sentMessages.byId[msg.payload.id] = msgHistory;
        webinoshandler.status.sentMessages.byRef[msg.payload.fromObjectRef] = 
            msgHistory;
    } else {
        webinoshandler.status.sentMessages.anon.push(msgHistory);
    }
    cb();
}
