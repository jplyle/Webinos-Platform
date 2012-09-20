Experimental RESTful client to webinos personal zones
==

This directory contains some experimental proposals on top of *webinos* which expose services as both RESTful APIs and via WebIntents.

Features
--

* Full interoperability with the webinos PZP
* Service invocation and response in JSON
* WebIntent service selection
* Prototype CORS integration
* Optional encoding and decoding of parameters with JSON RPC

Instructions
--

* Download the repository
* Fire up a webinos PZP on port 8080.  Make sure it works by visiting http://localhost:8080/client/client.html
* Go to the <pre>Webinos-Platform/experiments/zoneclient</pre> directory
* run <pre>npm install</pre>
* run <pre>node main.js</pre>
* visit http://localhost:3000/ and have a look around.  


Requirements
--
* Chrome (the most recent)
* Nodejs v8.8 (probably fine on v6)
* A load of Nodejs modules, including Express and WebSocket
* A DNS proxy such as http://code.google.com/p/marlon-tools/ 


Limitations and features still "in progress"
--

* Currently the WebIntents interface only works for Geolocation, and as a hack to work around Browser deficiencies.
* Support for WebSockets
* JavaScript wrappers for APIs





