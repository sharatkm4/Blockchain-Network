var cryptoJS = require('crypto-js');

var BlockChain = require('./BlockChain');

var utils = require('./utils');

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

    // Debug endpoint
    // This endpoint will print everything about the node. The blocks, peers, chain, pending transactions and much more.
    getDebugInfo() {

        let response = {
            "nodeId": this.nodeId,
            "selfUrl": this.selfUrl,
            "peers": utils.strMapToObj(this.peers),
            "chainId": this.chainId,
            "chain": this.chain.getJsonObject(),
            "confirmedBalances": utils.strMapToObj(this.chain.getConfirmedBalances())
        };

        return response;


    }

    // Reset the chain Endpoint
    // This endpoint will reset the chain and start it from the beginning; this is used only for debugging.
    resetChain() {
        this.chain = new BlockChain();
        return {"message ": "The chain was reset to its genesis block"};
    }

    // All blocks Endpoint
    // The endpoint will print all the blocks in the node’s chain.
    getAllBlocksInfo() {
        let response = this.chain.blocks;
        return response;
    }

    // Block by Index Endpoint
    // The endpoint will print the block with the index that you specify
    getBlockInfoByIndex(index) {
        let response = null;

        if (index >= this.chain.blocks.length || !utils.isNumeric(index)) {
            response = { errorMsg: "Invalid block index !!" }
        } else {
            response = this.chain.blocks[index];
        }

        return response;
    }

    // Get Pending Transactions Endpoint
    // This endpoint will print the list with transactions that have not been mined.
    getPendingTransactions() {

        this.chain.pendingTransactions.push(this.chain.blocks[0].transactions[0]);

        let pendingTransactions = this.chain.pendingTransactions;
        let pendingTransactionsModifiedOutput = [];

        for (let i = 0; i < pendingTransactions.length; i++) {
            let pendingTransaction = pendingTransactions[i];
            let pendingTransactionModifiedOutput = {
                from: pendingTransaction.from,
                to: pendingTransaction.to,
                value: pendingTransaction.value,
                fee: pendingTransaction.fee,
                dateCreated: pendingTransaction.dateCreated,
                data: pendingTransaction.data,
                senderPubKey: pendingTransaction.senderPubKey,
                transactionDataHash: pendingTransaction.transactionDataHash,
                senderSignature: pendingTransaction.senderSignature
            }

            pendingTransactionsModifiedOutput.push(pendingTransactionModifiedOutput);
        }

        return pendingTransactionsModifiedOutput;

    }

    // Get Confirmed Transactions
    // This endpoint will print the list of the transactions that are included in blocks.
    getConfirmedTransactions() {
        let response = this.chain.getConfirmedTransactions();
        return response;
    }

    // Get Transaction by Hash Endpoint
    // This endpoint will return a transaction identified by hash
    getTransactionByHash(hash) {
        let pendingAndConfirmedTransactions = this.chain.getPendingAndConfirmedTransactions();
        let transaction;

        for (let i = 0; i < pendingAndConfirmedTransactions.length; i++) {
            //console.log(pendingAndConfirmedTransactions[i].transactionDataHash);
            if (pendingAndConfirmedTransactions[i].transactionDataHash === hash) {
                transaction = pendingAndConfirmedTransactions[i];
                break;
            }
        }

        let response;
        if(transaction){
            response = transaction;
        } else {
            response = { errorMsg: "Invalid transaction hash!!" }
        }
        return response;

    }

    // List All Account Balance
    // This endpoint will return all the balances in the network.
    // Assumption: Accounts with non zero confirmed balance will also be returned
    getAllAccountBalances() {

        let addressBalancesMap = this.chain.getConfirmedBalances();
        let response = utils.strMapToObj(addressBalancesMap);
        return response;

    }


};