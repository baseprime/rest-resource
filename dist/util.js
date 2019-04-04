"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Takes an input and camelizes it
 * @param str
 */
function camelize(str) {
    return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function (match, index) {
        if (+match === 0)
            return '';
        return index == 0 ? match.toLowerCase() : match.toUpperCase();
    });
}
exports.camelize = camelize;
/**
 * This is a very quick and primitive implementation of RFC 4122 UUID
 * Creates a basic variant UUID
 * Warning: Shouldn't be used of N >> 1e9
 */
function uuidWeak() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (character) {
        var rand = Math.random() * 16 | 0;
        var value = character === 'x' ? rand : (rand & 0x3 | 0x8);
        return value.toString(16);
    });
}
exports.uuidWeak = uuidWeak;
//# sourceMappingURL=util.js.map