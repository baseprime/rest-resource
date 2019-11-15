"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var index_1 = tslib_1.__importDefault(require("./index"));
function formatFactory(name, options) {
    if (options === void 0) { options = {}; }
    try {
        return new exports[name](options);
    }
    catch (e) {
        if (e instanceof TypeError) {
            throw new Error(name + " is not a valid formatter. Please see " + __filename + " for valid choices");
        }
        else {
            throw e;
        }
    }
}
exports.formatFactory = formatFactory;
var BaseFormatter = /** @class */ (function () {
    function BaseFormatter(_a) {
        var _b = (_a === void 0 ? {} : _a).uniqueKey, uniqueKey = _b === void 0 ? 'id' : _b;
        this.normalizeTo = String;
        this.uniqueKey = 'id';
        this.uniqueKey = uniqueKey;
    }
    BaseFormatter.prototype.getType = function (value) {
        if (value === null || value === undefined) {
            return false;
        }
        return value.constructor;
    };
    BaseFormatter.prototype.normalize = function (value) {
        var _this = this;
        var Ctor = this.getType(value);
        if (!Ctor) {
            return value;
        }
        if (Ctor === this.normalizeTo) {
            return value;
        }
        else if (Ctor === index_1.default) {
            return value.id;
        }
        else if (Ctor === Object && Ctor !== null) {
            return this.normalize(value[this.uniqueKey]);
        }
        else if (Ctor === Array) {
            return value.map(function (item) { return _this.normalize(item); });
        }
        else if (Ctor === Boolean) {
            return Boolean(value) ? 'True' : '';
        }
        else {
            return this.normalizeTo(value);
        }
    };
    return BaseFormatter;
}());
exports.BaseFormatter = BaseFormatter;
var StringFormatter = /** @class */ (function (_super) {
    tslib_1.__extends(StringFormatter, _super);
    function StringFormatter() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return StringFormatter;
}(BaseFormatter));
exports.StringFormatter = StringFormatter;
var NumberFormatter = /** @class */ (function (_super) {
    tslib_1.__extends(NumberFormatter, _super);
    function NumberFormatter() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.normalizeTo = Number;
        return _this;
    }
    return NumberFormatter;
}(BaseFormatter));
exports.NumberFormatter = NumberFormatter;
var BooleanFormatter = /** @class */ (function (_super) {
    tslib_1.__extends(BooleanFormatter, _super);
    function BooleanFormatter() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.normalizeTo = Boolean;
        return _this;
    }
    return BooleanFormatter;
}(StringFormatter));
exports.BooleanFormatter = BooleanFormatter;
var CurrencyFormatter = /** @class */ (function (_super) {
    tslib_1.__extends(CurrencyFormatter, _super);
    function CurrencyFormatter() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    CurrencyFormatter.prototype.normalize = function (value) {
        return _super.prototype.normalize.call(this, value).toFixed(2);
    };
    return CurrencyFormatter;
}(NumberFormatter));
exports.CurrencyFormatter = CurrencyFormatter;
//# sourceMappingURL=formatting.js.map