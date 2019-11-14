var express = require('express');
var app = express();

var utils = require('./src/utils');
var CryptoUtils = require('./src/CryptoUtils');
var Transaction = require('./src/Transaction');

// Parse JSON Message Body in POST RESTFul Services.
var bodyParser = require('body-parser');
app.use(bodyParser.json())

// Enable CORS so that GET and POST calls from the browser works
var cors = require('cors');
app.use(cors());

var HttpStatus = require('http-status-codes');
var axios = require('axios');
var restfulCallTimeout = 60000; //60 seconds

// Enable static access to the "/public" folder
app.use(express.static('public'));


async function sendTransaction(signedTransactionJsonStr, nodeIdUrl, res) {
	// Send transaction
	console.log('nodeIdUrl: ', nodeIdUrl);
	let restfulUrl = nodeIdUrl + "/transactions/send";
	let restfulSuccessfulResponse = undefined;
	let restfulErrorResponse = undefined;

	let signedTransactionJson = JSON.parse(signedTransactionJsonStr);

	await axios.post(restfulUrl, signedTransactionJson, {timeout: restfulCallTimeout})
		.then(function (response) {
			console.log('response.status: ', response.status);
			console.log('response.data: ', response.data);
			restfulSuccessfulResponse = response.data;
		})
		.catch(function (error) {
			console.log('error.response.status: ', error.response.status);
			console.log('error.response.data: ', error.response.data);
			restfulErrorResponse = error.response;
		});

	let errorMessage = undefined;
	let displaySendTransactionInfo = undefined;
	let response = undefined;

	// If the RESTFul call to Blockchain Node yielded no response after the timeout, then just display an error message.
	if (restfulSuccessfulResponse === undefined && restfulErrorResponse === undefined) {
		errorMessage = `Unable to send transaction to ${restfulUrl} due to timeout`;

		response = { errorMsg: errorMessage };
		res.status(HttpStatus.NOT_FOUND);

	} else if (restfulErrorResponse !== undefined) {

		res.status(HttpStatus.NOT_FOUND);

		if (restfulErrorResponse.data !== undefined) {
			displaySendTransactionInfo = "Error Status: " + restfulErrorResponse.status + "\n" +
				"Error Status Description: " + restfulErrorResponse.statusText + "\n\n" +
				"Error Message Details: \n";

			if (restfulErrorResponse.data.errorMsg !== undefined) {
				displaySendTransactionInfo += restfulErrorResponse.data.errorMsg;
			}
			else {
				displaySendTransactionInfo += JSON.stringify(restfulErrorResponse.data, undefined, 2);
			}
			res.status(restfulErrorResponse.status);
		}

		response = { errorMsg: displaySendTransactionInfo };

	} else {
		// Success response
		displaySendTransactionInfo = nodeIdUrl + "/transactions/" + restfulSuccessfulResponse.transactionDataHash;
		response = JSON.stringify({ message: displaySendTransactionInfo });
	}

	return response;

}

app.post('/sendCoins', (req, res) => {
	
	// Faucet Sender Private key, Public key and Address is pre-determined and hardcoded
	// PRIVATE KEY NEEDS TO BE ENCRYPTED IN PROD
	let senderPrivateKey = "6bc5afb091d3c46258edd75ddf0d1e9340699200576995af991fd9c0f6a729ff";
	let senderPubKey = CryptoUtils.getPublicKeyFromPrivateKey(senderPrivateKey);
	console.log('senderPubKey: ', senderPubKey); //ff19685102f3921c3e1f4027d44919ee9929d87650cfa4591c96cade191659c61
	let senderAddress = CryptoUtils.getPublicAddressFromPublicKey(senderPubKey);
	console.log('senderAddress: ', senderAddress); //acdac8eb615db86c717c094984727dace63bdf52

	let dateCreated = new Date().toISOString();
	
	let transactionToSign = new Transaction(
				senderAddress, // address (40 hex digits) string
				req.body.recipientAddress, // address (40 hex digits) string
				req.body.transferValue, // integer (non negative)
				req.body.transferFee, // integer (non negative)
				dateCreated, // ISO8601_string
				req.body.dataToSend, // string (optional)
				senderPubKey); // hex_number[65] string
				
	// Sign the Transaction to Send and get it's signature.
	//
	// Output: A Signature JavaScript object that has the following two main attributes:
	// 1) r : 64-Hex string of the Signature "r" attribute
	// 2) s : 64-Hex string of the Signature "s" attribute
	let signature = CryptoUtils.createSignature(transactionToSign.transactionDataHash, senderPrivateKey);
	let senderSignatureArray = [ signature.r, signature.s ];

	let transactionToSend = {
			from: transactionToSign.from,
			to: transactionToSign.to,
			value: transactionToSign.value,
			fee: transactionToSign.fee,
			dateCreated: transactionToSign.dateCreated,
			data: transactionToSign.data,
			senderPubKey: transactionToSign.senderPubKey,
			senderSignature: senderSignatureArray
	};	
	
	let signedTransactionJsonStr = JSON.stringify(transactionToSend, undefined, 2);
		
	console.log('signedTransactionJson: ', signedTransactionJsonStr);


	sendTransaction(signedTransactionJsonStr, req.body.nodeIdUrl, res)
		.then( function(response) {
			console.log('app_post_send_transaction response =', response);
			res.json(response);
		})
		.catch(function (error) { // Any errors will be caught by the "sendTransaction" method so
			// very unlikely this error below will get executed.
			// console.log('error =', JSON.stringify(error, undefined, 2));
			console.log('app_post_send_transaction error =', error);
			console.log('app_post_send_transaction error.response =', error.response);

			if ( error.response !== undefined) {
				res.json(error.response);
			}
			else {
				res.json(error);
			}

		});
	
});	


var listeningPort = 7777;
var listeningHost = "localhost";

var server = app.listen(listeningPort, function () {
    var host = server.address().address
    var port = server.address().port

    if (host == "::") {
        host = listeningHost;
    }

    console.log("Faucet Server listening at http://%s:%s", host, port);
});
