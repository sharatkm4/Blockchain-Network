
// validate if value contains ONLY digits
function isNumeric(value) {
    if (typeof value === 'string') {
        return /^\d+$/.test(value);
    }

    if (typeof value === 'number') {
        return (value >= 0);
    }

    return false;
}

// verify if the value is a valid Address (40-Hex)
function isValidAddress(value) {
    if (typeof value === 'string') {
        return /^[0-9a-f]{40}$/.test(value);
   }
   return false;
}

// Verifies if the value is a valid 65-Hex string
function isValidPublicKey(value) {
    if (typeof value == 'string') {
        return /^[0-9a-f]{65}$/.test(value);
    }
    return false;
}

// Verifies if the value is a valid 64-Hex string
function isValid_64_Hex_string(value) {
    if (typeof value === 'string') {
        return /^[0-9a-f]{64}$/.test(value);
    }

    return false;
}

// Verifies if the value is a valid ISO8601 date string : YYYY-MM-DDTHH:MN:SS.MSSZ
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


// convert javaScript map object into javaScript object for later use in JSON.stringify
function strMapToObj(strMap) {
    let obj = Object.create(null);
    for (let [k,v] of strMap) {
        obj[k] = v;
    }
    return obj;
}

// convert javaScript object into javaScript map object
function objToStrMap(obj) {
    let strMap = new Map();
    for (let k of Object.keys(obj)) {
        strMap.set(k, obj[k]);
    }
    return strMap;
}

module.exports = {
    strMapToObj,
    objToStrMap,
    isNumeric,
    isValidAddress,
    isValid_ISO_8601_date,
    isValidPublicKey,
    isValid_64_Hex_string
}