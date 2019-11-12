const Block = require('./Block');
const Transaction = require('./Transaction');

//40 hex digit
const genesisFromAddress = "0000000000000000000000000000000000000000";
//65 hex digit
const genesisSenderPubKey = "00000000000000000000000000000000000000000000000000000000000000000";
//64 hex digit
const genesisSenderSignature = "0000000000000000000000000000000000000000000000000000000000000000";

//ISO8601 date format (hardcoding the date)
//const genesisDateCreated = new Date().toISOString();
const genesisDateCreated = "2019-11-02T14:35:55.867Z";

// 1 coin = 1,000 milli coins = 1,000,000 micro coins
const totalSupplyOfCoins = 1000000000; // 1000 coins (1000 * 1,000,000 micro coins)

const genesisFee = 0;
const genesisData = "genesis tx";
const genesisMinedInBlockIndex = 0;
const genesisTransferSuccessful = true;

//TODO
let faucetAddress = "c3293572dbe6ebc60de4a20ed0e21446cae66b17";

const genesisCoinBaseTransaction = new Transaction(
    genesisFromAddress,
    faucetAddress,
    totalSupplyOfCoins,
    genesisFee,
    genesisDateCreated,
    genesisData,
    genesisSenderPubKey,
    [genesisSenderSignature, genesisSenderSignature],
    genesisMinedInBlockIndex,
    genesisTransferSuccessful);

const genesisBlockIndex = 0;
const genesisBlockDifficulty = 0;
//64 hex digit
const genesisPrevBlockhash = "0000000000000000000000000000000000000000000000000000000000000000";
const genesisNonce = 0;

const genesisBlock = new Block(
    genesisBlockIndex,
    [genesisCoinBaseTransaction],
    genesisBlockDifficulty,
    genesisPrevBlockhash,
    genesisFromAddress,
    genesisNonce,
    genesisDateCreated);

module.exports = {
    genesisBlock,
    genesisFromAddress,
    genesisSenderPubKey,
    genesisDateCreated,
    genesisSenderSignature
};