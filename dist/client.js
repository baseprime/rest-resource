"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var axios_1 = tslib_1.__importDefault(require("axios"));
tslib_1.__exportStar(require("axios"), exports);
var BaseClient = /** @class */ (function () {
    function BaseClient(baseURL, config) {
        if (config === void 0) { config = {}; }
        this.config = {};
        this.config = Object.assign({ baseURL: baseURL }, config);
        this.axios = axios_1.default.create(this.config);
    }
    Object.defineProperty(BaseClient.prototype, "hostname", {
        get: function () {
            return this.config.baseURL;
        },
        set: function (value) {
            this.config.baseURL = value;
            this.axios = axios_1.default.create(this.config);
        },
        enumerable: true,
        configurable: true
    });
    BaseClient.extend = function (classProps) {
        // @todo Figure out typings here -- this works perfectly but typings are not happy
        // @ts-ignore
        return Object.assign(/** @class */ (function (_super) {
            tslib_1.__extends(class_1, _super);
            function class_1() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            return class_1;
        }(this)), classProps);
    };
    BaseClient.prototype.negotiateContent = function (ResourceClass) {
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
    /**
     * Client.prototype.list() and Client.prototype.detail() are the primary purpose of defining these here. Simply runs a GET on the list route path (eg. /users) and negotiates the content
     * @param ResourceClass
     * @param options
     */
    BaseClient.prototype.list = function (ResourceClass, options) {
        if (options === void 0) { options = {}; }
        return this.get(ResourceClass.getListRoutePath(options.query), options).then(this.negotiateContent(ResourceClass));
    };
    /**
     * Client.prototype.detail() and Client.prototype.list() are the primary purpose of defining these here. Simply runs a GET on the detail route path (eg. /users/123) and negotiates the content
     * @param ResourceClass
     * @param options
     */
    BaseClient.prototype.detail = function (ResourceClass, id, options) {
        if (options === void 0) { options = {}; }
        return this.get(ResourceClass.getDetailRoutePath(id, options.query), options).then(this.negotiateContent(ResourceClass));
    };
    BaseClient.prototype.get = function (path, options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        return this.axios.get(path, options).catch(function (e) { return _this.onError(e); });
    };
    BaseClient.prototype.put = function (path, body, options) {
        var _this = this;
        if (body === void 0) { body = {}; }
        if (options === void 0) { options = {}; }
        return this.axios.put(path, body, options).catch(function (e) { return _this.onError(e); });
    };
    BaseClient.prototype.post = function (path, body, options) {
        var _this = this;
        if (body === void 0) { body = {}; }
        if (options === void 0) { options = {}; }
        return this.axios.post(path, body, options).catch(function (e) { return _this.onError(e); });
    };
    BaseClient.prototype.patch = function (path, body, options) {
        var _this = this;
        if (body === void 0) { body = {}; }
        if (options === void 0) { options = {}; }
        return this.axios.patch(path, body, options).catch(function (e) { return _this.onError(e); });
    };
    BaseClient.prototype.delete = function (path, options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        return this.axios.delete(path, options).catch(function (e) { return _this.onError(e); });
    };
    BaseClient.prototype.head = function (path, options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        return this.axios.head(path, options).catch(function (e) { return _this.onError(e); });
    };
    BaseClient.prototype.options = function (path, options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        // @ts-ignore -- Axios forgot to add options to AxiosInstance interface
        return this.axios.options(path, options).catch(function (e) { return _this.onError(e); });
    };
    BaseClient.prototype.bindMethodsToPath = function (relativePath) {
        return {
            get: this.get.bind(this, relativePath),
            post: this.post.bind(this, relativePath),
            put: this.put.bind(this, relativePath),
            patch: this.patch.bind(this, relativePath),
            head: this.head.bind(this, relativePath),
            options: this.options.bind(this, relativePath),
            delete: this.delete.bind(this, relativePath),
        };
    };
    // Optionally catch all errors in client class (default: rethrow)
    BaseClient.prototype.onError = function (exception) {
        throw exception;
    };
    return BaseClient;
}());
exports.BaseClient = BaseClient;
var DefaultClient = /** @class */ (function (_super) {
    tslib_1.__extends(DefaultClient, _super);
    function DefaultClient() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return DefaultClient;
}(BaseClient));
exports.DefaultClient = DefaultClient;
var JWTBearerClient = /** @class */ (function (_super) {
    tslib_1.__extends(JWTBearerClient, _super);
    // This is just a basic client except we're including a token in the requests
    function JWTBearerClient(baseURL, token, options) {
        if (token === void 0) { token = ''; }
        if (options === void 0) { options = {}; }
        var _this = this;
        var headers = Object.assign({
            Authorization: "Bearer " + token,
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
            var payloadBuffer = Buffer.from(payloadBase64, 'base64').toString();
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
}(BaseClient));
exports.JWTBearerClient = JWTBearerClient;
//# sourceMappingURL=client.js.map