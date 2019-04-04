"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var BaseError = /** @class */ (function (_super) {
    tslib_1.__extends(BaseError, _super);
    function BaseError() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /**
     * This exists because Webpack creates a whole new copy of this class, except when you're
     *   comparing types in memory (eg. exception instanceof ValidationError) where exception is
     *   a transpiled instance of this class, and ValidationError is imported via non-transpiled
     *   methods (TypeScript). We need a way to check if either are instanceof ValidationError
     * @param exception
     */
    BaseError.isInstance = function (exception) {
        return (exception.name && exception.name === this.name) || exception instanceof this;
    };
    return BaseError;
}(Error));
exports.BaseError = BaseError;
var ImproperlyConfiguredError = /** @class */ (function (_super) {
    tslib_1.__extends(ImproperlyConfiguredError, _super);
    function ImproperlyConfiguredError() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.name = 'ImproperlyConfiguredError';
        return _this;
    }
    return ImproperlyConfiguredError;
}(BaseError));
exports.ImproperlyConfiguredError = ImproperlyConfiguredError;
var CacheError = /** @class */ (function (_super) {
    tslib_1.__extends(CacheError, _super);
    function CacheError() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.name = 'CacheError';
        return _this;
    }
    return CacheError;
}(BaseError));
exports.CacheError = CacheError;
var AttributeError = /** @class */ (function (_super) {
    tslib_1.__extends(AttributeError, _super);
    function AttributeError() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.name = 'AttributeError';
        return _this;
    }
    return AttributeError;
}(BaseError));
exports.AttributeError = AttributeError;
var ValidationError = /** @class */ (function (_super) {
    tslib_1.__extends(ValidationError, _super);
    function ValidationError(fieldOrArray, message) {
        if (message === void 0) { message = ''; }
        var _this = _super.call(this, message) || this;
        _this.name = 'ValidationError';
        if (Array.isArray(fieldOrArray)) {
            _this.message = fieldOrArray.join('\n');
        }
        else if (!_this.message && fieldOrArray) {
            _this.message = fieldOrArray + ": This field is not valid";
            _this.field = fieldOrArray;
        }
        else if (_this.message && 'string' === typeof fieldOrArray) {
            _this.message = fieldOrArray + ": " + _this.message;
            _this.field = fieldOrArray;
        }
        return _this;
    }
    return ValidationError;
}(BaseError));
exports.ValidationError = ValidationError;
//# sourceMappingURL=exceptions.js.map