const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

var CryptoJS = require('crypto-js');

function getPublicAddressFromPublicKey(publicKeyString) {
    let publicAddress = CryptoJS.RIPEMD160(publicKeyString);
    let publicAddressStr = publicAddress.toString();
    return publicAddressStr;
}

// Convert compressedPublicKey in 65-hex compressed string format into an EC Point JavaScript object that has "x" and "y" coordinate
function uncompressPublicKey(compressedPublicKey) {
    //console.log('compressedPublicKey: ', compressedPublicKey);
    let publicKeyX = compressedPublicKey.substring(0, 64);
    //console.log('publicKeyX: ', publicKeyX);
    let zeroOrOneString = compressedPublicKey[64];
    //console.log('zeroOrOneString: ', zeroOrOneString);
    let uncompressedPublicKey = ec.curve.pointFromX(publicKeyX, zeroOrOneString === '1');
    //console.log('uncompressedPublicKey: ', uncompressedPublicKey);
    //console.log('uncompressedPublicKey.x: ', uncompressedPublicKey.x);
    //console.log('uncompressedPublicKey.y: ', uncompressedPublicKey.y);
    return uncompressedPublicKey;
}

// Verify that the compressedPublicKey actually signed the message with the given signature
// Input:
//      message -> transactionDataHash
//      compressedPublicKey -> 65-hex compressed string
//      signature ->  r : 64-Hex string of the Signature
//                    s : 64-Hex string of the Signature
// Output: True or false
function verifySignature(message, compressedPublicKey, signature) {
    let publicKey = uncompressPublicKey(compressedPublicKey);
    let publicKeyPair = ec.keyFromPublic(publicKey, 'hex');
    let isVerified = publicKeyPair.verify(message, signature);
    return isVerified;
}

module.exports = {
    uncompressPublicKey,
    verifySignature,
    getPublicAddressFromPublicKey
};