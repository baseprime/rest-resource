"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function camelize(str) {
    return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function (match, index) {
        if (+match === 0)
            return '';
        return index == 0 ? match.toLowerCase() : match.toUpperCase();
    });
}
exports.camelize = camelize;
//# sourceMappingURL=util.js.map