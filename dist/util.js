"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var index_1 = tslib_1.__importDefault(require("./index"));
var lodash_1 = require("lodash");
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
        var rand = (Math.random() * 16) | 0;
        var value = character === 'x' ? rand : (rand & 0x3) | 0x8;
        return value.toString(16);
    });
}
exports.uuidWeak = uuidWeak;
function getContentTypeWeak(value) {
    var node = lodash_1.first([].concat(value));
    var Ctor = node.constructor;
    if (Ctor.prototype instanceof index_1.default) {
        return index_1.default;
    }
    else {
        return Ctor;
    }
}
exports.getContentTypeWeak = getContentTypeWeak;
//# sourceMappingURL=util.js.map