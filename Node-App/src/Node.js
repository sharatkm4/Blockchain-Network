var cryptoJS = require('crypto-js');

var BlockChain = require('./BlockChain');

var utils = require('./utils');

var CryptoUtils = require('./CryptoUtils');

var Transaction = require('./Transaction');

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

    // Send Transaction
    // With this endpoint, you can broadcast a transaction to the network.
    sendTransaction(inputTransactionJson) {

        // Check for missing fields
        if (!inputTransactionJson.hasOwnProperty("from")) {
            return { errorMsg: "Invalid transaction: field 'from' is missing" };
        }
        if (!inputTransactionJson.hasOwnProperty("to")) {
            return { errorMsg: "Invalid transaction: field 'to' is missing" };
        }
        if (!inputTransactionJson.hasOwnProperty("value")) {
            return { errorMsg: "Invalid transaction: field 'value' is missing" };
        }
        if (!inputTransactionJson.hasOwnProperty("fee")) {
            return { errorMsg: "Invalid transaction: field 'fee' is missing" };
        }
        if (!inputTransactionJson.hasOwnProperty("dateCreated")) {
            return { errorMsg: "Invalid transaction: field 'dateCreated' is missing" };
        }
        if (!inputTransactionJson.hasOwnProperty("data")) {
            return { errorMsg: "Invalid transaction: field 'data' is missing" };
        }
        if (!inputTransactionJson.hasOwnProperty("senderPubKey")) {
            return { errorMsg: "Invalid transaction: field 'senderPubKey' is missing" };
        }
        if (!inputTransactionJson.hasOwnProperty("senderSignature")) {
            return { errorMsg: "Invalid transaction: field 'senderSignature' is missing" };
        }

        // Check for invalid fields
        if (typeof inputTransactionJson.from !== 'string') {
            return { errorMsg: "Invalid transaction: field 'from' should be a string" };
        }
        if (typeof inputTransactionJson.to !== 'string') {
            return { errorMsg: "Invalid transaction: field 'to' should be a string" };
        }
        if (!Number.isInteger(inputTransactionJson.value)) {
            return { errorMsg: "Invalid transaction: field 'value' should be an integer" };
        }
        if (!Number.isInteger(inputTransactionJson.fee)) {
            return { errorMsg: "Invalid transaction: field 'fee' should be an integer" };
        }
        if (typeof inputTransactionJson.dateCreated !== 'string') {
            return { errorMsg: "Invalid transaction: field 'dateCreated' should be an ISO8601 date string" };
        }
        if (typeof inputTransactionJson.data !== 'string') {
            return { errorMsg: "Invalid transaction: field 'data' should be a string" };
        }
        if (typeof inputTransactionJson.senderPubKey !== 'string') {
            return { errorMsg: "Invalid transaction: field 'senderPubKey' should be a string" };
        }
        if (!Array.isArray(inputTransactionJson.senderSignature)) {
            return { errorMsg: "Invalid transaction: field 'senderSignature' should be an array" };
        }
        if (inputTransactionJson.senderSignature.length !== 2) {
            return { errorMsg: "Invalid transaction: array field 'senderSignature' should have have 2 elements" };
        }
        if (typeof inputTransactionJson.senderSignature[0] !== 'string') {
            return { errorMsg: "Invalid transaction: first element of array field 'senderSignature' should be a string" };
        }
        if (typeof inputTransactionJson.senderSignature[1] !== 'string') {
            return { errorMsg: "Invalid transaction: second element of array field 'senderSignature' should be a string" };
        }

        // Trim whitespaces from fields
        inputTransactionJson.from = inputTransactionJson.from.trim();
        inputTransactionJson.to = inputTransactionJson.to.trim();
        inputTransactionJson.dateCreated = inputTransactionJson.dateCreated.trim();
        inputTransactionJson.data = inputTransactionJson.data.trim();
        inputTransactionJson.senderPubKey = inputTransactionJson.senderPubKey.trim();
        inputTransactionJson.senderSignature[0] = inputTransactionJson.senderSignature[0].trim();
        inputTransactionJson.senderSignature[1] = inputTransactionJson.senderSignature[1].trim();

        // Convert Hex-valued strings to lower case
        inputTransactionJson.from = inputTransactionJson.from.toLowerCase();
        inputTransactionJson.to = inputTransactionJson.to.toLowerCase();
        inputTransactionJson.senderPubKey = inputTransactionJson.senderPubKey.toLowerCase();
        inputTransactionJson.senderSignature[0] = inputTransactionJson.senderSignature[0].toLowerCase();
        inputTransactionJson.senderSignature[1] = inputTransactionJson.senderSignature[1].toLowerCase();

        // Check for invalid field values
        if (!utils.isValidAddress(inputTransactionJson.from)) {
            return { errorMsg: "Invalid transaction: field 'from' should be a 40-Hex string" };
        }
        if (!utils.isValidAddress(inputTransactionJson.to)) {
            return { errorMsg: "Invalid transaction: field 'to' should be a 40-Hex string" };
        }
        if (inputTransactionJson.value < 0) {
            return { errorMsg: "Invalid transaction: field 'value' should be greater than or equal to 0" };
        }
        if (inputTransactionJson.fee < 10) {
            return { errorMsg: "Invalid transaction: number field 'fee' should be greater than or equal to 10" };
        }
        if (!utils.isValid_ISO_8601_date(inputTransactionJson.dateCreated)) {
            return { errorMsg: "Invalid transaction: field 'dateCreated' should be an ISO8601 date string" };
        }
        if (!utils.isValidPublicKey(inputTransactionJson.senderPubKey)) {
            return { errorMsg: "Invalid transaction: field 'senderPubKey' should be a 65-Hex string" };
        }
        if (!utils.isValid_64_Hex_string(inputTransactionJson.senderSignature[0])) {
            return { errorMsg: "Invalid transaction: first element of array field 'senderSignature' should be a 64-hex string value" };
        }
        if (!utils.isValid_64_Hex_string(inputTransactionJson.senderSignature[1])) {
            return { errorMsg: "Invalid transaction: second element of array field 'senderSignature' should be a 64-hex string value" };
        }
        let publicAddress = CryptoUtils.getPublicAddressFromPublicKey(inputTransactionJson.senderPubKey);
        if (inputTransactionJson.from !== publicAddress) {
            return { errorMsg: "Invalid transaction: field 'senderPubKey' does not match the 'from' public address" };
        }

        let newTransaction = new Transaction(
            inputTransactionJson.from, // address (40 hex digits)
            inputTransactionJson.to, // address (40 hex digits)
            inputTransactionJson.value, // integer (non negative)
            inputTransactionJson.fee, // integer (non negative)
            inputTransactionJson.dateCreated, // ISO8601_string
            inputTransactionJson.data, // string (optional)
            inputTransactionJson.senderPubKey, // hex_number[65]
            inputTransactionJson.senderSignature); // hex_number[2][64]

        //console.log('Transaction DataHash: ' + newTransaction.transactionDataHash);

        // Check for duplicate transaction data hash
        let transaction = this.getTransactionByHash(newTransaction.transactionDataHash);
        if (!transaction || !transaction.hasOwnProperty("errorMsg")) {
            return { errorMsg: `Invalid transaction: Transaction already exists with Transaction Data Hash: ${newTransaction.transactionDataHash}` };
        }

        // Validate senderSignature to confirm sender signed the Transaction
        let validSignature = CryptoUtils.verifySignature(
            newTransaction.transactionDataHash,
            inputTransactionJson.senderPubKey,
            { r: inputTransactionJson.senderSignature[0], s: inputTransactionJson.senderSignature[1]} );
        if (!validSignature) {
            return { errorMsg: "Invalid transaction: Invalid signature in the 'senderSignature' field" };
        }

        // Checks the sender account balance to be >= value + fee
        let accountBalance = this.getBalanceForAddress(inputTransactionJson.from);
        if (accountBalance.confirmedBalance < (inputTransactionJson.value + inputTransactionJson.fee)) {
            return { errorMsg: "Invalid transaction: Sender does not have enough balance to send transaction !! " };
        }

        // Put the transaction in "pending transactions" pool
        this.chain.pendingTransactions.push(newTransaction);

        let response = { transactionDataHash: newTransaction.transactionDataHash };
        return response;
    }



};