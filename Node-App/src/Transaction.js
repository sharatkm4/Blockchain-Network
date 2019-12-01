var cryptoJS = require('crypto-js');

module.exports = class Transaction {

    //from: address (40 hex digits)
    //to: address (40 hex digits)
    //value: integer (non negative)
    //fee: integer (non negative)
    //dateCreated : ISO8601_string
    //data : string (optional)
    //senderPubKey : hex_number[65]
    //transactionDataHash : hex_number (SHA256)
    //senderSignature : hex_number[2][64]
    //minedInBlockIndex : integer / null (default will be null)
    //TransferSuccessful : bool (default will be false
    constructor(from, to, value, fee, dateCreated, data, senderPubKey, senderSignature = undefined, minedInBlockIndex = undefined, transferSuccessful = undefined) {
        this.from = from;
        this.to = to;
        this.value = value;
        this.fee = fee;
        this.dateCreated = dateCreated;
        this.data = data;
        this.senderPubKey = senderPubKey;

        this.transactionDataHash = this.calculateTransactionDataHash();

        this.senderSignature = senderSignature;
        this.minedInBlockIndex = minedInBlockIndex;
        this.transferSuccessful = transferSuccessful;
    }

    // Calculate SHA256 Hash of the transaction data
    // Data includes 'from', 'to', 'value', 'fee', 'dateCreated', 'data', 'senderPubKey'
    calculateTransactionDataHash() {
        let rawTransactionDataJSON = {'from': this.from,'to': this.to,'value': this.value,'fee': this.fee,'dateCreated': this.dateCreated,'data': this.data,'senderPubKey': this.senderPubKey};

        let rawTransactionDataJSONStr = JSON.stringify(rawTransactionDataJSON);
        let transactionDataHash = cryptoJS.SHA256(rawTransactionDataJSONStr);
        let transactionDataHashStr = transactionDataHash.toString();

        return transactionDataHashStr;
    }
};