var cryptoJS = require('crypto-js');

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
        this.blockHash = blockHash;
    }

    //TODO
    calculateBlockDataHash() {
        return "TestDataHash";
    }

    //TODO
    calculateBlockHash() {
        return "TestBlockHash";
    }
}