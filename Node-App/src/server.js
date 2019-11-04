var express = require('express');

var app = express();

app.get('/', function (req, res) {
    console.log("GET request for home page");
    res.end(JSON.stringify({"message" : "Blockhain network !!"}));
});

var listeningPort = 5555;

var server = app.listen(listeningPort, function () {
    var host = server.address().address
    var port = server.address().port

    if (host == "::") {
        host = "localhost";
    }

    console.log("Node Server listening at http://%s:%s", host, port);
});