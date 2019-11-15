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