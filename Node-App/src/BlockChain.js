var GenesisBlock = require('./GenesisBlock');

var utils = require('./utils');

module.exports = class BlockChain {


    constructor() {
        this.blocks = [GenesisBlock.genesisBlock]; // Block[]
        this.pendingTransactions = []; // Transaction[]
        this.currentDifficulty = 3; //integer
        this.miningJobs = new Map(); // map(blockDataHash -> Block);
    }

    // cumulativeDifficulty == 16 ^ d0 + 16 ^ d1 + … 16 ^ dn
    // where d0, d1, … dn are the individual difficulties of the blocks
    calculateCumulativeDifficulty() {
        let cumulativeDifficulty = 0;
        for (let i = 0; i < this.blocks.length; i++) {
            cumulativeDifficulty += 16 ** this.blocks[i].difficulty;
        }
        return cumulativeDifficulty;
    }

    // confirmedTransactions – transactions that have been included in a block
    calculateConfirmedTransactions() {
        let confirmedTransactions = 0;
        for (let i = 0; i < this.blocks.length; i++) {
            confirmedTransactions += this.blocks[i].transactions.length;
        }
        return confirmedTransactions;
    }

    // Get all transactions from all the confirmed blocks
    getConfirmedTransactions() {
        let transactions = [];
        for (let i = 0; i < this.blocks.length; i++) {
            for (let j = 0; j < this.blocks[i].transactions.length; j++) {
                transactions.push(this.blocks[i].transactions[j]);
            }
        }
        return transactions;
    }

    // The balances of everyone (balances of all the addresses from confirmed transactions)
    // Returns a Map (address => balance)
    getConfirmedBalances() {
        let addressBalancesMap = new Map();

        let confirmedTransactions = this.getConfirmedTransactions();
        for (let i = 0; i < confirmedTransactions.length; i++) {

            let transaction = confirmedTransactions[i];

            if (!addressBalancesMap.has(transaction.from)) {
                addressBalancesMap.set(transaction.from, 0);
            }

            if (!addressBalancesMap.has(transaction.to)) {
                addressBalancesMap.set(transaction.to, 0);
            }

            //calculate balance of fee paid by the sender
            let feeBalance = addressBalancesMap.get(transaction.from);
            feeBalance -= transaction.fee;
            addressBalancesMap.set(transaction.from, feeBalance)

            //if confirmed (transfer is successful), calculate from and to balance
            if (transaction.transferSuccessful) {
                let fromBalance = addressBalancesMap.get(transaction.from);
                fromBalance -= transaction.value;
                addressBalancesMap.set(transaction.from, fromBalance);

                let toBalance = addressBalancesMap.get(transaction.to);
                toBalance += transaction.value;
                addressBalancesMap.set(transaction.to, toBalance);
            }
        }

        return addressBalancesMap;
    }

    // Return both confirmed and pending transactions
    getAllTransactions() {
        let pendingAndConfirmedTransactions = [];

        pendingAndConfirmedTransactions.push.apply(pendingAndConfirmedTransactions, this.getConfirmedTransactions());
        pendingAndConfirmedTransactions.push.apply(pendingAndConfirmedTransactions, this.pendingTransactions);

        return pendingAndConfirmedTransactions;
    }

    // Returns an array of both confirmed and pending transactions for a given address
    // Address can be either in 'from' or 'to'
    getTransactionsForAddress(address) {
        let allTransactions = this.getAllTransactions();
        let transactionsForAddress = allTransactions.filter(transaction => transaction.from === address || transaction.to === address);
        return transactionsForAddress;

    }

    getJsonObject() {
        let jsonObject = Object.create({});
        jsonObject.blocks = this.blocks;
        jsonObject.pendingTransactions = this.pendingTransactions;
        jsonObject.currentDifficulty = this.currentDifficulty;
        jsonObject.miningJobs = utils.strMapToObj(this.miningJobs);

        return jsonObject;
    }
};