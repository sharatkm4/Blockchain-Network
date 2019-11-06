
// validate if value contains ONLY digits
function isNumeric(value) {
    return /^\d+$/.test(value);
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
    isNumeric
}