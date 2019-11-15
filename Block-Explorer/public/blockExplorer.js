$(document).ready(function () {
    const derivationPath = "m/44'/60'/0'/0/";
    const provider = ethers.providers.getDefaultProvider('ropsten');

	let nodeIdUrl = "http://localhost:5555";
	//let nodeIdUrl = "https:/stormy-everglades-34766.herokuapp.com";
	
	
    showView("viewHome");
	changeUrls();

    $('#linkHome').click(function () {
        showView("viewHome");
		changeUrls();
    });

	$("#selectNodeUrlID").on("change",changeNodeIdUrls);
	
	function changeNodeIdUrls() {
		nodeIdUrl = $('#selectNodeUrlID option:selected').attr('id');
		changeUrls();
	}

	function changeUrls() {
		
		$("a#infoId").attr('href', nodeIdUrl+'/info');
		$("a#debugId").attr('href', nodeIdUrl+'/debug');
		$("a#debugResetChainId").attr('href', nodeIdUrl+'/debug/reset-chain');

		$("a#blocksId").attr('href', nodeIdUrl+'/blocks');
		$("a#blocksByIndexId").attr('href', nodeIdUrl+'/blocks/0');
		
		$("a#pendingTrnId").attr('href', nodeIdUrl+'/transactions/pending');
		$("a#confirmedTrnId").attr('href', nodeIdUrl+'/transactions/confirmed');
		$("a#trnByHashId").attr('href', nodeIdUrl+'/transactions/593e3a0c07c074002a945ae2a0817cf526a2830e4ead0e25ca3a7842fc5e629b');
		
	
		
	}

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

});