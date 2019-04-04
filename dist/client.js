"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var axios_1 = tslib_1.__importDefault(require("axios"));
tslib_1.__exportStar(require("axios"), exports);
var DefaultClient = /** @class */ (function () {
    function DefaultClient(baseURL, config) {
        if (config === void 0) { config = {}; }
        var opts = Object.assign({ baseURL: baseURL }, config);
        this.hostname = opts.baseURL;
        this.axios = axios_1.default.create(opts);
    }
    DefaultClient.prototype.negotiateContent = function (ResourceClass) {
        // Should always return a function
        return function (response) {
            var objects = [];
            if (Array.isArray(response.data)) {
                response.data.forEach(function (attributes) { return objects.push(new ResourceClass(attributes)); });
            }
            else {
                objects.push(new ResourceClass(response.data));
            }
            return {
                response: response,
                resources: objects,
                count: function () { return response.headers['Pagination-Count']; },
                pages: function () { return Math.ceil(response.headers['Pagination-Count'] / response.headers['Pagination-Limit']); },
                currentPage: function () { return response.headers['Pagination-Page']; },
                perPage: function () { return response.headers['Pagination-Limit']; },
            };
        };
    };
    DefaultClient.prototype.list = function (ResourceClass, options) {
        if (options === void 0) { options = {}; }
        return this.get(ResourceClass.getListRoutePath(options.query)).then(this.negotiateContent(ResourceClass));
    };
    DefaultClient.prototype.detail = function (ResourceClass, id, options) {
        if (options === void 0) { options = {}; }
        return this.get(ResourceClass.getDetailRoutePath(id, options.query)).then(this.negotiateContent(ResourceClass));
    };
    DefaultClient.prototype.get = function (path, options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        return this.axios.get(path, options).catch(function (e) { return _this.onError(e); });
    };
    DefaultClient.prototype.put = function (path, body, options) {
        var _this = this;
        if (body === void 0) { body = {}; }
        if (options === void 0) { options = {}; }
        return this.axios.put(path, body, options).catch(function (e) { return _this.onError(e); });
    };
    DefaultClient.prototype.post = function (path, body, options) {
        var _this = this;
        if (body === void 0) { body = {}; }
        if (options === void 0) { options = {}; }
        return this.axios.post(path, body, options).catch(function (e) { return _this.onError(e); });
    };
    DefaultClient.prototype.patch = function (path, body, options) {
        var _this = this;
        if (body === void 0) { body = {}; }
        if (options === void 0) { options = {}; }
        return this.axios.patch(path, body, options).catch(function (e) { return _this.onError(e); });
    };
    DefaultClient.prototype.delete = function (path, options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        return this.axios.delete(path, options).catch(function (e) { return _this.onError(e); });
    };
    DefaultClient.prototype.head = function (path, options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        return this.axios.head(path, options).catch(function (e) { return _this.onError(e); });
    };
    DefaultClient.prototype.options = function (path, options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        // @ts-ignore -- Axios forgot to add options to AxiosInstance interface
        return this.axios.options(path, options).catch(function (e) { return _this.onError(e); });
    };
    DefaultClient.prototype.onError = function (exception) {
        throw exception;
    };
    return DefaultClient;
}());
exports.DefaultClient = DefaultClient;
var JWTBearerClient = /** @class */ (function (_super) {
    tslib_1.__extends(JWTBearerClient, _super);
    // This is just a basic client except we're including a token in the requests
    function JWTBearerClient(baseURL, token, options) {
        if (token === void 0) { token = ''; }
        if (options === void 0) { options = {}; }
        var _this = this;
        var headers = Object.assign({
            'Authorization': "Bearer " + token
        }, options.headers);
        options.headers = headers;
        _this = _super.call(this, baseURL, options) || this;
        _this.token = token;
        return _this;
    }
    JWTBearerClient.prototype.getTokenPayload = function () {
        try {
            var jwtPieces = this.token.split('.');
            var payloadBase64 = jwtPieces[1];
            var payloadBuffer = new Buffer(payloadBase64, 'base64');
            return JSON.parse(payloadBuffer.toString());
        }
        catch (e) {
            return undefined;
        }
    };
    JWTBearerClient.prototype.tokenIsExpired = function () {
        try {
            var payload = this.getTokenPayload();
            var nowInSeconds = Math.floor(Date.now() / 1000);
            return payload.exp < nowInSeconds;
        }
        catch (e) {
            return true;
        }
    };
    JWTBearerClient.prototype.tokenIsValid = function () {
        return this.token && !this.tokenIsExpired();
    };
    return JWTBearerClient;
}(DefaultClient));
exports.JWTBearerClient = JWTBearerClient;
//# sourceMappingURL=client.js.map