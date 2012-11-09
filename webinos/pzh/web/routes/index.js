var path            = require('path'),
    util            = require('util'),
    url             = require('url'),
    crypto          = require('crypto'),
    fs              = require('fs'),
    https           = require('https'),
    openid          = require('openid'),
    express         = require('express'),
    passport        = require('passport'), 
    GoogleStrategy  = require('passport-google').Strategy,
    YahooStrategy   = require('passport-yahoo').Strategy;

var webinos = require("find-dependencies")(__dirname),
    logger   = webinos.global.require(webinos.global.util.location, "lib/logging.js")(__filename) || logger,
    pzhadaptor = require('../pzhadaptor.js');
    
module.exports = function(app, address, port, state) {
    "use strict";    
    
    app.get('/', ensureAuthenticated, function(req, res){               
        res.redirect('/main/' + getUserPath(req.user) + "/");
    });
    
    app.get('/main/:user/', ensureAuthenticated, function(req,res) {
        if (encodeURIComponent(req.params.user) !== getUserPath(req.user)) {
            logger.log(encodeURIComponent(req.params.user) + " does not equal " + getUserPath(req.user));
            res.redirect('/login');
        } else {
            res.render('main', { user: req.user });
        }
    });
    
    
    // Arbitrary query interface.
    app.post('/main/:user/query', ensureAuthenticated, function(req, res) {    
        logger.log("Body: " + util.inspect(req.body));
        pzhadaptor.fromWeb(req.user, req.body, res);
    });
    
    // A couple of unused REST interfaces
    app.post('/main/:user/zonestatus/', ensureAuthenticated, function(req,res) {
        pzhadaptor.getZoneStatus(req.user, res);
    });
    
    app.all('/main/:user/about-me/', ensureAuthenticated, function(req,res) {
        res.json(req.user);
    });
    
    function getCertsFromHostDirect(externalCertUrl, successcb, errorcb) {
        var innerreq = https.get(externalCertUrl, function(innerres) {
            var data = "";                  
            innerres.on('data', function(d) {
                data += d;
            });
            innerres.on('end', function() {
                var certs = JSON.parse(data);
                successcb(certs);               
            });
            innerres.on('error', function(err) {
                errorcb(err);
            });
        });
        innerreq.end();
    }
    
    function getCertsFromHost(hostEmail, hostDomain, successcb, errorcb) {
        var externalCertUrl = "https://" + hostDomain + "/main/" + encodeURIComponent(hostEmail) + "/certificates/";
        getCertsFromHostDirect(externalCertUrl, successcb, errorcb);
    }
    
    //Certificate exchange...
    app.get('/main/:user/connect-friend', ensureAuthenticated, function(req, res) {
        //Args: The external user's email address and PZH provider
        //Auth: User must have logged into their PZH
        //UI: NONE
        //Actions: adds the friend's details to the list of 'waiting for approval', redirects the user to the external PZH
        var externalEmail = req.query.externalemail;
        var externalPZH = req.query.externalpzh;
        console.log("External: " + externalEmail + " - " + externalPZH);
        //get my details from somewhere
        var myCertificateUrl = "https://" + address + ":" + port + "/main/" + req.params.user + "/certificates/";
        var myPzhUrl = "https://" + address + ":" + port + "/main/" + req.params.user + "/";
        
        //where are we sending people
        var redirectUrl = "https://" + externalPZH + "/main/" + encodeURIComponent(externalEmail) + "/request-access-login?certUrl=" + encodeURIComponent(myCertificateUrl) + "&pzhInfo=" + encodeURIComponent(myPzhUrl);
        
        //get those certificates
        //"https://" + externalPZH + "/main/" + encodeURIComponent(externalEmail) + "/certificates/"
        getCertsFromHost(externalEmail, externalPZH, function(certs) {
            pzhadaptor.setExpectedExternalUser(req.user, externalEmail, externalPZH, certs);
            res.redirect(redirectUrl);
        }, function(err) {
            res.writeHead(200);
            res.end('Failed to retrieve certificate from remote host');
        });
        
        // technically this is a problem.  
        // someone could change the URI in transit to transfer different certificates
        // this would make Bob think that Alice was from a different personal zone.
        // TODO: Work out some way of putting the 'get' data into the body, despite this being a redirect.
        
    });

    // present certificates to an external party.
    app.all('/main/:useremail/certificates/', function(req, res) {
    
        //return a JSON object containing all the certificates.
        pzhadaptor.fromWebUnauth(req.params.useremail, {type:"certificates"}, res);
        
    });
    

    app.get('/main/:useremail/request-access-login', function(req, res) {
        //Args: External user's PZH URL
        //Args: External user's PZH certificate
        //Auth: Check that the certificate is valid and that the certificate is valid for this URL.
        //UI: Presents a button that the user must click to confirm the request    
        //UI: External user must then present an OpenID account credential...
        //sets req.externalprovider
        console.log(req.params.useremail);
        var externalCertUrl = req.query.certUrl;
        var externalPZHUrl = req.query.pzhInfo;
        
        
        res.render('login-remote', 
            {externalCertUrl: encodeURIComponent(externalCertUrl), 
            externalPZHUrl: encodeURIComponent(externalPZHUrl)});
    });
    
    var attr = new openid.AttributeExchange({
        "http://axschema.org/contact/country/home":     "required",
        "http://axschema.org/namePerson/first":         "required",
        "http://axschema.org/pref/language":            "required",
        "http://axschema.org/namePerson/last":          "required",
        "http://axschema.org/contact/email":            "required",
        "http://axschema.org/namePerson/friendly":      "required",
        "http://axschema.org/namePerson":               "required",
        "http://axschema.org/media/image/default":      "required",
        "http://axschema.org/person/gender/":           "required"
    });

    app.get('/main/:useremail/request-access-authenticate', function(req, res) {
        //Args: External user's PZH URL
        //Args: External user's PZH certificate
        //Auth: Check that the certificate is valid and that the certificate is valid for this URL.
        //UI: Presents a button that the user must click to confirm the request    
        //UI: External user must then present an OpenID account credential...
        
        var externalRelyingParty = new openid.RelyingParty(
            'https://'+address+':'+port +'/main/' +
                encodeURIComponent(req.params.useremail) + 
                '/request-access-verify',
            null, false, false, [attr]);

        //'&externalCertUrl=' + encodeURIComponent(req.query.externalCertUrl) +  '&externalPZHUrl=' +  encodeURIComponent(req.query.externalPZHUrl)                

        var identifierUrl;
        if(req.query.externalprovider === "google") {
            identifierUrl = 'http://www.google.com/accounts/o8/id'
        } else {
            identifierUrl  = 'http://open.login.yahooapis.com/openid20/www.yahoo.com/xrds';
        }        

        externalRelyingParty.authenticate(identifierUrl, false, function(error, authUrl) {
            if (error)
            {
                res.writeHead(200);
                res.end('Authentication failed: ' + error.message);
            }
            else if (!authUrl)
            {
                res.writeHead(200);
                res.end('Authentication failed');
            }
            else
            {
                //this data needs to come with us on the next attempt...
                req.session.expectedExternalAuth = {   
                    internalUser            : req.params.useremail,
                    externalCertUrl         : req.query.externalCertUrl, 
                    externalPZHUrl          : req.query.externalPZHUrl, 
                    externalRelyingParty    : req.query.externalprovider,
                    externalAuthUrl         : authUrl
                };                
                res.writeHead(302, { Location: authUrl });
                res.end();
            }
        });

    });
    
    app.get('/main/:useremail/request-access-verify', function(req, res) {
        //Args: External user's PZH URL
        //Args: External user's PZH certificate
        //Auth: Check that the certificate is valid and that the certificate is valid for this URL.
        //Auth: OpenID credential.  THis is the redirect from a provider.
        //UI: Present some confirmation    

        var externalRelyingParty = new openid.RelyingParty(
            'https://'+address+':'+port +'/main/' + encodeURIComponent(req.params.useremail) + '/request-access-verify',
            null, false, false, [attr]);
        
        externalRelyingParty.verifyAssertion(req, function(error, result) {
            if (error) {
                res.writeHead(200);
                res.end('Authentication failed');
            } else {
                console.log("Successfully authenticated external user: " + util.inspect(result) + 
"who claims to have: " + req.session.expectedExternalAuth.externalCertUrl + " and " + req.session.expectedExternalAuth.externalPZHUrl);
                
                if (!req.session.expectedExternalAuth.externalCertUrl) {
                    res.writeHead(200);
                    res.end('Failed to read cookies');
                }

                var externalUrl = req.session.expectedExternalAuth.externalCertUrl;
                getCertsFromHostDirect(externalUrl, function(certs) {
                    var pzhData = {
                        pzhCerts                : certs,
                        externalCertUrl         : req.session.expectedExternalAuth.externalCertUrl, 
                        externalPZHUrl          : req.session.expectedExternalAuth.externalPZHUrl, 
                        externalRelyingParty    : req.session.expectedExternalAuth.externalRelyingParty,
                        externalAuthUrl         : req.session.expectedExternalAuth.externalAuthUrl
                    }
                    pzhadaptor.setRequestingExternalUser(req.params.useremail, result, pzhData);
                    //TODO: Check we're dealing with the same _internal_ user                        
                    res.render("external-request-success" ,{externaluser: result, user: req.params.useremail, externalPzhUrl: req.session.expectedExternalAuth.externalPZHUrl});       
                }, function(err) {
                    res.writeHead(200);
                    res.end('Failed to retrieve certificate from remote host');
                });
               
                
            }
        });    
    });
    

    //TODO WARNING: This seems like a dodgy function.  Anyone can invoke it.  Make sure that secret is long...
//    app.post('/main/:user/request-access/:external/', function(req, res) {
        //Args: External user's PZH URL
        //Args: Secret token
        //Args: Certificate for external PZH

        //Auth: check that the URL is expected and that the certificate is valid and that the certificate is valid for this URL.
        //UI: None
        //Action: add this user to the trusted list
//    });

    app.get('/main/:user/approve-user/:externalemail/', ensureAuthenticated, function(req, res) {
        pzhadaptor.getRequestingExternalUser(req.user, req.params.externalemail, function(answer) {
            res.render("approve-user", {user: req.user, externalUser: req.params.externalemail});        
        });
        //Args: None
        //Auth: PZH login required
        //UI: Show the external user's details
        //Actions: have a button that, once approved, add the external user's certificate details to the trusted list.    
    });

    app.post('/main/:user/make-user-decision/', ensureAuthenticated, function(req, res) {
        console.log(util.inspect(req.body));
        console.log(util.inspect(req.user));
        if (req.body.useremail && req.body.decision && req.user) {
            if (req.body.decision === "approve") {
                pzhadaptor.approveFriend(req.user, req.body.useremail);
            } else {
                pzhadaptor.rejectFriend(req.user, req.body.useremail);
            }
            res.redirect('../');
        } else {
            res.redirect('/');
        }
    });    
    
    app.get('/openid/test', function(req,res) {
        pzhapis.getIdAssert(app.Pzh.serverUrl + '/openid/verify', function() {
            res.end();
        });    
    });
    
    app.get('/openid/verify', function(req,res) {
        logger.log("Got message");
        logger.log(req);    
        res.end();
    });
    
    app.post('/openid/verify', function(req,res) {
        logger.log("Got message");
        logger.log(req);    
        res.end();
    });


    app.get('/login', function(req, res){
      res.render('login', { user: req.user });
    });


    // GET /auth/google
    //   Use passport.authenticate() as route middleware to authenticate the
    //   request.  The first step in Google authentication will involve redirecting
    //   the user to google.com.  After authenticating, Google will redirect the
    //   user back to this application at /auth/google/return
    app.get('/auth/google', 
      passport.authenticate('google', { failureRedirect: '/login' }),
      function(req, res) {
        res.redirect('/');
      });

    // GET /auth/google/return
    //   Use passport.authenticate() as route middleware to authenticate the
    //   request.  If authentication fails, the user will be redirected back to the
    //   login page.  Otherwise, the primary route function function will be called,
    //   which, in this example, will redirect the user to the home page.
    app.get('/auth/google/return', 
      passport.authenticate('google', { failureRedirect: '/login' }),
      function(req, res) {
        res.redirect('/');
      });

    app.get('/logout', function(req, res){
      req.logout();
      res.redirect('/');
    });

    app.get('/auth/yahoo',
      passport.authenticate('yahoo'),
      function(req, res){
        // The request will be redirected to Yahoo for authentication, so
        // this function will not be called.
      });

    app.get('/auth/yahoo/return', 
      passport.authenticate('yahoo', { failureRedirect: '/login' }),
      function(req, res) {
        // Successful authentication, redirect home.
        res.redirect('/');
      });
    
       
    
    // Simple route middleware to ensure user is authenticated.
    //   Use this route middleware on any resource that needs to be protected.  If
    //   the request is authenticated (typically via a persistent login session),
    //   the request will proceed.  Otherwise, the user will be redirected to the
    //   login page.
    function ensureAuthenticated(req, res, next) {
      if (req.isAuthenticated()) { return next(); }
      res.redirect('/login');
    }

    function getUserPath(user) {
        return encodeURIComponent(user.emails[0].value);
    }




}
