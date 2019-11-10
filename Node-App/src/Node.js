var cryptoJS = require('crypto-js');

var BlockChain = require('./BlockChain');

var utils = require('./utils');

var CryptoUtils = require('./CryptoUtils');

var Transaction = require('./Transaction');

var GenesisBlock = require('./GenesisBlock');

var Block = require('./Block');

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
            return { errorMessage: "Invalid Miner Address: Miner Address should be a 40-Hex string" }
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



};