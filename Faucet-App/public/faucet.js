$(document).ready(function () {
    //const derivationPath = "m/44'/60'/0'/0/";
    //const provider = ethers.providers.getDefaultProvider('ropsten');

	let nodeIdUrl = "http://localhost:5555";
	//let nodeIdUrl = "https:/stormy-everglades-34766.herokuapp.com";
	var restfulCallTimeout = 60000;
	
	var recipientAddresstoReceivedCoinsTimestampMap = new Map();
	
    showView("viewHome");

    $('#linkHome').click(function () {
        showView("viewHome");
    });

	$('#linkFaucet').click(function () {
		showView("viewFaucet");
		
	});

	//$('#buttonSendTestCoins').click(signAndSendTransaction);
	$('#buttonSendTestCoins').click(sendTestCoins);

    function showView(viewName) {
        // Hide all views and show the selected view only
        $('main > section').hide();
        $('#' + viewName).show();

		$('#linkFaucet').show();
    }

    function showInfo(message) {
        $('#infoBox>p').html(message);
        $('#infoBox').show();
        $('#infoBox>header').click(function () {
            $('#infoBox').hide();
        })
    }

    function showError(errorMsg) {
        $('#errorBox>p').html('Error: ' + errorMsg);
        $('#errorBox').show();
        $('#errorBox>header').click(function () {
            $('#errorBox').hide();
        })
    }

    function showLoadingProgress(percent) {
        $('#loadingBox').html("Loading... " + parseInt(percent * 100) + "% complete");
        $('#loadingBox').show();
        $('#loadingBox>header').click(function () {
            $('#errorBox').hide();
        })
    }

    function hideLoadingBar() {
        $('#loadingBox').hide();
    }
	
	async function sendTestCoins() {
		console.log('Start sendTestCoins...');
		
		// 'To' address validation
		let recipientAddress = $('#recipientAddress').val();
		if (!recipientAddress)
			return showError("Invalid recipientAddress");		
		if (!isValidPublicAddress(recipientAddress))
			return showError("Recipient Address should be a 40-hex lower case string. ");
		console.log('recipientAddress -> ', recipientAddress);
		
		// 'Value' validation
		let transferValue = $('#transferValue').val();
		if (!transferValue)
			return showError("Invalid transferValue");
		if (!isNumeric(transferValue))
			return showError("TransferValue should be a positive integer. ");		
		transferValue = parseInt(transferValue);
		if (transferValue > 1000000) { 
			return showError("Faucet can only send upto 1 coin (1,000,000 Micro coins) !!");
		}
		console.log('transferValue -> ', transferValue);
		
		// One request per address per hour validation
		if (recipientAddresstoReceivedCoinsTimestampMap.has(recipientAddress)) {
			let dateTimeRecipientAddressReceivedCoins = recipientAddresstoReceivedCoinsTimestampMap.get(recipientAddress);
			let currentTime = new Date().getTime();

			let deltaTime = Math.abs(currentTime - dateTimeRecipientAddressReceivedCoins);
			let oneHourInMilliseconds = 3600000;
			if (deltaTime <= oneHourInMilliseconds) {
				return showError('The Recipient Address has already received Coins. Only one request per Public Address per hour is allowed.');
			}
		}
		
		// Transfer 'Fee'
		let transferFee = 100; //Transfer fee is hard-coded
		console.log('transferFee -> ', transferFee);
		
		nodeIdUrl = $('#nodeUrl option:selected').attr('id');
		
		// 'Data'
		let dataToSend = 'Faucet transaction to ' + recipientAddress;
		console.log('dataToSend -> ', dataToSend);		
		
		let sendTestCoinsJsonInput = {
				'recipientAddress': recipientAddress,
				'transferValue': transferValue,
				'transferFee': transferFee,
				'dataToSend': dataToSend,
				'nodeIdUrl': nodeIdUrl
		};
		
		console.log('sendTestCoinsJsonInput = ', sendTestCoinsJsonInput);

		let restfulUrl = "http://localhost:7777/sendCoins";
		//let restfulUrl = "/sendCoins";
		let restfulSuccessfulResponse = undefined;
		let restfulErrorResponse = undefined;

		await axios.post(restfulUrl, sendTestCoinsJsonInput, {timeout: restfulCallTimeout})
			.then(response => {				
				restfulSuccessfulResponse = response.data;
				console.log('response.status: ', response.status);
				console.log('response.data: ', response.data);
			})
			.catch(function (error) {
				console.log('error.response.status: ', error.response.status);
                console.log('error.response.data: ', error.response.data);
				restfulErrorResponse = error.response;
  			});

   		let errorMessage = undefined;

 		// If the RESTFul call to Blockchain Node yielded no response after the timeout, then just display an error message.
 		if (restfulSuccessfulResponse === undefined && restfulErrorResponse === undefined) {
 			errorMessage = `Unable to send transaction to ${restfulUrl} due to timeout`
 			showError(errorMessage);
 		}
 		else if (restfulErrorResponse !== undefined) {
 			errorMessage = `Unable to send transaction to ${restfulUrl} due to below error`;
 			showError(errorMessage);
 			$('#textareaSendTransactionResult').val(restfulErrorResponse.data.errorMsg);
 		}
 		else {
			// Success response
 			recipientAddresstoReceivedCoinsTimestampMap.set(recipientAddress, new Date().getTime());
			showInfo(`We sent ${transferValue} micro-coins to address ${recipientAddress}`);
			let displaySendTransactionInfo = JSON.parse(restfulSuccessfulResponse);
			$('#textareaSendTransactionResult').val(displaySendTransactionInfo.message);
		}
		
		console.log('End sendTestCoins...');
	}
	
	

	/*async function signAndSendTransaction() {
		console.log('Start signAndSendTransaction...');
		
		// Faucet Sender Public key and Address is pre-determined and hardcoded
		let senderPrivateKey = "6bc5afb091d3c46258edd75ddf0d1e9340699200576995af991fd9c0f6a729ff";
		let senderPubKey = "ff19685102f3921c3e1f4027d44919ee9929d87650cfa4591c96cade191659c61";
		let senderAddress = "acdac8eb615db86c717c094984727dace63bdf52"; //$('#faucetSenderAddress').val();
		 
		
		// 'To' address validation
		let recipientAddress = $('#recipientAddress').val();
		if (!recipientAddress)
			return showError("Invalid recipientAddress");		
		if (!isValidPublicAddress(recipientAddress))
			return showError("Recipient Address should be a 40-hex lower case string. ");		
		console.log('recipientAddress -> ', recipientAddress);
		
		// 'Value' validation
		let transferValue = $('#transferValue').val();
		if (!transferValue)
			return showError("Invalid transferValue");
		if (!isNumeric(transferValue))
			return showError("TransferValue should be a positive integer. ");		
		transferValue = parseInt(transferValue);
		if (transferValue > 1000000) { 
			return showError("Faucet can only send upto 1 coin (1,000,000 Micro coins) !!");
		}
		console.log('transferValue -> ', transferValue);
		
		// One request per address per hour validation
		if (recipientAddresstoReceivedCoinsTimestampMap.has(recipientAddress)) {
			let dateTimeRecipientAddressReceivedCoins = recipientAddresstoReceivedCoinsTimestampMap.get(recipientAddress);
			let currentTime = new Date().getTime();

			let deltaTime = Math.abs(currentTime - dateTimeRecipientAddressReceivedCoins);
			let oneHourInMilliseconds = 3600000;
			if (deltaTime <= oneHourInMilliseconds) {
				return showError('The Recipient Address has already received Coins. Only one request per Public Address per hour is allowed.');
			}
		}
		
		// Transfer 'Fee'
		let transferFee = 100; //Transfer fee is hard-coded
		console.log('transferFee -> ', transferFee);
		
		let dateCreated = new Date().toISOString();
		
		// 'Data'
		let dataToSend = 'Faucet transaction to ' + recipientAddress;
		console.log('dataToSend -> ', dataToSend);		
		
		let transactionToSign = new Transaction(
				senderAddress, // address (40 hex digits) string
				recipientAddress, // address (40 hex digits) string
				transferValue, // integer (non negative)
				transferFee, // integer (non negative)
				dateCreated, // ISO8601_string
				dataToSend, // string (optional)
				senderPubKey); // hex_number[65] string
		
		// Sign the Transaction to Send and get it's signature.
		//
		// Output: A Signature JavaScript object that has the following two main attributes:
		// 1) r : 64-Hex string of the Signature "r" attribute
		// 2) s : 64-Hex string of the Signature "s" attribute
		let signature = createSignature(transactionToSign.transactionDataHash, senderPrivateKey);
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

		let signedTransactionJson = JSON.stringify(transactionToSend, undefined, 2);
		
		console.log('signedTransactionJson: ', signedTransactionJson);
		
		
		// Send Transaction
		if (signedTransactionJson.length === 0)
			return showError("Transaction needs to be created and signed first !!");
		
		nodeIdUrl = $('#nodeUrl option:selected').attr('id');
		
		let restfulUrl = nodeIdUrl + "/transactions/send";
		let restfulSuccessfulResponse = undefined;
		let restfulErrorResponse = undefined;
		
		let signedTransactionJsonObj = JSON.parse(signedTransactionJson);
		
		await axios.post(restfulUrl, signedTransactionJsonObj, {timeout: restfulCallTimeout})
			.then(function (response) {
				//console.log('response.status =', response.status);
				//console.log('response.data =', response.data);				
				restfulSuccessfulResponse = response.data;
			})
			.catch(function (error) {
				console.log('error.response.status: ', error.response.status);
                console.log('error.response.data: ', error.response.data);
				restfulErrorResponse = error.response;								
  			});
			
		let errorMessage = undefined;
  		let displaySendTransactionInfo = undefined;	
		
		// If the RESTFul call to Blockchain Node yielded no response after the timeout, then just display an error message.
		if (restfulSuccessfulResponse === undefined && restfulErrorResponse === undefined) {
			errorMessage = `Unable to send transaction to ${restfulUrl} due to timeout`
			showError(errorMessage);
		} else if (restfulErrorResponse !== undefined) {
			errorMessage = `Unable to send transaction to ${restfulUrl} due to below error`;
			showError(errorMessage);

			displaySendTransactionInfo = JSON.stringify(restfulErrorResponse, undefined, 2);

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
			}

			$('#textareaSendTransactionResult').val(displaySendTransactionInfo);
		} else {
			// Success response
			recipientAddresstoReceivedCoinsTimestampMap.set(recipientAddress, new Date().getTime());

			showInfo(`We sent ${transferValue} micro-coins to address ${recipientAddress}`);
			
			let blockChainNetworkUrl = nodeIdUrl + "/transactions/" + restfulSuccessfulResponse.transactionDataHash;			
			$('#textareaSendTransactionResult').val(blockChainNetworkUrl);
		}
		
		console.log('Start signAndSendTransaction...');
	}*/	

});