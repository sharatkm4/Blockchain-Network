var express = require('express');

var app = express();

var Node = require("./Node");

var node = null;

var HttpStatus = require('http-status-codes');

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