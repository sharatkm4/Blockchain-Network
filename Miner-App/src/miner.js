var CryptoJS = require('crypto-js');

var utils = require('../../Node-App/src/utils');

var axios = require('axios');

var restfulCallTimeout = 60000; //60 seconds

var listeningNodePort = 5555;
var listeningNodeHost = "localhost";
var minerAddress = 'b63a0fe3f5f5ffc6a800f51594eee600082ad57f';
var mineOnlyOnce = false;

var commander = require('commander');
commander
    .usage('[OPTIONS]...')
    .option('-lp, --listeningNodePort <Port Number>', 'Listening Node Port Number', listeningNodePort)
    .option('-lh, --listeningNodeHost <Host Name>', 'Listening Node Host Name', listeningNodeHost)
    .option('-ma, --minerAddress <Address (40-Hex lowercase)>', 'Miner Address', minerAddress)
    .option('-on, --mineOnlyOnce <Mine Only Once (boolean flag)>', 'Mine Only Once flag', mineOnlyOnce)
    .parse(process.argv);

// node src/miner.js --listeningNodePort 5555 --listeningNodeHost localhost --minerAddress 0825b1b7d17ea1c1ff9ebe1c74d7c6d8a4a104dc --mineOnlyOnce true

if (utils.isNumeric(commander.listeningNodePort))
    listeningNodePort = commander.listeningNodePort;
else
    console.log('Invalid port number entered and will use default port');

if (commander.listeningNodeHost.length > 0)
    listeningNodeHost = commander.listeningNodeHost;
else
    console.log('Invalid host entered and will use default host');

//if (utils.isValidAddress(commander.minerAddress))
    minerAddress = commander.minerAddress;
//else
    //console.log('Invalid address entered and will use default address');

if (commander.mineOnlyOnce === 'true')
    mineOnlyOnce = true;
else
    console.log('Invalid mineOnlyOnce entered and will use default address');


// Calculate the Block Hash
function calculateBlockHash(blockToBeMined) {
    let blockDataHashNonceDateStr = `${blockToBeMined.blockDataHash}|${blockToBeMined.nonce}|${blockToBeMined.dateCreated}`;
    let blockHash = CryptoJS.SHA256(blockDataHashNonceDateStr);
    let blockHashStr = blockHash.toString();
    return blockHashStr;
}

// Start the Miner
// Step 1: Get Mining job from the node
// Step 2: Mine the job (find the hash based on difficulty set by the node)
// Step 3: Submit mined block to the node so that it can be added to the chain
async function startMiner() {

    console.log();

    let nodeUrl = `http://${listeningNodeHost}:${listeningNodePort}`;
    let getMiningJobUrl = `${nodeUrl}/mining/get-mining-job/${minerAddress}`;
    let submitMinedBlockUrl = `${nodeUrl}/mining/submit-mined-block`;

    console.log('nodeUrl: ', nodeUrl);
    console.log('getMiningJobUrl: ', getMiningJobUrl);
    console.log('submitMinedBlockUrl: ', submitMinedBlockUrl);
    console.log('MineOnlyOnce: ', mineOnlyOnce);

    while (true) {
        // Step 1: Get Mining job from the node
        console.log();
        console.log('Step 1: Get Mining job from the node');
        let getMiningJobSuccessResponse = undefined;
        let getMiningJobErrorResponse = undefined;

        await axios.get(getMiningJobUrl, {timeout: restfulCallTimeout})
            .then(function (response) {
                console.log('getMiningJob.response.status: ', response.status);
                console.log('getMiningJob.response.data: ', response.data);
                getMiningJobSuccessResponse = response.data;
            })
            .catch(function (error) {
                console.log('getMiningJob.error.response.status: ', error.response.status);
                console.log('getMiningJob.error.response.data: ', error.response.data);
                getMiningJobErrorResponse = error;
            });


        if (getMiningJobSuccessResponse === undefined && getMiningJobErrorResponse === undefined) {
            console.log('Node is not responding in order to get mining job. Miner will be stopped !!');
            break;
        } else if(getMiningJobErrorResponse !== undefined) {
            console.log('Error while retrieving mining job. Miner will be stopped !!');
            break;
        }


        // Step 2: Mine the job (find the hash based on difficulty set by the node)
        console.log();
        console.log('Step 2: Mine the job (find the hash based on difficulty set by the node)');

        let blockToBeMined = {
            dateCreated: new Date().toISOString(),
            nonce: 0,
            difficulty: getMiningJobSuccessResponse.difficulty,
            blockDataHash: getMiningJobSuccessResponse.blockDataHash,
            blockHash: undefined
        };

        let leadingZeros = ''.padStart(blockToBeMined.difficulty, '0');
        let timeToFindNonce = 60000; // Time to find nonce will be 60 seconds
        let startTimeForNonce = new Date().getTime();
        while (true) {
            blockToBeMined.blockHash = calculateBlockHash(blockToBeMined);
            if (blockToBeMined.blockHash.startsWith(leadingZeros)) {
                console.log('Hash found with the specified difficulty -> ', blockToBeMined.blockHash);
                break;
            }
            blockToBeMined.nonce++;

            let timeDifference = new Date().getTime() - startTimeForNonce;
            if (timeDifference > timeToFindNonce) {
                console.log('Time to find nonce has exceeded and ignore this block');
                blockToBeMined = undefined;
                break;
            }
        }

        if (blockToBeMined === undefined) {
            continue;
        }

        // Step 3: Submit mined block to the node so that it can be added to the chain
        console.log();
        console.log('Step 3: Submit mined block to the node so that it can be added to the chain');

        let submitMinedJobJsonInput = {
            blockDataHash: blockToBeMined.blockDataHash,
            dateCreated: blockToBeMined.dateCreated,
            nonce: blockToBeMined.nonce,
            blockHash: blockToBeMined.blockHash
        }
        let submitMinedJobSuccessResponse = undefined;
        let submitMinedJobErrorResponse = undefined;
        await axios.post(submitMinedBlockUrl, submitMinedJobJsonInput, {timeout: restfulCallTimeout})
            .then(function (response) {
                console.log('submitMinedBlock.response.status: ', response.status);
                console.log('submitMinedBlock.response.data: ', response.data);
                submitMinedJobSuccessResponse = response.data;
            })
            .catch(function (error) {
                console.log('submitMinedBlock.error.response.status: ', error.response.status);
                console.log('submitMinedBlock.error.response.data: ', error.response.data);
                submitMinedJobErrorResponse = error;
            });

        if (submitMinedJobSuccessResponse === undefined && submitMinedJobErrorResponse === undefined) {
            console.log('Node is not responding in order to submit mining block. Miner will be stopped !!');
            break;
        } else if(submitMinedJobErrorResponse !== undefined) {
            console.log('Error while submitting mining block !!');
        } else {
            console.log('Submit Mine Job was successful !!');
        }

        if (mineOnlyOnce) {
            console.log('Stop mining...');
            break;
        }

    }

}

startMiner();




