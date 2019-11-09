var express = require('express');
var app = express();
var Node = require("./Node");
var utils = require('./utils');
var node = null;

//Parse JSON Message Body in POST RESTFul Services.
var bodyParser = require('body-parser');
app.use(bodyParser.json())

var HttpStatus = require('http-status-codes');
var axios = require('axios');
var restfulCallTimeout = 60000;

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

// All blocks Endpoint
// The endpoint will print all the blocks in the node’s chain.
app.get('/blocks', (req, res) => {
    let response = node.getAllBlocksInfo();
    res.end(JSON.stringify(response));
});

// Block by Index Endpoint
// The endpoint will print the block with the index that you specify
app.get('/blocks/:index', (req, res) => {
    let blockIndex = req.params.index;
    let response = node.getBlockInfoByIndex(blockIndex);

    if (response.hasOwnProperty("errorMsg")) {
        res.status(HttpStatus.NOT_FOUND);
    }

    res.end(JSON.stringify(response));
});

// Get Pending Transactions Endpoint
// This endpoint will print the list with transactions that have not been mined.
app.get('/transactions/pending', (req, res) => {
    let response = node.getPendingTransactions();
    res.end(JSON.stringify(response));
});

// Get Confirmed Transactions
// This endpoint will print the list of the transactions that are included in blocks.
app.get('/transactions/confirmed', (req, res) => {
    let response = node.getConfirmedTransactions();
    res.end(JSON.stringify(response));
});

// Get Transaction by Hash Endpoint
// This endpoint will return a transaction identified by hash
app.get('/transactions/:hash', (req, res) => {
    let hash = req.params.hash;
    let response = node.getTransactionByHash(hash);

    if (response.hasOwnProperty("errorMsg")) {
        res.status(HttpStatus.NOT_FOUND);
    }

    res.end(JSON.stringify(response));
});

// List All Account Balance
// This endpoint will return all the balances in the network.
app.get('/balances', (req, res) => {
    let response = node.getAllAccountBalances();
    res.end(JSON.stringify(response));
});

// List Transactions for Address
// This endpoint will print all transactions for address.
app.get('/address/:address/transactions', (req, res) => {
    let address = req.params.address;
    let response = node.getTransactionsForAddress(address);

    if (response.hasOwnProperty("errorMsg")) {
        res.status(HttpStatus.NOT_FOUND);
    }

    res.end(JSON.stringify(response));
});

// Get Balance for Address Endpoint
// This endpoint will return the balance of a specified address in the network.
//
// Balances Invalid for Address
// If the address is valid but it is not used, return zero for the balance; if it is an invalid address, return an error message.
app.get('/address/:address/balance', (req, res) => {
    let address = req.params.address;
    let response = node.getBalanceForAddress(address);

    if (response.hasOwnProperty("errorMsg")) {
        res.status(HttpStatus.NOT_FOUND);
    }

    res.end(JSON.stringify(response));
});

// Use axios library to make RESTFul calls
async function sendTransactionToAllPeers(transaction) {
    let peerNodeIds = Array.from(node.peers.keys());
    let peerUrls = Array.from(node.peers.values());

    let response = {
        peersTransactionsSendSuccessfulResponses: [ ],
        peersTransactionsSendErrorResponses: [ ],
        peersDeleted: [ ]
    };

    for (let i = 0; i = peerUrls.length; i++) {
        let peerUrl = peerUrls[i];
        let restfulUrl = peerUrl + "/transactions/send";
        let successResponse = undefined;
        let errorResponse = undefined;
        await axios.post(restfulUrl, transaction, {timeout: restfulCallTimeout})
            .then(function (response) {
                console.log('response = ', response);
                successResponse = response;
            })
            .catch(function (error) {
                console.log('error =', error);
                errorResponse = error;
            });

        let theResponse = { };

        // If the RESTFul call to the peer yielded no response after the timeout, then just delete the peer node from the list of "peers".
        if (successResponse === undefined && errorResponse === undefined) {
            node.peers.delete(peerNodeIds[i]);
            response.peersDeleted.push(peerUrl);

            theResponse.errorMsg = `Peer ${peerUrl} did not respond after timeout period from call to /transactions/send - deleted as peer`;
            response.peersTransactionsSendErrorResponses.push(theResponse);
        } else if (errorResponse !== undefined) {
            theResponse.errorMsg = `Peer ${peerUrl} did not respond with success from call to /transactions/send`;
            theResponse.error = errorResponse;
            response.peersTransactionsSendErrorResponses.push(theResponse);
        } else if (successResponse !== undefined) {
            theResponse.message = `Peer ${peerUrl} did respond with success from call to /transactions/send`;
            response.peersTransactionsSendSuccessfulResponses.push(theResponse);
        }

    }

    //console.log('Response Object: ' + response);

}

// Send Transaction
// With this endpoint, you can broadcast a transaction to the network.
app.post('/transactions/send', (req, res) => {
    //console.log('Node: ' + req.body);
    let response = node.sendTransaction(req.body);

    if (response.hasOwnProperty("errorMsg")) {
        res.status(HttpStatus.BAD_REQUEST);
    } else {
        sendTransactionToAllPeers(req.body);
        res.status(HttpStatus.CREATED);
    }

     res.end(JSON.stringify(response));
});


var listeningPort = 5555;
var listeningHost = "localhost";

// commander library for getting port and host as command-line arguments.
var commander = require('commander');
commander
    .usage('[OPTIONS]...')
    .option('-lp, --listeningPort <Port Number>', 'Listening Port Number', listeningPort)
    .option('-lh, --listeningHost <Host Name>', 'Listening Host Name', listeningHost)
    .parse(process.argv);

if (utils.isNumeric(commander.listeningPort))
    listeningPort = commander.listeningPort;
else
    console.log(`Listening Port entered is not a number: Will use default ${listeningPort} port.`);

listeningHost = commander.listeningHost;

var server = app.listen(listeningPort, function () {
    var host = server.address().address
    var port = server.address().port

    if (host == "::") {
        host = listeningHost;
    }

    node = new Node(host, port);

    console.log("Node Server listening at http://%s:%s", host, port);
});