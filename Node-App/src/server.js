var express = require('express');

var app = express();

var Node = require("./Node");

var node = null;

// Home Page
app.get('/', function (req, res) {
    console.log("GET request for home page");
    res.end(JSON.stringify({"message" : "Blockhain network !!"}));
});

// General information
// Endpoint for receiving general information about the node.
app.get('/info', (req, res) => {
    let response = node.getNodeInfo();
    res.end(JSON.stringify(response));
});

// Debug endpoint
// This endpoint will print everything about the node. The blocks, peers, chain, pending transactions and much more.
app.get('/debug', (req, res) => {
    let response = node.getDebugInfo();
    res.end(JSON.stringify(response));
});

// Reset the chain Endpoint
// This endpoint will reset the chain and start it from the beginning; this is used only for debugging.
app.get('/debug/reset-chain', (req, res) => {
    let response = node.resetChain();
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