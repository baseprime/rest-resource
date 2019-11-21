"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var index_1 = tslib_1.__importDefault(require("../index"));
function normalizerFactory(name, options) {
    if (options === void 0) { options = {}; }
    try {
        return new exports[name](options);
    }
    catch (e) {
        if (e instanceof TypeError) {
            throw new Error(name + " is not a valid normalizer instance. Please see " + __filename + " for valid choices");
        }
        else {
            throw e;
        }
    }
}
exports.normalizerFactory = normalizerFactory;
var BaseNormalizer = /** @class */ (function () {
    function BaseNormalizer(_a) {
        var _b = (_a === void 0 ? {} : _a).uniqueKey, uniqueKey = _b === void 0 ? 'id' : _b;
        this.normalizeTo = String;
        this.uniqueKey = 'id';
        this.nullable = true;
        this.uniqueKey = uniqueKey;
    }
    BaseNormalizer.prototype.getType = function (value) {
        if (value === null || value === undefined) {
            return false;
        }
        return value.constructor;
    };
    BaseNormalizer.prototype.normalize = function (value) {
        var _this = this;
        var Ctor = this.getType(value);
        if (!Ctor && !this.nullable) {
            return this.normalizeTo();
        }
        else if (!Ctor) {
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
            return Boolean(value) ? 'true' : '';
        }
        else {
            return this.normalizeTo(value);
        }
    };
    return BaseNormalizer;
}());
exports.BaseNormalizer = BaseNormalizer;
var StringNormalizer = /** @class */ (function (_super) {
    tslib_1.__extends(StringNormalizer, _super);
    function StringNormalizer() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return StringNormalizer;
}(BaseNormalizer));
exports.StringNormalizer = StringNormalizer;
var NumberNormalizer = /** @class */ (function (_super) {
    tslib_1.__extends(NumberNormalizer, _super);
    function NumberNormalizer() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.nullable = false;
        _this.normalizeTo = Number;
        return _this;
    }
    return NumberNormalizer;
}(BaseNormalizer));
exports.NumberNormalizer = NumberNormalizer;
var BooleanNormalizer = /** @class */ (function (_super) {
    tslib_1.__extends(BooleanNormalizer, _super);
    function BooleanNormalizer() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.nullable = false;
        _this.normalizeTo = Boolean;
        return _this;
    }
    return BooleanNormalizer;
}(StringNormalizer));
exports.BooleanNormalizer = BooleanNormalizer;
var CurrencyNormalizer = /** @class */ (function (_super) {
    tslib_1.__extends(CurrencyNormalizer, _super);
    function CurrencyNormalizer() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    CurrencyNormalizer.prototype.normalize = function (value) {
        var superVal = _super.prototype.normalize.call(this, value);
        var intermediateVal = [].concat(superVal).map(function (val) { return Number(val).toFixed(2); });
        return Array.isArray(superVal) ? intermediateVal : intermediateVal.shift();
    };
    return CurrencyNormalizer;
}(NumberNormalizer));
exports.CurrencyNormalizer = CurrencyNormalizer;
//# sourceMappingURL=normalization.js.map