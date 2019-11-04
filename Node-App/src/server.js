var express = require('express');

var app = express();

var Node = require("./Node");

var node = null;

app.get('/', function (req, res) {
    console.log("GET request for home page");
    res.end(JSON.stringify({"message" : "Blockhain network !!"}));
});


app.get('/info', (req, res) => {
    let response = node.getNodeInfo();
    res.end(JSON.stringify(response));
});




var listeningPort = 5555;

var server = app.listen(listeningPort, function () {
    var host = server.address().address
    var port = server.address().port

    if (host == "::") {
        host = "localhost";
    }

    node = new Node(host, port);

    console.log("Node Server listening at http://%s:%s", host, port);
});