var express = require('express');
var app = express();

// Enable static access to the "/public" folder
app.use(express.static('public'));


var listeningPort = 9999;
var listeningHost = "localhost";

var server = app.listen(listeningPort, function () {
    var host = server.address().address
    var port = server.address().port

    if (host == "::") {
        host = listeningHost;
    }

    console.log("Block Explorer Server listening at http://%s:%s", host, port);
});
