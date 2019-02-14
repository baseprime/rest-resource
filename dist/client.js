"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var axios_1 = tslib_1.__importDefault(require("axios"));
var DefaultClient = /** @class */ (function () {
    function DefaultClient(baseURL, config) {
        if (config === void 0) { config = {}; }
        var opts = Object.assign({ baseURL: baseURL }, config);
        this._axios = axios_1.default.create(opts);
    }
    DefaultClient.prototype.get = function (path, options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        return this._axios.get(path, options).catch(function (e) { return _this.onError(e); });
    };
    DefaultClient.prototype.put = function (path, body, options) {
        var _this = this;
        if (body === void 0) { body = {}; }
        if (options === void 0) { options = {}; }
        return this._axios.put(path, body, options).catch(function (e) { return _this.onError(e); });
    };
    DefaultClient.prototype.post = function (path, body, options) {
        var _this = this;
        if (body === void 0) { body = {}; }
        if (options === void 0) { options = {}; }
        return this._axios.post(path, body, options).catch(function (e) { return _this.onError(e); });
    };
    DefaultClient.prototype.patch = function (path, body, options) {
        var _this = this;
        if (body === void 0) { body = {}; }
        if (options === void 0) { options = {}; }
        return this._axios.patch(path, body, options).catch(function (e) { return _this.onError(e); });
    };
    DefaultClient.prototype.delete = function (path, options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        return this._axios.delete(path, options).catch(function (e) { return _this.onError(e); });
    };
    DefaultClient.prototype.onError = function (exception) {
        throw exception;
    };
    return DefaultClient;
}());
exports.DefaultClient = DefaultClient;
var JWTBearerClient = /** @class */ (function (_super) {
    tslib_1.__extends(JWTBearerClient, _super);
    function JWTBearerClient(baseURL, token, options) {
        if (token === void 0) { token = ''; }
        if (options === void 0) { options = {}; }
        var _this = this;
        var headers = Object.assign({
            'Authorization': "Bearer " + token
        }, options.headers);
        options.headers = headers;
        _this = _super.call(this, baseURL, options) || this;
        return _this;
    }
    return JWTBearerClient;
}(DefaultClient));
exports.JWTBearerClient = JWTBearerClient;
//# sourceMappingURL=client.js.map