var CryptoJS = require('crypto-js');

module.exports = class Block {

    //transactions : Transaction[]
    //difficulty: integer (unsigned)
    //prevBlockHash: hex_number[64]
    //minedBy: address (40 hex digits)
    //blockDataHash: hex_number[64]
    //Nonce: integer (unsigned)
    //DateCreated : ISO8601_string
    //blockHash: hex_number[64]
    constructor(index, transactions, difficulty, prevBlockHash, minedBy, nonce = undefined, dateCreated = undefined, blockHash = undefined) {
        this.index = index;
        this.transactions = transactions;
        this.difficulty = difficulty;
        this.prevBlockHash = prevBlockHash;
        this.minedBy = minedBy;

        this.blockDataHash = this.calculateBlockDataHash();

        this.nonce = nonce;
        this.dateCreated = dateCreated;
        if (blockHash === undefined) {
            this.blockHash = this.calculateBlockHash();
        } else {
            this.blockHash = blockHash;
        }
    }

    // Calculating the Block Data Hash
    // SHA256 hashing of the JSON representation of the following fields
    // 'index'
    // 'transactions'
    // 'difficulty'
    // 'prevBlockHash'
    // 'minedBy'
    calculateBlockDataHash() {
        let transactionsListJson = [];
        for (let i = 0; i < this.transactions.length; i++) {
            let transactionJson = this.transactions[i];
            let transactionDataToAddJson = {
                'from': transactionJson.from,
                'to': transactionJson.to,
                'value': transactionJson.value,
                'fee': transactionJson.fee,
                'dateCreated': transactionJson.dateCreated,
                'transactionDataHash': transactionJson.transactionDataHash,
                'senderSignature': transactionJson.senderSignature,
                'minedInBlockIndex': transactionJson.minedInBlockIndex,
                'transferSuccessful': transactionJson.transferSuccessful
            };

            transactionsListJson.push(transactionDataToAddJson)
        }

        let blockDataToHashJson = {
            'index': this.index,
            'transactions': transactionsListJson,
            'difficulty': this.difficulty,
            'prevBlockHash': this.prevBlockHash,
            'minedBy': this.minedBy
        }

        let blockDataToHashJsonStr = JSON.stringify(blockDataToHashJson);
        let blockDataHash = CryptoJS.SHA256(blockDataToHashJsonStr);
        let blockDataHashStr = blockDataHash.toString();

        return blockDataHashStr;
    }

    // Calculate the block hash
    calculateBlockHash() {
        let blockHashDataToHashString = `${this.blockDataHash}|${this.nonce}|${this.dateCreated}`;
        let blockHash = CryptoJS.SHA256(blockHashDataToHashString);
        let blockHashStr = blockHash.toString();
        return blockHashStr;
    }
}