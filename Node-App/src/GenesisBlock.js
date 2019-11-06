const Block = require('./Block');
const Transaction = require('./Transaction');

//40 hex digit
const genesisFromAddress = "0000000000000000000000000000000000000000";
//65 hex digit
const genesisSenderPubKey = "00000000000000000000000000000000000000000000000000000000000000000";
//64 hex digit
const genesisSenderSignature = "0000000000000000000000000000000000000000000000000000000000000000";

//ISO8601 date format
const genesisDateCreated = new Date().toISOString();

// 1 coin = 1,000 milli coins = 1,000,000 micro coins
const totalSupplyOfCoins = 1000000000; // 1000 coins (1000 * 1,000,000 micro coins)

const genesisFee = 0;
const genesisData = "genesis tx";
const genesisMinedInBlockIndex = 0;
const genesisTransferSuccessful = true;

//TODO
let faucetAddress = "0825b1b7d17ea1c1ff9ebe1c74d7c6d8a4a104dc";

const genesisCoinBaseTransaction = new Transaction(
    genesisFromAddress, faucetAddress, totalSupplyOfCoins, genesisFee, genesisDateCreated, genesisData, genesisSenderPubKey, [genesisSenderSignature, genesisSenderSignature], genesisMinedInBlockIndex, genesisTransferSuccessful);

const genesisBlockIndex = 0;
const genesisBlockDifficulty = 0;
//64 hex digit
const genesisPrevBlockhash = "0000000000000000000000000000000000000000000000000000000000000000";
const genesisNonce = 0;

const genesisBlock = new Block(
    genesisBlockIndex, [genesisCoinBaseTransaction], genesisBlockDifficulty, genesisPrevBlockhash, genesisFromAddress, genesisNonce, genesisDateCreated);

module.exports = {
    genesisBlock
};