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
        let pendingAndConfirmedTransactions = this.chain.getAllTransactions();
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

    // List Transactions for Address
    // This endpoint will print all transactions for address.
    // Assumption: Transactions are returned for addresses in either 'From' or 'To'
    getTransactionsForAddress(address) {

        let response;
        if (utils.isValidAddress(address)) {
            let transactionsForAddress = this.chain.getTransactionsForAddress(address);
            //Sort by transaction created time
            let transactionsForAddressSortedByDateTime =
                transactionsForAddress.sort((firstTransaction, secondTransaction) => {
                    return (new Date(firstTransaction.dateCreated).getTime() - new Date(secondTransaction.dateCreated).getTime());
                });

            response = transactionsForAddressSortedByDateTime;

        } else {
            response = { errorMsg: "Invalid address" }
        }

        return response;
    }

    // Get Balance for Address Endpoint
    // This endpoint will return the balance of a specified address in the network.
    //
    // Balances Invalid for Address
    // If the address is valid but it is not used, return zero for the balance; if it is an invalid address, return an error message.
    getBalanceForAddress(address) {

        let response;
        if (utils.isValidAddress(address)) {
            let transactionsForAddress = this.chain.getTransactionsForAddress(address);

            let safeBalance = 0;
            let confirmedBalance = 0;
            let pendingBalance = 0;

            let safeConfirmCount = 6;

            for (let i = 0; i < transactionsForAddress.length; i++) {
                let transaction = transactionsForAddress[i];

                /*let numberOfConfirmations = 0;
                if (transaction.minedInBlockIndex === null) {
                    numberOfConfirmations = 0;
                } else {
                    numberOfConfirmations = this.chain.blocks.length - transaction.minedInBlockIndex;
                    //console.log(numberOfConfirmations);
                }*/
                //let numberOfConfirmations = this.chain.blocks.length - transaction.minedInBlockIndex;

                let numberOfConfirmations = 0;
                if (typeof(transaction.minedInBlockIndex) === 'number') {
                    numberOfConfirmations = this.chain.blocks.length - transaction.minedInBlockIndex;
                    console.log('numberOfConfirmations ' + numberOfConfirmations);
                }

                // Calculate balances in case of received transaction
                // Each successful received transaction adds value
                if (transaction.to === address) {
                    console.log('====to=====');

                    // pendingBalance expected balance (0 confirmations)
                    // It is assumed that all pending transactions will be successful
                    if (numberOfConfirmations === 0 || transaction.transferSuccessful) {
                        pendingBalance += transaction.value;
                        console.log('pendingBalance ' + pendingBalance);
                    }

                    // confirmedBalance 1 or more confirmations
                    if (numberOfConfirmations >= 1 && transaction.transferSuccessful) {
                        confirmedBalance += transaction.value;
                        console.log('confirmedBalance ' + confirmedBalance);
                    }

                    // safeBalance 6 confirmations or more confirmations
                    if (numberOfConfirmations >= safeConfirmCount && transaction.transferSuccessful){
                        safeBalance += transaction.value;
                        console.log('safeBalance ' + safeBalance);
                    }
                }

                // Calculate balances in case of spent transaction
                // All spent transactions subtract the transaction fee
                // Successful spent transactions subtract value

                if (transaction.from === address) {
                    console.log('====from=====');

                    // pendingBalance expected balance (0 confirmations)
                    // It is assumed that all pending transactions will be successful
                    if (numberOfConfirmations === 0 || transaction.transferSuccessful) {
                        pendingBalance -= transaction.fee;
                        pendingBalance -= transaction.value;
                        console.log('pendingBalance ' + pendingBalance);
                    }

                    // confirmedBalance 1 or more confirmations
                    if (numberOfConfirmations >= 1) {
                        confirmedBalance -= transaction.fee;
                        if (transaction.transferSuccessful)
                            confirmedBalance -= transaction.value;
                        console.log('confirmedBalance ' + confirmedBalance);
                    }

                    // safeBalance 6 confirmations or more confirmations
                    if (numberOfConfirmations >= safeConfirmCount) {
                        safeBalance -= transaction.fee;
                        if (transaction.transferSuccessful)
                            safeBalance -= transaction.value;
                        console.log('safeBalance ' + safeBalance);
                    }
                }
            }

            response = {
                safeBalance: safeBalance,
                confirmedBalance: confirmedBalance,
                pendingBalance: pendingBalance
            }

        } else {
            response = { errorMsg: "Invalid address" }
        }

        return response;

    }




};