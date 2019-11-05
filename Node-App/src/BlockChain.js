var GenesisBlock = require('./GenesisBlock');

var utils = require('./utils');

module.exports = class BlockChain {


    constructor() {
        this.blocks = [GenesisBlock.genesisBlock]; // Block[]
        this.pendingTransactions = []; // Transaction[]
        this.currentDifficulty = 3; //integer
        this.miningJobs = new Map(); // map(blockDataHash -> Block);
    }

    calculateCumulativeDifficulty() {
        let cumulativeDifficulty = 0;
        for (let i = 0; i < this.blocks.length; i++) {
            cumulativeDifficulty += 16 ** this.blocks[i].difficulty;
        }
        return cumulativeDifficulty;
    }

    calculateConfirmedTransactions() {
        let confirmedTransactions = 0;
        for (let i = 0; i < this.blocks.length; i++) {
            confirmedTransactions += this.blocks[i].transactions.length;
        }
        return confirmedTransactions;
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