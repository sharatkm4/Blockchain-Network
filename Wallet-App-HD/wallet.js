$(document).ready(function () {
    const derivationPath = "m/44'/60'/0'/0/";
    const provider = ethers.providers.getDefaultProvider('ropsten');

	let nodeIdUrl = "http://localhost:5555";
	//let nodeIdUrl = "https:/stormy-everglades-34766.herokuapp.com";
	var restfulCallTimeout = 60000;
	
    let wallets = {};

    showView("viewHome");

    $('#linkHome').click(function () {
        showView("viewHome");
    });

    $('#linkCreateNewWallet').click(function () {
        $('#passwordCreateWallet').val('');
        $('#textareaCreateWalletResult').val('');
        showView("viewCreateNewWallet");
    });

    $('#linkImportWalletFromMnemonic').click(function () {
        $('#textareaOpenWallet').val('');
        $('#passwordOpenWallet').val('');
        $('#textareaOpenWalletResult').val('');
        $('#textareaOpenWallet').val('toddler online monitor oblige solid enrich cycle animal mad prevent hockey motor');
        showView("viewOpenWalletFromMnemonic");
    });

    $('#linkImportWalletFromFile').click(function () {
        $('#walletForUpload').val('');
        $('#passwordUploadWallet').val('');
        showView("viewOpenWalletFromFile");
    });

    $('#linkShowMnemonic').click(function () {
        $('#passwordShowMnemonic').val('');
        showView("viewShowMnemonic");
    });

    $('#linkShowAddressesAndBalances').click(function () {
        $('#passwordShowAddresses').val('');
        $('#divAddressesAndBalances').empty();
        showView("viewShowAddressesAndBalances");
    });

    $('#linkSendTransaction').click(function () {
        $('#divSignAndSendTransaction').hide();

        $('#passwordSendTransaction').val('');
        $('#transferValue').val('');
		$('#transferFee').val('');
        $('#senderAddress').empty();

        $('#textareaSignedTransaction').val('');
        $('#textareaSendTransactionResult').val('');

        showView("viewSendTransaction");
    });

    $('#buttonGenerateNewWallet').click(generateNewWallet);
    $('#buttonOpenExistingWallet').click(openWalletFromMnemonic);
    $('#buttonUploadWallet').click(openWalletFromFile);
    $('#buttonShowMnemonic').click(showMnemonic);
    $('#buttonShowAddresses').click(showAddressesAndBalances);
    $('#buttonSendAddresses').click(unlockWalletAndDeriveAddresses);
    $('#buttonSignTransaction').click(signTransaction);
    $('#buttonSendSignedTransaction').click(sendSignedTransaction);

	$("#selectNodeUrlShowAddressesID").on("change",showAddressesAndBalances);
	
    $('#linkDelete').click(deleteWallet);

    function showView(viewName) {
        // Hide all views and show the selected view only
        $('main > section').hide();
        $('#' + viewName).show();

        if (localStorage.JSON) {
            $('#linkCreateNewWallet').hide();
            $('#linkImportWalletFromMnemonic').hide();
            $('#linkImportWalletFromFile').hide();

            $('#linkShowMnemonic').show();
            $('#linkShowAddressesAndBalances').show();
            $('#linkSendTransaction').show();
            $('#linkDelete').show();
        }
        else {
            $('#linkShowMnemonic').hide();
            $('#linkShowAddressesAndBalances').hide();
            $('#linkSendTransaction').hide();
            $('#linkDelete').hide();

            $('#linkCreateNewWallet').show();
            $('#linkImportWalletFromMnemonic').show();
            $('#linkImportWalletFromFile').show();
        }
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

    function showLoggedInButtons() {
        $('#linkCreateNewWallet').hide();
        $('#linkImportWalletFromMnemonic').hide();
        $('#linkImportWalletFromFile').hide();

        $('#linkShowMnemonic').show();
        $('#linkShowAddressesAndBalances').show();
        $('#linkSendTransaction').show();
        $('#linkDelete').show();
    }

    function encryptAndSaveJSON(wallet, password) {
        return wallet.encrypt(password, {}, showLoadingProgress)
		.then(json => {
			localStorage['JSON'] = json;
			showLoggedInButtons();
		})
		.catch(showError)
		.finally(hideLoadingBar);
    }

    function decryptWallet(json, password) {
        return ethers.Wallet.fromEncryptedWallet(json, password, showLoadingProgress);
    }

    function generateNewWallet() {
        let password = $('#passwordCreateWallet').val();
		let wallet = ethers.Wallet.createRandom();

		encryptAndSaveJSON(wallet, password)
			.then(() => {
				showInfo("PLEASE SAVE YOUR MNENONIC: " + wallet.mnemonic);
				$('#textareaCreateWalletResult').val(localStorage.JSON);
			});
    }

    function openWalletFromMnemonic() {		
        let mnemonic = $('#textareaOpenWallet').val();
		if (!ethers.HDNode.isValidMnemonic(mnemonic))
			return showError('Invalid mnemonic!');

		let password = $('#passwordOpenWallet').val();
		let wallet = ethers.Wallet.fromMnemonic(mnemonic);

		encryptAndSaveJSON(wallet, password)
			.then(() => {
				showInfo("Wallet successfully loaded!");
				$('#textareaOpenWalletResult').val(localStorage.JSON);
			});
    }

    function openWalletFromFile() {
        if ($('#walletForUpload')[0].files.length === 0 ) {
			return showError("Please select a file to upload.");
		}

		let password = $('#passwordUploadWallet').val();

		let fileReader = new FileReader();
		fileReader.onload = function () {
			let json = fileReader.result;

			decryptWallet(json, password)
				.then(wallet => {
						
					if (!wallet.mnemonic)
						return showError("Invalid JSON file!");

					localStorage['JSON'] = json;
					showInfo("Wallet successfully loaded");
					showLoggedInButtons();
				})
				.catch(showError)
				.finally(hideLoadingBar);
		};

		fileReader.readAsText($('#walletForUpload')[0].files[0]);
    }

    function showMnemonic() {
        let password = $('#passwordShowMnemonic').val();
		let json = localStorage.JSON;

		decryptWallet(json, password)
			.then(wallet => {
				showInfo("Your mnemonic is: " + wallet.mnemonic);
			})
			.catch(showError)
			.finally(hideLoadingBar);
    }

    function showAddressesAndBalances() {
        let password = $('#passwordShowAddresses').val();
		let json = localStorage.JSON;

		decryptWallet(json, password)
			.then(renderAddressesAndBalances)
			.catch(error => {
				$('#divAddressesAndBalances').empty();
				showError(error);
			})
			.finally(hideLoadingBar);
			
		async function renderAddressesAndBalances(wallet) {
			$('#divAddressesAndBalances').empty();
			
			nodeIdUrl = $('#selectNodeUrlShowAddressesID option:selected').attr('id');
			console.log('nodeIdUrl_ShowAddressesAndBalances', nodeIdUrl);
			
			let masterNode = ethers.HDNode.fromMnemonic(wallet.mnemonic);

			for (let i=0; i<5; i++) {
				let div = $('<div id="qrcode">');
				//let wallet = new ethers.Wallet(masterNode.derivePath(derivationPath + i).privateKey, provider);

				/*wallet.getBalance()
					.then((balance) => {
						div.qrcode(wallet.address);
						div.append($(`<p>${wallet.address}: ${ethers.utils.formatEther(balance)} ETH </p>`));						
						$('#divAddressesAndBalances').append(div);
					})
					.catch(showError)*/
					
				//let wallet = new ethers.Wallet(masterNode.derivePath(derivationPath + i).privateKey);
				//let publicAddress = wallet.address.toLowerCase().slice(2);
				
				// console.log('Public Key 1: ', masterNode.derivePath(derivationPath + i).publicKey); 
				// 0204ef60ebb59cc42ec3290237975624d7afdf4e98de8e586cfa1892d0e9b63d83  66 hex
				//console.log('Public Address 2: ', publicAddress); 
				// 330486f5ab80a9137d6c6407b1ed00cb1a15a229 40 hex
				
				// Public address derived from ethers wallet has different length. Switching to manually derived one and not using ethers wallet.
				let privateKey = masterNode.derivePath(derivationPath + i).privateKey;				
				privateKey = privateKey.toLowerCase().slice(2); 
				//console.log('Private Key: ', privateKey); // 5fbfa0a335bf3cb671afdb9b0ace4096968a2d29a2a0d7d07cc26350e1ad6e53  64 hex
				let derivedPublicKey = getPublicKeyFromPrivateKey(privateKey);
				console.log('Public Key: ', derivedPublicKey); // 04ef60ebb59cc42ec3290237975624d7afdf4e98de8e586cfa1892d0e9b63d830 65 hex
				let publicAddress = getPublicAddressFromPublicKey(derivedPublicKey);
				console.log('Public Address: ', publicAddress); // ee5cbddb0bee5f161552185165e02e642375054a 40 hex
	
				let restfulUrl = nodeIdUrl + "/address/" + publicAddress + "/balance";
				let restfulSuccessfulResponse = undefined;
				let restfulErrorResponse = undefined;
				
				await axios.get(restfulUrl, {timeout: restfulCallTimeout})
					.then(function (response) {						
						//console.log('response.data =', response.data);
						//console.log('response.status =', response.status);
						restfulSuccessfulResponse = response.data;
					})
					.catch(function (error) {
						console.log('error.response.status: ', error.response.status);
						console.log('error.response.data: ', error.response.data);
						restfulErrorResponse = error.response;												
					});				
				
				// If the RESTFul call to Blockchain Node yielded no response after the timeout, then just display an error message.
				if (restfulSuccessfulResponse === undefined && restfulErrorResponse === undefined) {
					errorMessage = `Attempt to call ${restfulUrl } to obtain account balance failed due to timeout`
					showError(errorMessage);
				}
				else if (restfulErrorResponse !== undefined) {
					errorMessage = `Attempt to call ${restfulUrl } to obtain account balance failed due to error encountered !!`;
					showError(errorMessage);					
				} else { // restfulSuccessfulResponse !== undefined
					/*let displayBalanceInfo = "Balance (6 confirmations or more): " + restfulSuccessfulResponse.safeBalance + "\n" +
							"Balance (1 confirmation or more): " + restfulSuccessfulResponse.confirmedBalance + "\n" +
							"Balance (pending - 0 or more confirmations): " + restfulSuccessfulResponse.pendingBalance;
					$('#textareaDisplayBalance').val(displayBalanceInfo);*/
					
					div.qrcode(publicAddress);
					div.append($(`<p>${publicAddress} </p>`));
					div.append($(`<p>Safe Balance (6 confirmations or more): ${restfulSuccessfulResponse.safeBalance} Micro coins </p>`));
					div.append($(`<p>Confirmed Balance (1 confirmation or more): ${restfulSuccessfulResponse.confirmedBalance} Micro coins </p>`));
					div.append($(`<p>Pending Balance (0 or more confirmations):  ${restfulSuccessfulResponse.pendingBalance} Micro coins </p>`));
					$('#divAddressesAndBalances').append(div);
				}			
				
			}
		}	
    }

    function unlockWalletAndDeriveAddresses() {
        let password = $('#passwordSendTransaction').val();
		let json = localStorage.JSON;

		decryptWallet(json, password)
			.then(wallet => {
				showInfo("Wallet successfully unlocked!");
				renderAddresses(wallet);
				$('#divSignAndSendTransaction').show();
			})
			.catch(showError)
			.finally(() => {
				$('#passwordSendTransaction').val('');		
				hideLoadingBar();
			});
			
		function renderAddresses(wallet) {
			$('#senderAddress').empty();

			let masterNode = ethers.HDNode.fromMnemonic(wallet.mnemonic);	

			for (let i=0; i<5; i++) {
				/*let wallet = new ethers.Wallet(masterNode.derivePath(derivationPath + i).privateKey, provider);
				let address = wallet.address;
				
				wallets[address] = wallet;
				let option = $(`<option id=${wallet.address}>`).text(address);
				$('#senderAddress').append(option);*/
				
				/*let wallet = new ethers.Wallet(masterNode.derivePath(derivationPath + i).privateKey);				
				let address = wallet.address;
				//let address = wallet.address.toLowerCase().slice(2);
				
				wallets[address] = wallet;				
				let option = $(`<option id=${wallet.address}>`).text(address);
				$('#senderAddress').append(option);*/
				
				// Public address derived from ethers wallet has different length. Switching to manually derived one and not using wallet.
				let privateKey = masterNode.derivePath(derivationPath + i).privateKey;				
				privateKey = privateKey.toLowerCase().slice(2); 
				//console.log('Private Key: ', privateKey);
				let derivedPublicKey = getPublicKeyFromPrivateKey(privateKey);
				//console.log('Public Key: ', derivedPublicKey);
				publicAddress = getPublicAddressFromPublicKey(derivedPublicKey);
				//console.log('Public Address: ', publicAddress);
				
				// Append public key along with address for later use
				//let option = $(`<option id=${publicAddress}>`).text(publicAddress);
				let option = $(`<option id=${privateKey}_${derivedPublicKey}_${publicAddress}>`).text(publicAddress);
				$('#senderAddress').append(option);
				
				
			}
		}			
    }

    /*function signTransaction() {
        let senderAddress = $('#senderAddress option:selected').attr('id');

		let wallet = wallets[senderAddress];
		if (!wallet)
			return showError("Invalid address!");

		let recipient = $('#recipientAddress').val();
		if (!recipient)
			return showError("Invalid recipient");

		let value = $('#transferValue').val();
		if (!value)
			return showError("Invalid transfer value!");

		wallet.getTransactionCount()
			.then(signTransaction)
			.catch(showError);
			
		function signTransaction(nonce) {
			let transaction = {
				nonce,
				gasLimit: 21000,
				gasPrice: ethers.utils.bigNumberify("20000000000"),
				to: recipient,
				value: ethers.utils.parseEther(value.toString()),
				data: "0x",
				chainId: provider.chainId
			};

			let signedTransaction = wallet.sign(transaction);
			$('#textareaSignedTransaction').val(signedTransaction);
		}
		
    }*/
	
	function signTransaction() {
		console.log('Start signTransaction...');
		
		// 'From' address validation
		/*let senderAddress = $('#senderAddress option:selected').attr('id');
		senderAddress = senderAddress.toLowerCase().slice(2);		
		console.log('senderAddress -> ', senderAddress);*/
		
		// 'PrivateKey', 'Public Key' and 'From' address validation
		let privateKey_publicKey_senderAddress = $('#senderAddress option:selected').attr('id');
		senderPrivateKey = privateKey_publicKey_senderAddress.split("_")[0];
		senderPubKey = privateKey_publicKey_senderAddress.split("_")[1];
		senderAddress = privateKey_publicKey_senderAddress.split("_")[2];
		
		//PrivateKey validation
		if (!senderPrivateKey)
			return showError("Invalid senderPrivateKey");		
		if (!isValidPrivateKey(senderPrivateKey))
			return showError("senderPrivateKey should be a 64-hex lower case string. ");
		
		//PublicKey validation
		if (!senderPubKey)
			return showError("Invalid senderPubKey");		
		if (!isValidPublicKey(senderPubKey))
			return showError("senderPubKey should be a 65-hex lower case string. ");
		
		// Address validation
		if (!senderAddress)
			return showError("Invalid senderAddress");
		if (!isValidPublicAddress(senderAddress))
			return showError("senderAddress should be a 40-hex lower case string. ");
		
		//console.log('senderPrivateKey -> ', senderPrivateKey);
		console.log('senderPubKey -> ', senderPubKey);
		console.log('senderAddress -> ', senderAddress);
		
		
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
		console.log('transferValue -> ', transferValue);
		
		
		// 'Fee' validation
		let transferFee = $('#transferFee').val();
		if (!transferFee)
			return showError("Invalid transferFee");
		if (!isNumeric(transferFee))
			return showError("transferFee should be a positive integer. ");		
		transferFee = parseInt(transferFee);
		console.log('transferFee -> ', transferFee);
		
		// 'Data'
		let dataToSend = $('#dataToSend').val().trim();		
		if(!dataToSend)
			dataToSend = 'Send Transaction'; //Default value		
		console.log('dataToSend -> ', dataToSend);
		
		let dateCreated = new Date().toISOString();
		
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

		let displaySignedTransaction = JSON.stringify(transactionToSend, undefined, 2);
		$('#textareaSignedTransaction').val(displaySignedTransaction);

		console.log('End signTransaction...');
	}

    /*function sendSignedTransaction() {
        let signedTransaction = $('#textareaSignedTransaction').val();		
		provider.sendTransaction(signedTransaction)
			.then(hash => {
				showInfo("Transaction hash: " + hash);
				
				let etherscanUrl = 'https://ropsten.etherscan.io/tx/' + hash;
				$('#textareaSendTransactionResult').val(etherscanUrl);
			})
			.catch(showError);
    }*/
	
	async function sendSignedTransaction() {
		console.log('Start sendSignedTransaction...');
		
		nodeIdUrl = $('#nodeUrlID option:selected').attr('id');
		console.log('nodeIdUrl_sendSignedTransaction: ', nodeIdUrl);
		
		let signedTransactionJsonString = $('#textareaSignedTransaction').val();
        if (signedTransactionJsonString.length === 0)
			return showError("Transaction needs to be created and signed first !!");
		
		//nodeIdUrl = $('#nodeUrlID option:selected').attr('id');
		
		let restfulUrl = nodeIdUrl + "/transactions/send";
		let restfulSuccessfulResponse = undefined;
		let restfulErrorResponse = undefined;
		
		let signedTransactionJson = JSON.parse(signedTransactionJsonString);
		
		await axios.post(restfulUrl, signedTransactionJson, {timeout: restfulCallTimeout})
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

			// Technique to prettify obtained from the https://coderwall.com/p/buwfjw/pretty-print-json-with-native-javascript
			// web page.
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
			showInfo("Transaction hash: " + restfulSuccessfulResponse.transactionDataHash);
			let blockChainNetworkUrl = nodeIdUrl + "/transactions/" + restfulSuccessfulResponse.transactionDataHash;
			
			$('#textareaSendTransactionResult').val(blockChainNetworkUrl);
		}
		
		console.log('End sendSignedTransaction...');
	}	

    function deleteWallet() {
        localStorage.clear();
		showView('viewHome');
    }

});