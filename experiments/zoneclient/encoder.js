var util = require('util');


var encoder = exports;


encoder.encode = function(toEncode) {

    var str = JSON.stringify(toEncode);
    var encoded = encodeURIComponent(str);
    var base64 = new Buffer(encoded).toString('base64');
    return "JSONRPC(" + base64 + ")";
    
}

encoder.decode = function(toDecode) {

    if (toDecode.indexOf("JSONRPC(") == 0) {
        var encoded = toDecode.substring("JSONRPC(".length, toDecode.length -1);
        
        if (encoded === '') return {};
        
        console.log("Encoded input = " + encoded);
        var debase64 = new Buffer(encoded, 'base64').toString('utf8');
        console.log("De-base64 input = " + debase64);
        var deURI = decodeURIComponent(debase64);
        console.log("De-URI encoded input = " + deURI);        
        var jsonInput = JSON.parse(deURI);
        console.log("JSON input = " + util.inspect(jsonInput));
        
        return jsonInput;
        
    } else {    
        console.log("Not decoding");
        return toDecode;
    }
    
}
