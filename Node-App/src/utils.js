
// validate if value contains ONLY digits
function isNumeric(value) {
    return /^\d+$/.test(value);
}

// verify if the value is a valid Address (40-Hex)
function isValidAddress(value) {
    if (typeof value === 'string') {
        return /^[0-9a-f]{40}$/.test(value);
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
    isValidAddress
}