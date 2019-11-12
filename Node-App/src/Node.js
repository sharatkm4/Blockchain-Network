var CryptoJS = require('crypto-js');

var BlockChain = require('./BlockChain');

var utils = require('./utils');

var CryptoUtils = require('./CryptoUtils');

var Transaction = require('./Transaction');

var GenesisBlock = require('./GenesisBlock');

var Block = require('./Block');

var axios = require('axios');

var restfulCallTimeout = 60000; // 60 seconds
var confictErrorType = "Conflict";
var badRequestErrorType = "Bad Request";

//generate hash of (Datetime + random)
function calculateNodeId() {

    let dateTime = new Date();
    //ISO 8601 date format
    let dateTimeStr = dateTime.toISOString();

    //generate random number
    let randomNumberStr = Math.floor(Math.random() * 1000000000).toString();

    let nodeIdWithoutHash = dateTimeStr + randomNumberStr;

    //sha256 hash of date and random number
    let nodeId = CryptoJS.SHA256(nodeIdWithoutHash);

    return nodeId.toString();

}

module.exports = class Node {

    constructor(hostName, port) {
        this.name = "SM_Node_" + hostName + "_" + port;
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

    // Get Mining Job Endpoint
    // This endpoint will prepare a block candidate and the miner will calculate the nonce for it.
    getMiningJob(minerAddress) {

        /*this.chain.pendingTransactions.push({
            "from": "0825b1b7d17ea1c1ff9ebe1c74d7c6d8a4a104dc",
            "to": "1234567890abcdef1234567890abcdef12345678",
            "value": 3000000,
            "fee": 100,
            "dateCreated": "2019-11-02T18:51:24.965Z", // after genesis block
            "data": "genesis tx",
            "senderPubKey": "00000000000000000000000000000000000000000000000000000000000000000",
            "transactionDataHash": "123456789012345bd456790be94a0b56557a4f3ec6b05f06a19e74e73368c82b",
            "senderSignature": [
                "0000000000000000000000000000000000000000000000000000000000000000",
                "0000000000000000000000000000000000000000000000000000000000000000"
            ],
            "minedInBlockIndex": null,
            "transferSuccessful": false
        });*/

        minerAddress = minerAddress.trim();
        minerAddress = minerAddress.toLowerCase();

        if (!utils.isValidAddress(minerAddress)) {
            return { errorMsg: "Invalid Miner Address: Miner Address should be a 40-Hex string" }
        }

        let pendingTransactionsConsideredForNextBlock = JSON.parse(JSON.stringify(this.chain.pendingTransactions));

        // Sort transactions in descending order of fees
        pendingTransactionsConsideredForNextBlock.sort(function(a, b) { return b.fee - a.fee });

        let pendingTransactionsToBePlacedInNextBlockForMiningMap = new Map();

        let confirmedBalancesMap = this.chain.getConfirmedBalances();

        let nextBlockIndex = this.chain.blocks.length;

        // Block reward for the miner
        let coinbaseTransactionValue = 5000000;

        console.log('Pending Transaction Length: ' + pendingTransactionsConsideredForNextBlock.length);

        // Executes all pending transactions and adds them in the block candidate
        for (let i = 0; i < pendingTransactionsConsideredForNextBlock.length; i++) {
            let pendingTransaction = pendingTransactionsConsideredForNextBlock[i];

            if (!confirmedBalancesMap.has(pendingTransaction.from)) {
                confirmedBalancesMap.set(pendingTransaction.from, 0);
            }

            if (!confirmedBalancesMap.has(pendingTransaction.to)) {
                confirmedBalancesMap.set(pendingTransaction.to, 0);
            }

            // if "from" Public Address has enough fees and value, set transferSuccessful to true
            // if "from" Public Address has enough fees and not value, set transferSuccessful to false
            // if "from" Public Address has enough fees, remove it from pending transactions

            if (confirmedBalancesMap.get(pendingTransaction.from) >= pendingTransaction.fee) {
                pendingTransaction.minedInBlockIndex = nextBlockIndex;

                // The "from" address in a Transaction always pays the fee.
                let tempBalance = confirmedBalancesMap.get(pendingTransaction.from);
                tempBalance -= pendingTransaction.fee;
                confirmedBalancesMap.set(pendingTransaction.from, tempBalance);

                // Add the "fee" to the Coinbase Transaction Value field.
                coinbaseTransactionValue += pendingTransaction.fee;

                if (confirmedBalancesMap.get(pendingTransaction.from) >= (pendingTransaction.fee + pendingTransaction.value)) {
                    // Debit value from 'From' address
                    tempBalance = confirmedBalancesMap.get(pendingTransaction.from);
                    tempBalance -= pendingTransaction.value;
                    confirmedBalancesMap.set(pendingTransaction.from, tempBalance);

                    // Credit value to 'To' address
                    tempBalance = confirmedBalancesMap.get(pendingTransaction.to);
                    tempBalance += pendingTransaction.value;
                    confirmedBalancesMap.set(pendingTransaction.to, tempBalance);

                    pendingTransaction.transferSuccessful = true;
                } else {
                    pendingTransaction.transferSuccessful = false;
                }

                // At this point, we know that the Pending Transaction can be placed in the Next Block to be Mined.
                pendingTransactionsToBePlacedInNextBlockForMiningMap.set(pendingTransaction.from, pendingTransaction);

            } else  {
                // if 'from' Address does not have enough fees, remove it from the pending transaction list
                this.chain.pendingTransactions = this.chain.pendingTransactions.filter(aTransaction =>
                    aTransaction.transactionDataHash != pendingTransaction.transactionDataHash);
            }

        }

        // Create coinbase Transaction
        let coinbaseTransaction = new Transaction(
            GenesisBlock.genesisFromAddress, // from: address (40 hex digits) string
            minerAddress, // to: address (40 hex digits) string
            coinbaseTransactionValue, // value: integer (non negative)
            0, // fee: integer (non negative)
            GenesisBlock.genesisDateCreated, // ISO8601_string
            "coinbase tx", // data: string (optional)
            GenesisBlock.genesisSenderPubKey, // senderPubKey: hex_number[65] string
            // senderSignature: hex_number[2][64] : 2-element array of (64 hex digit) strings
            [GenesisBlock.genesisSenderSignature, GenesisBlock.genesisSenderSignature],
            nextBlockIndex, // minedInBlockIndex: integer / null
            true); // transferSuccessful: boolean


        // Add the Coinbase transaction first and then the remaining transactions
        let transactionsToBePlacedInNextBlockForMining = [ coinbaseTransaction ];
        transactionsToBePlacedInNextBlockForMining.push.apply(
            transactionsToBePlacedInNextBlockForMining,
            Array.from(pendingTransactionsToBePlacedInNextBlockForMiningMap.values()));

        // console.log('nextBlockIndex = ', nextBlockIndex);
        // console.log('this.chain.blocks =', this.chain.blocks);

        // Create the next Block to be Mined.
        let blockToBeMined = new Block(
            nextBlockIndex, // Index: integer (unsigned)
            transactionsToBePlacedInNextBlockForMining, // Transactions : Transaction[]
            this.chain.currentDifficulty, // Difficulty: integer (unsigned)
            this.chain.blocks[nextBlockIndex - 1].blockHash, // PrevBlockHash: hex_number[64] string
            minerAddress); // MinedBy: address (40 hex digits) string

        // Populate the mining job
        this.chain.miningJobs.set(blockToBeMined.blockDataHash, blockToBeMined);

        // console.log('blockToBeMined.transactions =', blockToBeMined.transactions);
        // console.log('this.chain.miningJobs =', this.chain.miningJobs);

        let response = {
            'index': blockToBeMined.index,
            'transactionsIncluded': blockToBeMined.transactions.length,
            'difficulty': blockToBeMined.difficulty,
            'expectedReward': blockToBeMined.transactions[0].value,
            'rewardAddress': blockToBeMined.transactions[0].to,
            'blockDataHash': blockToBeMined.blockDataHash
        };

        return response;

    }

    // Submit Block Endpoint
    // With this endpoint you will submit a mined block.
    submitMinedBlock(inputMinedBlockJson) {

        // Check for missing fields
        if (!inputMinedBlockJson.hasOwnProperty("blockDataHash")) {
            return { errorMsg: "Invalid Mined Block: field 'blockDataHash' is missing" };
        }
        if (!inputMinedBlockJson.hasOwnProperty("dateCreated")) {
            return { errorMsg: "Invalid Mined Block: field 'dateCreated' is missing" };
        }
        if (!inputMinedBlockJson.hasOwnProperty("nonce")) {
            return { errorMsg: "Invalid Mined Block: field 'nonce' is missing" };
        }
        if (!inputMinedBlockJson.hasOwnProperty("blockHash")) {
            return { errorMsg: "Invalid Mined Block: field 'blockHash' is missing" };
        }

        // Check for invalid fields
        if (typeof inputMinedBlockJson.blockDataHash !== 'string') {
            return { errorMsg: "Invalid Mined Block: field 'blockDataHash' should be a 64-Hex string" };
        }
        if (typeof inputMinedBlockJson.dateCreated !== 'string') {
            return { errorMsg: "Invalid Mined Block: field 'dateCreated' should be a ISO8601 date string format" };
        }
        if (!Number.isInteger(inputMinedBlockJson.nonce)) {
            return { errorMsg: "Invalid Mined Block: field 'nonce' should be an integer" };
        }
        if (typeof inputMinedBlockJson.blockHash !== 'string') {
            return { errorMsg: "Invalid Mined Block: field 'blockHash' should be a 64-Hex string" };
        }

        // Trim whitespaces from fields
        inputMinedBlockJson.blockDataHash = inputMinedBlockJson.blockDataHash.trim();
        inputMinedBlockJson.dateCreated = inputMinedBlockJson.dateCreated.trim();
        inputMinedBlockJson.blockHash = inputMinedBlockJson.blockHash.trim();

        // Convert Hex-valued strings to lower case
        inputMinedBlockJson.blockDataHash = inputMinedBlockJson.blockDataHash.toLowerCase();
        inputMinedBlockJson.blockHash = inputMinedBlockJson.blockHash.toLowerCase();

        // Check for invalid field values
        if (!utils.isValid_64_Hex_string(inputMinedBlockJson.blockDataHash)) {
            return { errorMsg: "Invalid Mined Block: field 'blockDataHash' should be a 64-Hex string" };
        }
        if (!utils.isValid_64_Hex_string(inputMinedBlockJson.blockHash)) {
            return { errorMsg: "Invalid Mined Block: field 'blockHash' should be a 64-Hex string" };
        }
        if (!utils.isValid_ISO_8601_date(inputMinedBlockJson.dateCreated)) {
            return { errorMsg: "Invalid Mined Block: field 'dateCreated' should be an ISO8601 date string format " };
        }
        if (inputMinedBlockJson.nonce < 0) {
            return { errorMsg: "Invalid Mined Block: field 'nonce' should be greater than or equal to 0" };
        }

        // Check if the Block has already been mined from the miningJob
        if (!this.chain.miningJobs.has(inputMinedBlockJson.blockDataHash)) {
            return { errorMsg: "Block not found or already mined" }
        }

        let potentialNewBlockCandidate = this.chain.miningJobs.get(inputMinedBlockJson.blockDataHash);

        potentialNewBlockCandidate.nonce = inputMinedBlockJson.nonce;
        potentialNewBlockCandidate.dateCreated = inputMinedBlockJson.dateCreated;
        potentialNewBlockCandidate.blockHash = potentialNewBlockCandidate.calculateBlockHash();

        // Verify that the blockHash from request matches with the newly calculated block hash.
        if (potentialNewBlockCandidate.blockHash !== inputMinedBlockJson.blockHash) {
            return { errorMsg: "Invalid Mined Block: Incorrect 'blockHash' field value provided" }
        }

        // Verify if the difficulty is met (if the submitted blockhash has correct leading zeros)
        let leadingZeros = ''.padStart(potentialNewBlockCandidate.difficulty, '0');
        if (!inputMinedBlockJson.blockHash.startsWith(leadingZeros)) {
            return { errorMsg: "Invalid Mined Block: 'blockHash' field value provided does not match the Block difficulty" }
        }

        // Verify if the minedBlock's prevBlockHash from request matches with the chain's prevBlockHash
        let previousBlock = this.chain.blocks[this.chain.blocks.length -1];
        console.log('# of blocks before adding: ' + this.chain.blocks.length);
        if (potentialNewBlockCandidate.prevBlockHash !== previousBlock.blockHash) {
            return { errorMsg: "Invalid Mined Block: Previous Block Hash value does not match in the chain" }
        }

        // The new mined block is added to the chain
        this.chain.blocks.push(potentialNewBlockCandidate);

        // Once the block is mined, all pending mining jobs are deleted for this block
        this.chain.miningJobs.clear();

        // Remove all the transactions in the newly added block from chain's pendingTransactions list.
        for (let i = 0; i < potentialNewBlockCandidate.transactions.length; i++) {
            let transactionToRemove = potentialNewBlockCandidate.transactions[i];
            this.chain.pendingTransactions = this.chain.pendingTransactions.filter(transaction =>
                transaction.transactionDataHash !== transactionToRemove.transactionDataHash);
        }

        // TODO change block difficulty level dynamically

        let response = {
            message: `Block accepted, reward paid: ${potentialNewBlockCandidate.transactions[0].value} microcoins`
        };

        return response;

    }

    // Debug: Mine a Block Endpoint
    // With this endpoint you can mine with the difficulty that you want. Use it only for debugging purposes.
    // Executes the entire mining process: get mining job -> calculate valid proof of work hash -> submit the mined job
    debugMineBlock(minerAddress, difficulty){

        // Check for invalid fields
        if (!utils.isValidAddress(minerAddress)) {
            return { errorMsg: "Invalid debug mine block: 'minerAddress' should be a 40-Hex string" };
        }
        if (!utils.isNumeric(difficulty)) {
            return { errorMsg: "Invalid debug mine block: 'difficulty' should be a positive number" };
        }

        // Step 1: get mining job
        let currentDifficulty = this.chain.currentDifficulty;
        this.chain.currentDifficulty = parseInt(difficulty); // Only for debugging
        let getMiningJobResponse = this.getMiningJob(minerAddress);
        // Replace difficulty with original after retrieving the job
        this.chain.currentDifficulty = currentDifficulty;
        if (getMiningJobResponse.hasOwnProperty("errorMsg")) {
            return getMiningJobResponse;
        }

        // Block to be Mined
        let blockToBeMined = this.chain.miningJobs.get(getMiningJobResponse.blockDataHash);
        if (!blockToBeMined) {
            return { errorMsg: "Block not found in chain's mining job" }
        }

        // Step 2: calculate valid proof of work hash
        // Keep finding the hash such that it matches the difficulty level (leading zeros)
        blockToBeMined.dateCreated = new Date().toISOString();
        blockToBeMined.nonce = 0;
        let leadingZeros = ''.padStart(blockToBeMined.difficulty, '0');
        while (true) {
            blockToBeMined.blockHash = blockToBeMined.calculateBlockHash();
            if (blockToBeMined.blockHash.startsWith(leadingZeros)) {
                break;
            }
            blockToBeMined.nonce++;
        }

        console.log('Calculated POW hash: ' + blockToBeMined.blockHash);

        // Step 3: submit the mined job
        let submitMinedBlockInput = {
            blockDataHash: blockToBeMined.blockDataHash,
            dateCreated: blockToBeMined.dateCreated,
            nonce: blockToBeMined.nonce,
            blockHash: blockToBeMined.blockHash
        }

        let submitMinedBlockResponse = this.submitMinedBlock(submitMinedBlockInput);
        if (submitMinedBlockResponse.hasOwnProperty("errorMsg")) {
            return submitMinedBlockResponse;
        }

        let submittedMinedBlock = this.chain.blocks[this.chain.blocks.length - 1];
        if (submittedMinedBlock.blockHash !== blockToBeMined.blockHash) {
            return { errorMsg: "submittedMinedBlock's blockhash does not match" }
        }

        let response = {
            index: submittedMinedBlock.index,
            transactions: submittedMinedBlock.transactions,
            difficulty: submittedMinedBlock.difficulty,
            minedBy: submittedMinedBlock.minedBy,
            dateCreated: submittedMinedBlock.dateCreated
        };

        return response;

    }

    // List All Peers Endpoint
    // This endpoint will return all the peers of the node.
    listAllPeers() {
        let response = utils.strMapToObj(this.peers);
        return response;
    }

    // Connect a Peer Endpoint
    // With this endpoint, you can manually connect to other nodes.
    async connectToPeer(inputJson) {

        //console.log(inputJson);

        // Check for missing fields
        if (!inputJson.hasOwnProperty("peerUrl")) {
            return {
                errorType: badRequestErrorType,
                errorMsg: "Field 'peerUrl' is missing"
            }
        }

        // Check for valid fields
        if (typeof inputJson.peerUrl !== 'string') {
            return {
                errorType: badRequestErrorType,
                errorMsg: "Field 'peerUrl' should be a valid URL"
            }
        }

        // Trim the value
        inputJson.peerUrl = inputJson.peerUrl.trim();

        // Check for valid field values
        if (!inputJson.peerUrl.length > 0) {
            return {
                errorType: badRequestErrorType,
                errorMsg: "Field 'peerUrl' should be a valid URL"
            }
        }

        // To avoid double connecting to the same peer
        //   -> First get /info and check the nodeId
        //   -> Never connect twice to the same nodeId
        let restfulUrl = inputJson.peerUrl + "/info";
        let getNodeInfoSuccessResponse = undefined;
        await axios.get(restfulUrl, {timeout: restfulCallTimeout})
            .then(function (response) {
                //console.log('getNodeInfo.response.status: ', response.status);
                //console.log('getNodeInfo.response.data: ', response.data);
                getNodeInfoSuccessResponse = response.data;
            })
            .catch(function (error) {
                console.log('getNodeInfo.error.response.status: ', error.response.status);
                console.log('getNodeInfo.error.response.data: ', error.response.data);
            });

        if (getNodeInfoSuccessResponse === undefined) {
            return {
                errorType: badRequestErrorType,
                errorMsg: `Unable to connect to peer ${inputJson.peerUrl}`
            }
        }

        // If a node is already connected to given peer, return "409 Conflict"
        if (this.peers.has(getNodeInfoSuccessResponse.nodeId)) {
            return {
                errorType: confictErrorType,
                errorMsg: `Already connected to peer: ${inputJson.peerUrl}`
            }
        }

        // Never connect to the same nodeId
        if (this.nodeId == getNodeInfoSuccessResponse.nodeId) {
            return {
                errorType: confictErrorType,
                errorMsg: `Cannot connect to the same Node ID`
            }
        }

        // If the chain ID does not match, don't connect, return "400 Bad Request"
        if (this.chainId !== getNodeInfoSuccessResponse.chainId) {
            return {
                errorType: badRequestErrorType,
                errorMsg: `chainId ${getNodeInfoSuccessResponse.chainId} of peer ${inputJson.peerUrl} does not match with the chainId ${this.chainId} of this node`
            }
        }

        // validations are complete and peer can be added
        // For example, Alice is connected to Bob now
        this.peers.set(getNodeInfoSuccessResponse.nodeId, inputJson.peerUrl);
        console.log();
        console.log('this.peers: ', this.peers);
        console.log();


        // Ensure bi-directional connections
        // When Alice is connected to Bob, try to connect Bob to Alice
        // For example, Bob needs to connect to Alice now
        restfulUrl = inputJson.peerUrl + "/peers/connect";
        let postJsonInput = { peerUrl: this.selfUrl };
        let peersConnectSuccessResponse = undefined;
        let peersConnectErrorResponse = undefined;
        await axios.post(restfulUrl, postJsonInput, {timeout: restfulCallTimeout})
            .then(function (response) {
                //console.log('peersConnect.response.status: ', response.status);
                //console.log('peersConnect.response.data: ', response.data);
                peersConnectSuccessResponse = response.data;
            })
            .catch(function (error) {
                console.log('peersConnect.error.response.status: ', error.response.status);
                console.log('peersConnect.error.response.data: ', error.response.data);
                peersConnectErrorResponse = error;
            });

        if (peersConnectSuccessResponse === undefined && peersConnectErrorResponse === undefined) {
            this.peers.delete(getNodeInfoSuccessResponse.nodeId);
            return {
                errorType: badRequestErrorType,
                errorMsg: `Bi-directional connection with ${inputJson.peerUrl} peer failed due to timeout`
            }
        }

        // Synchronize the chain from peer
        await this.synchronizeChainFromPeer(getNodeInfoSuccessResponse);

        // Synchronize the pending transactions from peer
        await this.synchronizePendingTransactionFromPeer(getNodeInfoSuccessResponse);

        let response = {
            message: `Connected to peer: ${inputJson.peerUrl}`
        }

        return response;
    }

    // Synchronizing the pending transactions from certain peer
    // Download /transactions/pending and append the missing ones
    // Transactions with the same hash should never be duplicated
    async synchronizePendingTransactionFromPeer(peerInfo) {
        console.log('Start synchronizePendingTransactionFromPeer..');

        if (peerInfo.pendingTransactions === 0) {
            return { message: "No pending transactions to sync with peer" };
        }

        let transactionsPendingRestfulUrl = peerInfo.nodeUrl + "/transactions/pending";
        let transactionsPendingResponseData = undefined;
        await axios.get(transactionsPendingRestfulUrl, {timeout: restfulCallTimeout})
            .then(function (response) {
                //console.log('transactionsPending.response.status: ', response.status);
                console.log('transactionsPending.response.data: ', response.data);
                transactionsPendingResponseData = response.data;
            })
            .catch(function (error) {
                console.log('transactionsPending.error.response.status: ', error.response.status);
                console.log('transactionsPending.error.response.data: ', error.response.data);
            });

        // If there is no response, delete the peer node from the list of "peers".
        if (transactionsPendingResponseData === undefined) {
            this.peers.delete(peerInfo.nodeId);
            return {
                errorMsg: `Peer ${peerInfo.nodeUrl} did not respond with Status OK from call to /transactions/pending - deleted as peer`
            }
        }


        // Synchronize pending transactions from peer to this node's pending transaction list (Peer -> currentNode)
        // If there are any pending transactions with the same hash, it will not be included
        for (let i = 0; i < transactionsPendingResponseData.length; i++) {

            let pendingTransaction = transactionsPendingResponseData[i];
            let sendTransactionResponse = this.sendTransaction(pendingTransaction);

            if (sendTransactionResponse.hasOwnProperty("errorMsg")) {
                console.log('Successful sendTransaction from peer -> node: ', sendTransactionResponse);
            } else {
                console.log('Failed sendTransaction from peer -> node: ', sendTransactionResponse);
            }
        }

        //Synchronize this node's pending transaction to peer's pending transactions list (currentNode -> Peer)
        // If there are any pending transactions with the same hash, it will not be included
        for (let i = 0; i < this.chain.pendingTransactions.length; i++) {
            let pendingTransaction = this.chain.pendingTransactions[i];

            let transactionsSendRestfulUrl = peerInfo.nodeUrl + "/transactions/send";
            await axios.post(transactionsSendRestfulUrl, pendingTransaction, {timeout: restfulCallTimeout})
                .then(function (response) {
                    //console.log('transactionsSend.response.status: ', response.status);
                    //console.log('transactionsSend.response.data: ', response.data);
                    console.log('Successful sendTransaction from node -> peer: ', response.data);
                })
                .catch(function (error) {
                    //console.log('transactionsSend.error.response.status: ', error.response.status);
                    //console.log('transactionsSend.error.response.data: ', error.response.data);
                    console.log('Failed sendTransaction from node -> peer: ', error.response.data);
                });
        }

        console.log('End synchronizePendingTransactionFromPeer..');
    }

    // Synchronizing the chain from certain peer
    async synchronizeChainFromPeer(peerInfo) {

        console.log('Start synchronizeChainFromPeer..');

        // If peer's chain cumulativeDifficulty is less then or equal to cumulativeDifficulty of this chain, then just return and don't replace
        if (peerInfo.cumulativeDifficulty <= this.chain.calculateCumulativeDifficulty()) {
            return { message: `Chain from ${peerInfo.nodeUrl} has a 'cumulativeDifficulty' that is less than or equal to this Node's chain - will not synchronize with peer` };
        }

        // If the peer chain has bigger difficulty, download it from /blocks
        let getPeersBlocksRestfulUrl = peerInfo.nodeUrl + "/blocks";
        let getPeersBlocksSuccessResponse = undefined;
        await axios.get(getPeersBlocksRestfulUrl, {timeout: restfulCallTimeout})
            .then(function (response) {
                console.log('getPeersBlocks.response.status: ', response.status);
                console.log('getPeersBlocks.response.data: ', response.data);
                getPeersBlocksSuccessResponse = response.data;
            })
            .catch(function (error) {
                console.log('getPeersBlocks.error.response.status: ', error.response.status);
                console.log('getPeersBlocks.error.response.data: ', error.response.data);
            });


        // Remove peer if it is not responding with blocks
        if (getPeersBlocksSuccessResponse === undefined) {
            this.peers.delete(peerInfo.nodeId);
            return {
                errorType: badRequestErrorType,
                errorMsg: `Could not get blocks from ${getPeersBlocksRestfulUrl} and the peer ${peerInfo.nodeUrl} will be removed`
            }
        }

        // Validate the downloaded peer chain (blocks, transactions, etc.)
        let validationResponse = this.validateDownloadedPeerChain(peerInfo.cumulativeDifficulty, getPeersBlocksSuccessResponse);
        if (validationResponse.hasOwnProperty("errorMsg")) {
            return validationResponse;
        }

        // If the peer chain is valid, replace the current chain with it
        this.chain.blocks = getPeersBlocksSuccessResponse;

        // Clear all the mining jobs since this node's chain is replaced with peer's chain
        this.chain.miningJobs.clear();

        let response = {
            message: `Successfully synchronized peer's ${this.selfUrl} chain with other peer's ${peerInfo.nodeUrl} chain`,
            warnings: [ ]
        }

        // Notify all peers about the new chain
        let peerUrls = Array.from(this.peers.values());
        let peerNodeIds = Array.from(this.peers.keys());
        for (let i = 0; peerUrls.length; i++) {
            let peerUrl = peerUrls[i];

            let peerNotifyNewBlockRestfulUrl = peerUrl + "/peers/notify-new-block";
            let peerNotifyNewBlockJsonInput = {
                blocksCount: peerInfo.blocksCount,
                cumulativeDifficulty: peerInfo.cumulativeDifficulty,
                nodeUrl: peerInfo.nodeUrl
            }
            let peerNotifyNewBlockSuccessResponse = undefined;
            await axios.post(peerNotifyNewBlockRestfulUrl, peerNotifyNewBlockJsonInput, {timeout: restfulCallTimeout})
                .then(function (response) {
                    console.log('peerNotifyNewBlock.response.status: ', response.status);
                    console.log('peerNotifyNewBlock.response.data: ', response.data);
                    peerNotifyNewBlockSuccessResponse = response;
                })
                .catch(function (error) {
                    console.log('peerNotifyNewBlock.error.response.status: ', error.response.status);
                    console.log('peerNotifyNewBlock.error.response.data: ', error.response.data);
                });

            if (peerNotifyNewBlockSuccessResponse === undefined) {
                this.peers.delete(peerNodeIds[i]);
                response.warnings.push(` peerNotifyNewBlock call to ${peerNotifyNewBlockRestfulUrl} did not respond and the ${peerUrl} will be removed`);
            }
        }

        console.log('End synchronizeChainFromPeer..');

        return response;

    }

    // Validate all the blocks downloaded from peer
    validateDownloadedPeerChain(peerCumulativeDifficulty, peerBlocksToValidate){

        // Verify that size of Peer Blocks
        if (peerBlocksToValidate.length <= 0) {
            return {
                errorType: badRequestErrorType,
                errorMsg: "Peer Blocks is empty - has no Genesis Block"
            };
        }

        // Validate the genesis block  should be exactly the same
        // Calculate hash of both the blocks and compare
        let thisNode_genesisBlock_totalHash = CryptoJS.SHA256(JSON.stringify(this.chain.blocks[0])).toString();
        let peerNode_genesisBlock_totalHash = CryptoJS.SHA256(JSON.stringify(peerBlocksToValidate[0])).toString();
        if (thisNode_genesisBlock_totalHash !== peerNode_genesisBlock_totalHash) {
            return {
                errorType: badRequestErrorType,
                errorMsg: "Peer Genesis Block is not valid"
            };
        }

        // Re-calculate the cumulative difficulty of the downloaded chain
        let reCalculatedCumulativeDifficulty = 16 ** peerBlocksToValidate[0].difficulty;

        // Map to keep track of all the previous Block Hashes (blockHash => block)
        let previousBlockHashes = new Map();
        previousBlockHashes.set(peerBlocksToValidate[0].blockHash, peerBlocksToValidate[0]);

        // Map to keep track of all the previous Transaction Data Hashes (transactionDataHash => Transaction)
        let previousTransactionDataHashes = new Map();
        previousTransactionDataHashes.set(peerBlocksToValidate[0].transactions[0].transactionDataHash, peerBlocksToValidate[0].transactions[0]);

        // Map to keep track of all the confirmed balances of the Peer Chain Transactions (address => value)
        let confirmedAccountBalances = new Map();
        confirmedAccountBalances.set(peerBlocksToValidate[0].transactions[0].to, peerBlocksToValidate[0].transactions[0].value);


        // Validate each block from the first to the last
        for (let i = 1; i < peerBlocksToValidate.length; i++) {
            let blockToValidate = peerBlocksToValidate[i];

            // Validate that all block fields are present and have valid values

            // Check for missing fields
            if (!blockToValidate.hasOwnProperty("index")) {
                return {
                    errorMsg: `Peer Block ${i} has no 'index' field`,
                    errorType: badRequestErrorType
                };
            }
            if (!blockToValidate.hasOwnProperty("transactions")) {
                return {
                    errorMsg: `Peer Block ${i} has no 'transactions' field`,
                    errorType: badRequestErrorType
                };
            }
            if (!blockToValidate.hasOwnProperty("difficulty")) {
                return {
                    errorMsg: `Peer Block ${i} has no 'difficulty' field`,
                    errorType: badRequestErrorType
                };
            }
            if (!blockToValidate.hasOwnProperty("prevBlockHash")) {
                return {
                    errorMsg: `Peer Block ${i} has no 'prevBlockHash' field`,
                    errorType: badRequestErrorType
                };
            }
            if (!blockToValidate.hasOwnProperty("minedBy")) {
                return {
                    errorMsg: `Peer Block ${i} has no 'minedBy' field`,
                    errorType: badRequestErrorType
                };
            }
            if (!blockToValidate.hasOwnProperty("blockDataHash")) {
                return {
                    errorMsg: `Peer Block ${i} has no 'blockDataHash' field`,
                    errorType: badRequestErrorType
                };
            }
            if (!blockToValidate.hasOwnProperty("nonce")) {
                return {
                    errorMsg: `Peer Block ${i} has no 'nonce' field`,
                    errorType: badRequestErrorType
                };
            }
            if (!blockToValidate.hasOwnProperty("dateCreated")) {
                return {
                    errorMsg: `Peer Block ${i} has no 'dateCreated' field`,
                    errorType: badRequestErrorType
                };
            }
            if (!blockToValidate.hasOwnProperty("blockHash")) {
                return {
                    errorMsg: `Peer Block ${i} has no 'blockHash' field`,
                    errorType: badRequestErrorType
                };
            }

            // Check for valid fields
            if (!Number.isInteger(blockToValidate.index)) {
                return {
                    errorMsg: `Peer Block ${i} has an 'index' field that is not an integer - it should be an integer equal to ${i}`,
                    errorType: badRequestErrorType
                };
            }
            if (!Array.isArray(blockToValidate.transactions)) {
                return {
                    errorMsg: `Peer Block ${i} has a 'transactions' field that is not an array - it should be an array with Transaction objects`,
                    errorType: badRequestErrorType
                };
            }
            if (!Number.isInteger(blockToValidate.difficulty)) {
                return {
                    errorMsg: `Peer Block ${i} has an 'difficulty' field that is not an integer - it should be an integer greater than or equal to 0`,
                    errorType: badRequestErrorType
                };
            }
            if (typeof blockToValidate.prevBlockHash !== 'string') {
                return {
                    errorMsg: `Peer Block ${i} has a 'prevBlockHash' field that is not a string - it should be a 64-hex number lowercase string`,
                    errorType: badRequestErrorType
                };
            }
            if (typeof blockToValidate.minedBy !== 'string') {
                return {
                    errorMsg: `Peer Block ${i} has a 'minedBy' field that is not a string - it should be a public address 40-hex number lowercase string`,
                    errorType: badRequestErrorType
                };
            }
            if (typeof blockToValidate.blockDataHash !== 'string') {
                return {
                    errorMsg: `Peer Block ${i} has a 'blockDataHash' field that is not a string - it should be a 64-hex number lowercase string`,
                    errorType: badRequestErrorType
                };
            }
            if (!Number.isInteger(blockToValidate.nonce)) {
                return {
                    errorMsg: `Peer Block ${i} has a 'nonce' field that is not an integer - it should be an integer greater than or equal to 0`,
                    errorType: badRequestErrorType
                };
            }
            if (typeof blockToValidate.dateCreated !== 'string') {
                return {
                    errorMsg: `Peer Block ${i} has a 'dateCreated' field that is not a string - it should be an ISO8601 date string as follows: YYYY-MM-DDTHH:MN:SS.MSSZ`,
                    errorType: badRequestErrorType
                };
            }
            if (typeof blockToValidate.blockHash !== 'string') {
                return {
                    errorMsg: `Peer Block ${i} has a 'blockHash' field that is not a string - it should be a 64-hex number lowercase string`,
                    errorType: badRequestErrorType
                };
            }

            // Check for valid field values
            if (blockToValidate.index !== i) {
                return {
                    errorMsg: `Peer Block ${i} has an 'index' field with an incorrect integer value of ${blockToValidate.index} - it should be an integer equal to ${i}`,
                    errorType: badRequestErrorType
                };
            }
            if (blockToValidate.difficulty < 0) {
                return {
                    errorMsg: `Peer Block ${i} has a 'difficulty' field value that is less than 0 - it should be an integer greater than or equal to 0`,
                    errorType: badRequestErrorType
                };
            }
            if (!utils.isValid_64_Hex_string(blockToValidate.prevBlockHash)) {
                return {
                    errorMsg: `Peer Block ${i} has a 'prevBlockHash' field that is not a 64-hex number lowercase string - it should be a 64-hex number lowercase string`,
                    errorType: badRequestErrorType
                };
            }
            if (!utils.isValidAddress(blockToValidate.minedBy)) {
                return {
                    errorMsg: `Peer Block ${i} has a 'minedBy' field that is not a public address 40-hex number lowercase string - it should be a public address 40-hex number lowercase string`,
                    errorType: badRequestErrorType
                };
            }
            if (!utils.isValid_64_Hex_string(blockToValidate.blockDataHash)) {
                return {
                    errorMsg: `Peer Block ${i} has a 'blockDataHash' field that is not a 64-hex number lowercase string - it should be a 64-hex number lowercase string`,
                    errorType: badRequestErrorType
                };
            }
            if (blockToValidate.nonce < 0) {
                return {
                    errorMsg: `Peer Block ${i} has a 'nonce' field that is an integer less than 0 - it should be an integer greater than or equal to 0`,
                    errorType: badRequestErrorType
                };
            }
            if (!utils.isValid_ISO_8601_date(blockToValidate.dateCreated)) {
                return {
                    errorMsg: `Peer Block ${i} has a 'dateCreated' field that is not valid ISO8601 date string - it should be an ISO8601 date string as follows: YYYY-MM-DDTHH:MN:SS.MSSZ`,
                    errorType: badRequestErrorType
                };
            }
            if (!utils.isValid_64_Hex_string(blockToValidate.blockHash)) {
                return {
                    errorMsg: `Peer Block ${i} has a 'blockHash' field that is not a 64-hex number lowercase string - it should be a 64-hex number lowercase string`,
                    errorType: badRequestErrorType
                };
            }



            // Re-calculate the blockDataHash and blockHash
            let blockToValidateCopy = new Block(
                blockToValidate.index, // Index: integer (unsigned)
                blockToValidate.transactions, // Transactions : Transaction[]
                blockToValidate.difficulty, // Difficulty: integer (unsigned)
                blockToValidate.prevBlockHash, // PrevBlockHash: hex_number[64] string
                blockToValidate.minedBy, // MinedBy: address (40 hex digits) string

                // Assigned by the Miners
                blockToValidate.nonce, // Nonce: integer (unsigned)
                blockToValidate.dateCreated, // DateCreated : ISO8601_string
                blockToValidate.blockHash); // // BlockHash: hex_number[64] string

            // Re-calculate the block data hash of the block and make sure that it's equal to the "blockToValidate.blockDataHash" value.
            if (blockToValidate.blockDataHash !== blockToValidateCopy.calculateBlockDataHash()) {
                return {
                    errorMsg: `Peer Block ${i} has an incorrectly calculated 'blockDataHash' field value`,
                    errorType: badRequestErrorType
                };
            }

            // Re-calculate the block hash of the block and make sure that it's equal to the "blockToValidate.blockHash" value.
            if (blockToValidate.blockHash !== blockToValidateCopy.calculateBlockHash()) {
                return {
                    errorMsg: `Peer Block ${i} has an incorrectly calculated 'blockHash' field value`,
                    errorType: badRequestErrorType
                };
            }

            // Verify that the "blockToValidate.blockHash" is not the Block Hash of a previous block. If it's not, then place it in the
            // "previousBlockHashes" Map for future reference.
            if (previousBlockHashes.has(blockToValidate.blockHash)) {
                return {
                    errorMsg: `Peer Block ${i} has 'blockHash' field value that is the same as a previous block - each block in the blockchain should have a unique block hash`,
                    errorType: badRequestErrorType
                };
            }
            previousBlockHashes.set(blockToValidate.blockHash, blockToValidate);

            // Validate that prevBlockHash == the hash of the previous block
            if (blockToValidate.prevBlockHash !== blocks[i-1].blockHash) {
                return {
                    errorMsg: `Peer Block ${i} has a 'prevBlockHash' field value that is not equal to the 'blockHash' field value of previous Peer Block ${i-1} - they should have the same value`,
                    errorType: badRequestErrorType
                };
            }

            // Ensure the block hash matches the block difficulty
            let leadingZeros = ''.padStart(blockToValidate.difficulty, '0');
            if (!blockToValidate.blockHash.startsWith(leadingZeros)) {
                return { errorMsg: `Peer Block ${i} has a 'blockHash' field value that does not match it's Block difficulty` }
            }

            // Re-calculate the cumulative difficulty of the incoming chain
            reCalculatedCumulativeDifficulty += 16 ** blockToValidate.difficulty;

            // Validate the transactions in the block
            let validateTransactionsResponse = this.validateTransactionsInBlock(blockToValidate, previousTransactionDataHashes, confirmedAccountBalances);
            if (validateTransactionsResponse.hasOwnProperty("errorMsg")) {
                return {
                    errorMsg: validateTransactionsResponse,
                    errorType: badRequestErrorType
                }
            }
        } // End of for loop

        // Let's check to see that the "peerCumulativeDifficulty" was calculated correctly by the Peer. It should equal the
        // "reCalculatedCumulativeDifficulty" we just calculated.
        if (peerCumulativeDifficulty !== reCalculatedCumulativeDifficulty) {
            return {
                errorMsg: `Peer Blockchain has incorrectly calculated it's 'cumulativeDifficulty' - cannot use this peer chain`,
                errorType: badRequestErrorType
            };
        }

        // If the cumulative difficulty > current cumulative difficulty, then Replace the current chain with the incoming chain
        if (this.chain.calculateCumulativeDifficulty() >= peerCumulativeDifficulty) {
            return {
                errorMsg: `Peer cumulative difficulty is NOT greater than this node's cumulative difficulty - cannot use this peer chain`,
                errorType: badRequestErrorType
            };
        }

        let response = { message: "successful validation" }
        return response;
    }


    // Validate the transactions in the block of a peer
    // Step 1 -> Validate transaction fields and their values , recalculate the transaction data hash , validate the signature
    // Step 2 -> Re-execute all transactions, re calculate the values of minedInBlockIndex and transferSuccessful fields
    //
    // Input:
    // blockToValidate - peer Block with all the transactions
    // previousTransactionDataHashesMap - map of (transactionDataHash => Transaction)
    // confirmedAccountBalancesMap - map of  (address => value)
    validateTransactionsInBlock(blockToValidate, previousTransactionDataHashesMap, confirmedAccountBalancesMap) {

        // Validate that the block has at least one transaction.
        if (blockToValidate.transactions.length === 0) {
            return { errorMsg: `Peer Block ${blockToValidate.index} has no Transactions - there should be at least one Transaction` };
        }

        // Block reward for the miner
        let coinbaseTransactionValue = 5000000;

        // Go through each Transaction and validate it.
        for (let i = 0; i < blockToValidate.transactions.length; i++) {

            let transactionToValidate = blockToValidate.transactions[i];

            // Check for missing fields
            if (!transactionToValidate.hasOwnProperty("from")) {
                return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Transaction ${i}: field 'from' is missing` };
            }
            if (!transactionToValidate.hasOwnProperty("to")) {
                return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Transaction ${i}: field 'to' is missing` };
            }
            if (!transactionToValidate.hasOwnProperty("value")) {
                return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Transaction ${i}: field 'value' is missing` };
            }
            if (!transactionToValidate.hasOwnProperty("fee")) {
                return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Transaction ${i}: field 'fee' is missing` };
            }
            if (!transactionToValidate.hasOwnProperty("dateCreated")) {
                return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Transaction ${i}: field 'dateCreated' is missing`};
            }
            if (!transactionToValidate.hasOwnProperty("data")) {
                return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Transaction ${i}: field 'data' is missing` };
            }
            if (!transactionToValidate.hasOwnProperty("senderPubKey")) {
                return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Transaction ${i}: field 'senderPubKey' is missing` };
            }
            if (!transactionToValidate.hasOwnProperty("transactionDataHash")) {
                return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Transaction ${i}: field 'transactionDataHash' is missing` };
            }
            if (!transactionToValidate.hasOwnProperty("senderSignature")) {
                return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Transaction ${i}: field 'senderSignature' is missing` };
            }
            if (!transactionToValidate.hasOwnProperty("minedInBlockIndex")) {
                return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Transaction ${i}: field 'minedInBlockIndex' is missing` };
            }
            if (!transactionToValidate.hasOwnProperty("transferSuccessful")) {
                return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Transaction ${i}: field 'transferSuccessful' is missing` };
            }

            // Check for valid fields
            if (typeof transactionToValidate.from !== 'string') {
                return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Transaction ${i}: field 'from' is not a string - it should be a 40-Hex lowercase string` };
            }
            if (typeof transactionToValidate.to !== 'string') {
                return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Transaction ${i}: field 'to' is not a string - it should be a 40-Hex lowercase string` };
            }
            if (!Number.isInteger(transactionToValidate.value)) {
                return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Transaction ${i}: field 'value' is not an integer - it should be an integer greater than or equal to 0` };
            }
            if (!Number.isInteger(transactionToValidate.fee)) {
                return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Transaction ${i}: field 'fee' is not an integer - it should be an integer greater than or equal to 10` };
            }
            if (typeof transactionToValidate.dateCreated !== 'string') {
                return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Transaction ${i}: field 'dateCreated' is not a string - it should be an ISO8601 date string as follows: YYYY-MM-DDTHH:MN:SS.MSSZ` };
            }
            if (typeof transactionToValidate.data !== 'string') {
                return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Transaction ${i}: field 'data' is not a string - it should be a string` };
            }
            if (typeof transactionToValidate.senderPubKey !== 'string') {
                return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Transaction ${i}: field 'senderPubKey' is not a string - it should be a 65-Hex lowercase string` };
            }
            if (typeof transactionToValidate.transactionDataHash !== 'string') {
                return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Transaction ${i}: field 'transactionDataHash' is not a string - it should be a 64-Hex lowercase string` };
            }
            if (!Array.isArray(transactionToValidate.senderSignature)) {
                return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Transaction ${i}: field 'senderSignature' is not an array - it should be a 2-element array of [64-hex lowercase string][64-hex lowercase string]` };
            }
            if (!Number.isInteger(transactionToValidate.minedInBlockIndex)) {
                return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Transaction ${i}: field 'minedInBlockIndex' is not an integer - it should be an integer greater than or equal to 0 and equal to the Block Index number it was mined` };
            }
            if (typeof transactionToValidate.transferSuccessful !== 'boolean') {
                return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Transaction ${i}: field 'transferSuccessful' is not a boolean - it should be a boolean` };
            }

            // Check that the "senderSignature" is a two-element array.
            if (transactionToValidate.senderSignature.length !== 2) {
                return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Transaction ${i}: array field 'senderSignature' does not have 2 elements - it should be a 2-element array of [64-hex lowercase string][64-hex lowercase string]` };
            }

            // Check that the first and second elements of the "senderSignature" array are each strings
            if (typeof transactionToValidate.senderSignature[0] !== 'string') {
                return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Transaction ${i}: first element of array field 'senderSignature' is not a string - it should be a 64-hex lowercase string` };
            }
            if (typeof transactionToValidate.senderSignature[1] !== 'string') {
                return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Transaction ${i}: second element of array field 'senderSignature' is not a string - it should be a 64-hex lowercase string` };
            }

            // Check for valid field values
            // Check that the "to" and "from" fields have valid Public Address string values.
            if (!utils.isValidAddress(transactionToValidate.from)) {
                return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Transaction ${i}: string field 'from' is not a 40-Hex string - it should be a 40-Hex lowercase string` };
            }
            if (!utils.isValidAddress(transactionToValidate.to)) {
                return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Transaction ${i}: string field 'to' is not a 40-Hex string - it should be a 40-Hex lowercase string` };
            }

            // Check that the number "value" field has a value that is greater than or equal to zero.
            if (transactionToValidate.value < 0) {
                return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Transaction ${i}: number field 'value' is less than 0 - it should be a number greater than or equal to 0` };
            }

            // Check that the "dateCreated" field is a valid ISO8601 date string.
            if (!utils.isValid_ISO_8601_date(transactionToValidate.dateCreated)) {
                return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Transaction ${i}: field 'dateCreated' is not an ISO8601 date string - it should be an ISO8601 date string as follows: YYYY-MM-DDTHH:MN:SS.MSSZ` };
            }

            // Check that the "minedInBlockIndex" field has a value that equals the block index of the Block that it is inside.
            if (transactionToValidate.minedInBlockIndex !== blockToValidate.index) {
                return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Transaction ${i}: field 'minedInBlockIndex' is not equal to the Block Index number of the Block that it is inside` };
            }

            // Create a copy of the "transactionToValidate" so that we can have the "transactionDataHash" automatically re-calculated and check
            // that the "transactionToValidate.transactionDataHash" field has the correct calue.
            let transactionToValidateCopy = new Transaction(
                transactionToValidate.from, // address (40 hex digits) string
                transactionToValidate.to, // address (40 hex digits) string
                transactionToValidate.value, // integer (non negative)
                transactionToValidate.fee, // integer (non negative)
                transactionToValidate.dateCreated, // ISO8601_string
                transactionToValidate.data, // string (optional)
                transactionToValidate.senderPubKey, // hex_number[65] string
                transactionToValidate.senderSignature, // hex_number[2][64] : 2-element array of (64 hex digit) strings
                transactionToValidate.minedInBlockIndex, // integer / null
                transactionToValidate.transferSuccessful); // boolean
            if (transactionToValidate.transactionDataHash !== transactionToValidateCopy.transactionDataHash) {
                return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Transaction ${i}: field 'transactionDataHash' has an incorrect calculated value` };
            }

            // Let's verify if there exists a previous Transaction with the same "transactionDataHash" value. If no such previous Transaction exists, then
            // add it to the "previousTransactionDataHashesMap".
            if (previousTransactionDataHashesMap.has(transactionToValidate.transactionDataHash)) {
                return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Transaction ${i}: there exists previously in the blockchain a transaction with the same 'transactionDataHash' value: ${transactionToValidate.transactionDataHash}` };
            }
            previousTransactionDataHashesMap.set(transactionToValidate.transactionDataHash, transactionToValidate);

            // Check that the "senderPubKey" field is a valid Public Key string value.
            if (!utils.isValidPublicKey(transactionToValidate.senderPubKey)) {
                return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Transaction ${i}: field 'senderPubKey' is not a 65-Hex lowercase string - it should be a 65-Hex lowercase string` };
            }

            // Check that the first and second elements of the "senderSignature" array are each 64-Hex string
            if (!utils.isValid_64_Hex_string(transactionToValidate.senderSignature[0])) {
                return { errorMsg: `Invalid transaction: first element of array field 'senderSignature' is not a 64-hex lowercase string value - it should be a 64-hex lowercase string` };
            }
            if (!utils.isValid_64_Hex_string(transactionToValidate.senderSignature[1])) {
                return { errorMsg: `Invalid transaction: second element of array field 'senderSignature' is not a 64-hex lowercase string value - it should be a 64-hex lowercase string` };
            }

            // If this is the first Transaction in the Block, then we need to verify that it's a Coinbase Transaction with the correct values.
            if (i === 0) {
                // Verify correct "from" address value
                if (transactionToValidate.from !== GenesisBlock.genesisFromAddress) {
                    return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Coinbase Transaction ${i}: field 'from' is not equal a 40-Hex all zeros string value` };
                }

                // Verify correct "fee" value
                if (transactionToValidate.fee !== 0) {
                    return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Coinbase Transaction ${i}: field 'fee' is not equal to 0 (zero) - instead it's equal to ${transactionToValidate.fee}` };
                }

                // Verify that the "value" field is at least equal to the Block Reward of 5,000,000 micro-coins
                if (transactionToValidate.value < coinbaseTransactionValue) {
                    return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Coinbase Transaction ${i}: field 'value' is not equal to at least the block reward of ${coinbaseTransactionValue} micro-coins` };
                }

                // Verify the correct "data" value depending upon whether this is the Genesis Block or not.
                if (transactionToValidate.minedInBlockIndex === 0) {
                    if (transactionToValidate.data !== "genesis tx") {
                        return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Genesis Block Coinbase Transaction ${i}: field 'data' is not equal to 'genesis tx' string` };
                    }
                }
                else {
                    if (transactionToValidate.data !== "coinbase tx") {
                        return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Coinbase Transaction ${i}: field 'data' is not equal to 'coinbase tx' string` };
                    }
                }

                // Verify that the "senderPubKey" field is an all Zeros 65-Hex string
                if (transactionToValidate.senderPubKey != GenesisBlock.genesisSenderPubKey) {
                    return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Coinbase Transaction ${i}: field 'senderPubKey' is not equal to an all zeros 65-Hex string` };
                }

                // Check that the first and second elements of the "senderSignature" array are each all Zeros 64-hex strings
                if (transactionToValidate.senderSignature[0] !== GenesisBlock.genesisSenderSignature) {
                    return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Coinbase Transaction ${i}: first element of array field 'senderSignature' is not an all zeros 64-hex string` };
                }
                if (transactionToValidate.senderSignature[1] !== GenesisBlock.genesisSenderSignature) {
                    return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Coinbase Transaction ${i}: second element of array field 'senderSignature' is not an all zeros 64-hex string` };
                }

                // Verify that the "transferSuccessful" field has a boolean true value
                if (!transactionToValidate.transferSuccessful) {
                    return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Coinbase Transaction ${i}: field 'transferSuccessful' is equal to boolean false - it should be equal to boolean true` };
                }

                // Check first to see if the "to" Public Addess is in the "confirmedAccountBalancesMap", and if it is not, then add it initially with
                // a balance of 0.
                if (!confirmedAccountBalancesMap.has(transactionToValidate.to)) {
                    confirmedAccountBalancesMap.set(transactionToValidate.to, 0);
                }

                // Now add in the correct balance for the Coinbase Transaction "to" Public Address to the "confirmedAccountBalancesMap".
                // No need to worry about the "fee" for the Coinbase Transation, because it will always be zero.
                let tempAmount = confirmedAccountBalancesMap.get(transactionToValidate.to);
                tempAmount += transactionToValidate.value;
                confirmedAccountBalancesMap.set(transactionToValidate.to, tempAmount);

                continue;

            }

            // Check that the number "fee" field has a value that is greater than or equal to 10.
            if (transactionToValidate.fee < 10) {
                return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Transaction ${i}: number field 'fee' is less than 10 - it should be a number greater than or equal to 10` };
            }

            // Validate the "senderPubKey": Make sure that the Public Address obtained from the "senderPubKey" matches the "to" Address.
            let calculatedSenderPublicAddress = CryptoUtils.getPublicAddressFromPublicKey(transactionToValidate.senderPubKey);
            if (transactionToValidate.from !== calculatedSenderPublicAddress) {
                return { errorMsg: `Invalid transaction: field 'senderPubKey' does not match the 'from' public address when derving the public address from the public key` };
            }

            // Validate the "senderSignature" to make sure that the "from" Public Address signed the Transaction.
            let validSignature = CryptoUtils.verifySignature(
                transactionToValidate.transactionDataHash,
                transactionToValidate.senderPubKey,
                { r: transactionToValidate.senderSignature[0], s: transactionToValidate.senderSignature[1]} );
            if (!validSignature) {
                return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Transaction ${i}: Invalid signature in the 'senderSignature' field` };
            }

            // Re-calculate balances to make sure that there are enough balances in the accounts inside of the Transaction
            if (!confirmedAccountBalancesMap.has(transactionToValidate.from)) {
                confirmedAccountBalancesMap.set(transactionToValidate.from, 0);
            }
            if (!confirmedAccountBalancesMap.has(transactionToValidate.to)) {
                confirmedAccountBalancesMap.set(transactionToValidate.to, 0);
            }

            // 'From' should at least have balance of fee to pay
            if (confirmedAccountBalancesMap.get(transactionToValidate.from) < transactionToValidate.fee) {
                return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Transaction ${i}: Transaction in chain where the ${transactionToValidate.from} 'from' public address does not have enough to cover the ${transactionToValidate.fee} micro-coins amount - balance at the time was ${confirmedAccountBalancesMap.get(transactionToValidate.from)} micro-coins` };
            }

            coinbaseTransactionValue += transactionToValidate.fee;

            // Subtract the "fee" amount from the "from" public address (regardless of whether transaction is successful or not)
            let tempFeeAmount = confirmedAccountBalancesMap.get(transactionToValidate.from);
            tempFeeAmount -= transactionToValidate.fee;
            confirmedAccountBalancesMap.set(transactionToValidate.from, tempFeeAmount);


            // If "from" public address does not enough value, transferSuccessful should have been false
            if (confirmedAccountBalancesMap.get(transactionToValidate.from) < transactionToValidate.value) {

                if (transactionToValidate.transferSuccessful !== false)
                    return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Transaction ${i}: It's 'transferSuccessful' field is boolean true, but should be boolean false due to 'from' address not having enough to cover the 'value' field amount of micro-coins after deducting for the 'fee' amount - should have been boolean false.` };

            } // If "from" public address does have enough value, transferSuccessful should have been set to true
            else {

                if (transactionToValidate.transferSuccessful !== true)
                    return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Transaction ${i}: It's 'transferSuccessful' field is boolean false, but should be boolean true due to 'from' address having enough to cover the 'value' field amount of micro-coins after deducting for the 'fee' amount - should have been boolean false.` };

                // Debit value from 'From' address
                let tempFromAmount = confirmedAccountBalancesMap.get(transactionToValidate.from);
                tempFromAmount -= transactionToValidate.value;
                confirmedAccountBalancesMap.set(transactionToValidate.from, tempFromAmount);

                // Credit value to 'To' address
                let tempToAmount = confirmedAccountBalancesMap.get(transactionToValidate.to);
                tempToAmount += transactionToValidate.value;
                confirmedAccountBalancesMap.set(transactionToValidate.to, tempToAmount);
            }
        }

        if (blockToValidate.transactions[0].value !== coinbaseTransactionValue) {
            return { errorMsg: `Peer Block ${blockToValidate.index} has invalid Coinbase Transaction 0: It's 'value' field does not equal the total of all the fees and block rewards - 'value' field is ${blockToValidate.transactions[0].value} but should be ${coinbaseTransactionValue}` };
        }

        return { message: "successful validate of peer block ${blockToValidate.index}" };

    }


};