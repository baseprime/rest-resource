"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var ImproperlyConfiguredError = /** @class */ (function (_super) {
    tslib_1.__extends(ImproperlyConfiguredError, _super);
    function ImproperlyConfiguredError() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return ImproperlyConfiguredError;
}(Error));
exports.ImproperlyConfiguredError = ImproperlyConfiguredError;
var CacheError = /** @class */ (function (_super) {
    tslib_1.__extends(CacheError, _super);
    function CacheError() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return CacheError;
}(Error));
exports.CacheError = CacheError;
var AttributeError = /** @class */ (function (_super) {
    tslib_1.__extends(AttributeError, _super);
    function AttributeError() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return AttributeError;
}(TypeError));
exports.AttributeError = AttributeError;
//# sourceMappingURL=exceptions.js.map