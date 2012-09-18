/* http://localhost:3000/service/517587767e567613b5a3ef469dafb81a/json/getCurrentPosition/ */

var http = require('http');
http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/html'});
  var html = "";

  html += "<html><head>" + "<title>" + "CORS Test" + "</title>";
  html += "\n" + "<script type='text/javascript'>";
  
  html += "\n" + "var request = new XMLHttpRequest();";
  html += "\n" + "request.addEventListener('error', errorReport, false);";
  html += "\n" + "request.open('GET', 'http://localhost:3000/service/6e6885b25a7ddb5f4658e7a599d1fc17/json/get42', false);";
//  html += "\n" + "request.open('GET', 'http://localhost:3000/service/517587767e567613b5a3ef469dafb81a/json/getCurrentPosition', false);";  
  html += "\n" + "request.send();";

  html += "\n" + "function errorReport(evt) { " 
  html += "\n" + "    alert(evt);";
  html += "\n" + "    for (var e in evt) { ";
//  html += "\n" + "        console.log('evt[' + e + '] = ' + evt[e] + ''); ";
  html += "\n" + "    }";  
  html += "\n" + "}";

  html += "\n" + "</script>";
  html += "\n" + "</head><body>";
  
  html += "\n" + "";
  
  html += "\n" + "</body></html>";
  
  res.end(html + "\n");
}).listen(1337, '127.0.0.1');


console.log('Server running at http://127.0.0.1:1337/');
