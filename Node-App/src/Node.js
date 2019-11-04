var cryptoJS = require('crypto-js');

//generate hash of (Datetime + random)
function calculateNodeId() {

    let dateTime = new Date();
    //ISO 8601 date format
    let dateTimeStr = dateTime.toISOString();

    //generate random number
    let randomNumberStr = Math.floor(Math.random() * 1000000000).toString();

    let nodeIdWithoutHash = dateTimeStr + randomNumberStr;

    //sha512 hash
    let nodeId = cryptoJS.SHA256(nodeIdWithoutHash);

    return nodeId.toString();

}

module.exports = class Node {

    constructor(hostName, port) {
        this.name = "SM_Node_1_" + hostName + "_" + port;
        this.nodeId = calculateNodeId();
        this.peers = new Map();
        this.selfUrl = `http://${hostName}:${port}`;
        //this.chain = new Blockchain();

    }

    getNodeInfo() {
        let response = {
            "about": this.name,
            "nodeId": this.nodeId,
            //"chainId": this.chainId,
            "nodeUrl": this.selfUrl,
            "peers": this.peers.size,

        };

        return response;
    }

};