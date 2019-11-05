var cryptoJS = require('crypto-js');

var BlockChain = require('./BlockChain');

//generate hash of (Datetime + random)
function calculateNodeId() {

    let dateTime = new Date();
    //ISO 8601 date format
    let dateTimeStr = dateTime.toISOString();

    //generate random number
    let randomNumberStr = Math.floor(Math.random() * 1000000000).toString();

    let nodeIdWithoutHash = dateTimeStr + randomNumberStr;

    //sha256 hash of date and random number
    let nodeId = cryptoJS.SHA256(nodeIdWithoutHash);

    return nodeId.toString();

}

module.exports = class Node {

    constructor(hostName, port) {
        this.name = "SM_Node_1_" + hostName + "_" + port;
        this.nodeId = calculateNodeId();
        this.peers = new Map(); // map(nodeId --> URL)
        this.selfUrl = `http://${hostName}:${port}`;
        this.chain = new BlockChain();
        this.chainId = this.chain.blocks[0].blockHash;
    }

    // General information
    // Endpoint for receiving general information about the node.
    getNodeInfo() {
        let response = {
            "about": this.name,
            "nodeId": this.nodeId,
            "chainId": this.chainId,
            "nodeUrl": this.selfUrl,
            "peers": this.peers.size,
            "currentDifficulty": this.chain.currentDifficulty,
            "blocksCount": this.chain.blocks.length,
            "cumulativeDifficulty": this.chain.calculateCumulativeDifficulty(),
            "confirmedTransactions": this.chain.calculateConfirmedTransactions(),
            "pendingTransactions": this.chain.pendingTransactions.length
        };

        return response;
    }

    // Reset the chain Endpoint
    // This endpoint will reset the chain and start it from the beginning; this is used only for debugging.
    resetChain() {
        this.chain = new BlockChain();
        return {"message ": "The chain was reset to its genesis block"};
    }


};