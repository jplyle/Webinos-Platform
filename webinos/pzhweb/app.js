var express         = require('express'),
    util            = require('util'),
    path            = require('path'),
    crypto          = require('crypto'),
    https           = require('https'),
    fs              = require('fs'),
    passport        = require('passport'), 
    YahooStrategy   = require('passport-yahoo').Strategy,
    GoogleStrategy  = require('passport-google').Strategy;

var webinos = require("find-dependencies")(__dirname),
    logger   = webinos.global.require(webinos.global.util.location, "lib/logging.js")(__filename) || logger,
    realpzhtls = require('./realpzhtls.js');

var pzhproviderweb      = exports; 

var state = {
    expectedExternalAuth : [],
};

var tlsConnectionAttempts = 0;

pzhproviderweb.startWebServer = function(host, address, port, options, config, cb) {
    "use strict";
    logger.log("Port:    " + port)
    logger.log("Host:    " + host)
    logger.log("Address: " + address)
    logger.log("Config:  " + config)   
    createServer(port, host, address, options, config, cb);
}



function createServer(port, host, address, options, config, next) {
    "use strict";
    var app, routes, server;

    //configure the authentication engine and user binding
    passport = createPassport("https://" + address + ':' + port);

    //connect to the TLS Server
    makeTLSServerConnection(config, options, function(status, value) {
        if (status) {
            //configure the express app middleware
            app = createApp(options, passport);
            routes = setRoutes(app, address, port);
            //actually start the server
            server = https.createServer(options, app).listen(port);
            handleAppStart(app, server, next);
        } else {
            logger.error("Failed to connect to the PZH Provider's TLS server");
            handleAppStart(app, null, next);
        }
    });
    
}
/* Long lasting connection: this will reconnect after any errors a maximum
 * of 10 times (ok, more like 8).
 *
 */
function makeTLSServerConnection(config, webOptions, cb) { 
    realpzhtls.init(
    config, 
    webOptions, 
    function(data) {
        console.log("Received data: " + data);
    }, 
    function(status, value) {
        if (status) {
            tlsConnectionAttempts++;
            realpzhtls.send("NO USER", "WEB SERVER INIT", {
                err : function(error) { console.log("Error: " + error); },
                success : function() { console.log("Sent."); }
            });
            if (tlsConnectionAttempts === 0) {
                //don't bother with success callbacks if it works.
                cb(status,value);
            }
            tlsConnectionAttempts = 0; //reset            
        } else {
            tlsConnectionAttempts++;
            if (tlsConnectionAttempts < 10){
                setTimeout( function() {
                    makeTLSServerConnection(config, webOptions, cb);
                }, 1000);
            } else {
                cb(false, "Failed to reconnect to TLS server");
            }
        }
        
    });
}


function createApp(options, passport) {
    "use strict";
    var app = express();
    app.options = options;
    app.configure(function(){
      "use strict";
      app.set('views', __dirname + '/views');
      app.set('view engine', 'ejs');
//      app.use(express.logger()); // turn on express logging for every page
      app.use(express.bodyParser());
      app.use(express.methodOverride());
      app.use(express.cookieParser());
      var sessionSecret = crypto.randomBytes(40).toString("base64");
      app.use(express.session({ secret: sessionSecret }));
      app.use(passport.initialize());
      app.use(passport.session());    
      app.use(app.router);
      app.use(express.static(__dirname + '/public'));
    });

    // An environment variable will switch between these two, but we don't yet.
    app.configure('development', function(){
      app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
    });

    app.configure('production', function(){
      app.use(express.errorHandler()); 
    });
    
    return app;
}

function createPassport(serverUrl) {
    "use strict";
    /* No clever user handling here yet */
    passport.serializeUser(function(user, done) {
      done(null, user);
    });

    passport.deserializeUser(function(obj, done) {
      done(null, obj);
    });

        
    // Use the GoogleStrategy within Passport.
    //   Strategies in passport require a `validate` function, which accept
    //   credentials (in this case, an OpenID identifier and profile), and invoke a
    //   callback with a user object.
    passport.use(new GoogleStrategy({
        returnURL: serverUrl + '/auth/google/return',
        realm: serverUrl + '/'
      },
      function(identifier, profile, done) {
        "use strict";
        // asynchronous verification, for effect...
        process.nextTick(function () {
          
          // To keep the example simple, the user's Google profile is returned to
          // represent the logged-in user.  In a typical application, you would want
          // to associate the Google account with a user record in your database,
          // and return that user instead.
          profile.internal = true;
          profile.from = "google";
          profile.identifier = identifier;
          return done(null, profile);
        });
      }
    ));

    passport.use(new YahooStrategy({
        returnURL: serverUrl + '/auth/yahoo/return',
        realm: serverUrl + '/'
      },
      function(identifier, profile, done) {
        "use strict";
        process.nextTick(function () {
            profile.internal = true;
            profile.from = "yahoo";
            profile.identifier = identifier;
            return done(null, profile);
        });
      }
    ));
    return passport;
}


function setRoutes(app, address, port, state) {
    "use strict";
    return require('./routes')(app, address, port);
}

function handleAppStart(app, server, next) {
    "use strict";
    if (server === undefined || server === null || server.address() === null) {
        var err = "ERROR! Failed to start PZH Provider web interface: " + util.inspect(server);
        logger.log(err);
        next(false, err);
    } else {
        logger.log("HTTPS PZH Provider Web server at address " + server.address().address + ", listening on port " + server.address().port);
        next(true, null);
    }
}

