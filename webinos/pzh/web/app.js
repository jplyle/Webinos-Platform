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
    logger   = webinos.global.require(webinos.global.util.location, "lib/logging.js")(__filename) || logger;

var pzhproviderweb      = exports; 

var state = {
    expectedExternalAuth : [],
};


pzhproviderweb.startWebServer = function(host, address, port, config, cb) {
    "use strict";
    logger.log("Port:    " + port)
    logger.log("Host:    " + host)
    logger.log("Address: " + address)
    logger.log("Config:  " + config)   
    createServer(port, host, address, config, cb);
}

function createServer(port, host, address, options, next) {
    "use strict";

    //configure the authentication engine and user binding
    passport = createPassport("https://" + address + ':' + port);

    //configure the express app middleware
    var app = createApp(options, passport);
    var routes = setRoutes(app, address, port);
    
    //actually start the server
    var server = https.createServer(options, app).listen(port);
    
    //some very basic logger output and calling the callback.
    handleAppStart(app, server, next);
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
    if (server.address() === null) {
        var err = "ERROR! Failed to start PZH Provider web interface";
        logger.log(err);
        next(false, err);
    } else {
        logger.log("HTTPS PZH Provider Web server at address " + server.address().address + ", listening on port " + server.address().port);
        next(true, null);
    }
}

