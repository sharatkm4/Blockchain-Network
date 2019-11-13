//const EC = require('elliptic').ec;
//const ec = new EC('secp256k1');

//var CryptoJS = require('crypto-js');

const ec = new elliptic.ec('secp256k1');

// Generate random private key using elliptic curve
function generateRandomPrivateKey() {
    let privateKey = ec.genKeyPair().getPrivate('hex');
    return privateKey;
}

// Get the public key from private key
// Get the Public/Private key pair from the Private Key String. Then, you get the Public Key (x, y) coordinate from the Key Pair object.
// Take the "x" coordinate value of the Public Key and concatenate it at the end with either a "0" or "1" depending upon whether the "y" coordinate value is even or odd.
// Input: A 64-Hex Digit string representing a Private Key
// Output: A 65-Hex Digit string representing the Compressed version of the derived Public Key
function getPublicKeyFromPrivateKey(privateKeyString) {

    let keyPair = ec.keyFromPrivate(privateKeyString);

    // Below is the Public Key with it's X and Y co-ordinate.
    let keyPairPublic = keyPair.getPublic();

    // Get the below X and Y co-ordinate values for the Public Key.
    // They will be in JavaScript BN (BigNumber) object type.
    let publicKey_X = keyPairPublic.getX();
    let publicKey_Y = keyPairPublic.getY();

    // Get the Public Key X coordinate in Hexadecimal String format.
    let publicKey_X_hex_String = publicKey_X.toString(16);

    // Sometimes the Hex string returned is LESS than the 64-Hex string that is expected. So, we need to pad with '0'.
    publicKey_X_hex_String = publicKey_X_hex_String.padStart(64, '0');

    // Get the Public Key Y coordinate in Binary String format. It will be used later
    // to determine if a 1 or 0 should be concatenated to the "x" co-ordinate.
    let publicKey_Y_binary_String = publicKey_Y.toString(2);

    // If the last binary digit is "0", then it's even. If the last binary digit is "1", then it's odd.
    // A publicKey_Y_binary_String[publicKey_Y_binary_String.length - 1] value of 0 means it's EVEN.
    // A publicKey_Y_binary_String[publicKey_Y_binary_String.length - 1] value of 1 means it's ODD.
    let returned_publicKeyString = publicKey_X_hex_String + publicKey_Y_binary_String[publicKey_Y_binary_String.length - 1];
    return returned_publicKeyString;

}

// Creates a Signature from the input "message" string and "privateKey" 64-hex string.
// Input:
// 1) message: any string value
// 2) privateKey: privateKey of a Public Address that is in 64-hex string format
//
// Output: A Signature JavaScript object that has the following two attributes:
// 1) r : 64-Hex string of the Signature "r" attribute
// 2) s : 64-Hex string of the Signature "s" attribute
function createSignature(message, privateKey) {
    let privateKeyPair = ec.keyFromPrivate(privateKey);
    let signature = ec.sign(message, privateKeyPair);

    // Sometimes the Hex string returned is LESS than the 64-Hex string that is expected. So, we need to pad with '0'.
    let signature_r_string = signature.r.toString(16).padStart(64, '0');
    let signature_s_string = signature.s.toString(16).padStart(64, '0');

    let signatureObject = {r: signature_r_string, s: signature_s_string};
    return signatureObject;
}



// Get Public address from Public Key by taking the RIPEMD-160 of Public Key.
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

