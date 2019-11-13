// Verifies if a value contained ONLY digits from 0 to 9.
function isNumeric(value) {
	if (typeof value === 'string') {
    	return /^\d+$/.test(value);
	}

	if (typeof value === 'number') {
		return (value >= 0);
	}

	return false;
}

// Verifies that a value is a valid 40-Hex Public Address string
function isValidPublicAddress(value) {
	if (typeof value === 'string') {
		return /^[0-9a-f]{40}$/.test(value);
	}

	return false;
}

// Verifies that a value is a valid 65-Hex Public Key string
function isValidPublicKey(value) {
	if (typeof value == 'string') {
		return /^[0-9a-f]{65}$/.test(value);
	}

	return false;
}

// Verifies that a value is a valid 64-Hex Private Key string
function isValidPrivateKey(value) {
	return isValid_64_Hex_string(value);
}

// Verifies that a value is a valid 64-Hex Signature element string
function isValidSignatureElement(value) {
	return isValid_64_Hex_string(value);
}

// Verifies that a value is a valid 64-Hex string
function isValid_64_Hex_string(value) {
	if (typeof value === 'string') {
		return /^[0-9a-f]{64}$/.test(value);
	}

	return false;
}

// Verifies that a value is a valid ISO8601 date string : YYYY-MM-DDTHH:MN:SS.MSSZ
// Reference --> https://stackoverflow.com/questions/52869695/check-if-a-date-string-is-in-iso-and-utc-format
function isValid_ISO_8601_date(value) {
	if (typeof value === 'string') {
		if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(value)) {
			return false;
		}

		let dateISO_String = null;
		try {
			let aDate = new Date(value);
			dateISO_String = aDate.toISOString();
		}
		catch (error) {
			return false;
		}

		return dateISO_String === value;
	}

	return false;
}

// Validates that a string is a valid URL fo9rmatted string.
//
// Reference --> https://stackoverflow.com/questions/5717093/check-if-a-javascript-string-is-a-url
function isValidURL(input) {
	pattern = '^(https?:\\/\\/)?' + // protocol
        '((([a-zA-Z\\d]([a-zA-Z\\d-]{0,61}[a-zA-Z\\d])*\\.)+' + // sub-domain + domain name
        '[a-zA-Z]{2,13})' + // extension
        '|((\\d{1,3}\\.){3}\\d{1,3})' + // OR ip (v4) address
        '|localhost)' + // OR localhost
        '(\\:\\d{1,5})?'; // port
    regex = new RegExp(pattern);
    return regex.test(input);
}