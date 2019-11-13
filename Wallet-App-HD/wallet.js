$(document).ready(function () {
    const derivationPath = "m/44'/60'/0'/0/";
    const provider = ethers.providers.getDefaultProvider('ropsten');

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
					
				let wallet = new ethers.Wallet(masterNode.derivePath(derivationPath + i).privateKey);
				let publicAddress = wallet.address.toLowerCase().slice(2);
				
				let nodeIdUrl = "http://localhost:5555";
				//let nodeIdUrl = "https:/stormy-everglades-34766.herokuapp.com";				
				let restfulUrl = nodeIdUrl + "/address/" + publicAddress + "/balance";
				let restfulSuccessfulResponse = undefined;
				let restfulErrorResponse = undefined;
				
				await axios.get(restfulUrl, {timeout: restfulCallTimeout})
					.then(function (response) {						
						console.log('response.data =', response.data);
						console.log('response.status =', response.status);
						restfulSuccessfulResponse = response.data;
					})
					.catch(function (error) {
						// console.log('error =', error);

						// When in browser, to get the response body, you must get it from the "error.response" or else
						// you will not be able to get it outside of here.
						//
						// Reference ---> https://github.com/axios/axios/issues/960
						if (error.response === undefined) {
							restfulErrorResponse = error;
						}
						else {
							restfulErrorResponse = error.response;
						}
				});				
				
				// If the RESTFul call to Blockchain Node yielded no response after the timeout, then just display an error message.
				if (restfulSuccessfulResponse === undefined && restfulErrorResponse === undefined) {
					errorMessage = `Attempt to call ${restfulUrl } to obtain account balance failed due to timeout - unable to ` +
						`get account balance.`
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
					div.append($(`<p>${publicAddress}: ${restfulSuccessfulResponse.confirmedBalance} Micro coins </p>`));
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
				
				let wallet = new ethers.Wallet(masterNode.derivePath(derivationPath + i).privateKey);				
				let address = wallet.address;
				//let address = wallet.address.toLowerCase().slice(2);
				
				wallets[address] = wallet;				
				let option = $(`<option id=${wallet.address}>`).text(address);
				$('#senderAddress').append(option);
				
			}
		}			
    }

    function signTransaction() {
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
		
    }

    function sendSignedTransaction() {
        let signedTransaction = $('#textareaSignedTransaction').val();		
		provider.sendTransaction(signedTransaction)
			.then(hash => {
				showInfo("Transaction hash: " + hash);
				
				let etherscanUrl = 'https://ropsten.etherscan.io/tx/' + hash;
				$('#textareaSendTransactionResult').val(etherscanUrl);
			})
			.catch(showError);
    }

    function deleteWallet() {
        localStorage.clear();
		showView('viewHome');
    }

});