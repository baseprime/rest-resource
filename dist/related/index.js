"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var index_1 = tslib_1.__importDefault(require("../index"));
var lodash_1 = require("lodash");
var assert_1 = tslib_1.__importDefault(require("assert"));
var exceptions_1 = require("../exceptions");
var RelatedManager = /** @class */ (function () {
    function RelatedManager(to, value) {
        this.many = false;
        /**
         * Is `true` when `resolve()` is called and first page of results loads up to `this.batchSize` objects
         */
        this.resolved = false;
        /**
         * Deferred promises when `this.resolve()` hits the max requests in `this.batchSize`
         */
        this.deferred = [];
        /**
         * When sending `this.resolve()`, only send out the first `n` requests where `n` is `this.batchSize`. You
         * can call `this.all()` to recursively get all objects
         */
        this.batchSize = Infinity;
        this._objects = {};
        this.to = to;
        this.value = value;
        this.many = Array.isArray(value);
        this.primaryKeys = this.getPrimaryKeys();
        if (!this.value || (this.many && !Object.keys(this.value).length)) {
            this.resolved = true;
        }
    }
    /**
     * Return a constructor so we can guess the content type. For example, if an object literal
     * is passed, this function should return `Object`, and it's likely one single object literal representing attributes.
     * If the constructor is an `Array`, then all we know is that there are many of these sub items (in which case, we're
     * taking the first node of that array and using that node to guess). If it's a `Number`, then it's likely
     * that it's just a primary key. If it's a `Resource` instance, it should return `Resource`. Etc.
     * @returns Function
     */
    RelatedManager.prototype.getValueContentType = function () {
        var node = lodash_1.first([].concat(this.value));
        var Ctor = node.constructor;
        if (Ctor.prototype instanceof index_1.default) {
            return index_1.default;
        }
        else {
            return Ctor;
        }
    };
    /**
     * Get the current value and the content type and turn it into a list of primary keys
     * @returns String
     */
    RelatedManager.prototype.getPrimaryKeys = function () {
        var _this = this;
        if (!Boolean(this.value)) {
            return [];
        }
        var contentType = this.getValueContentType();
        var iterValue = this.value;
        if (this.many) {
            if (contentType === index_1.default) {
                return iterValue.map(function (resource) { return _this.getIdFromResource(resource); });
            }
            else if (this.many && contentType === Object) {
                return iterValue.map(function (record) { return _this.getIdFromObject(record); });
            }
            else {
                return this.value;
            }
        }
        else {
            if (contentType === index_1.default) {
                return [this.getIdFromResource(this.value)];
            }
            else if (contentType === Object) {
                return [this.getIdFromObject(this.value)];
            }
            else {
                return [this.value];
            }
        }
    };
    /**
     * Get unique key property from object literal and turn it into a string
     * @param object Object
     */
    RelatedManager.prototype.getIdFromObject = function (object) {
        return String(object[this.to.uniqueKey]);
    };
    /**
     * Get unique key from resource instance
     * @param resource Resource
     */
    RelatedManager.prototype.getIdFromResource = function (resource) {
        return resource.id;
    };
    /**
     * Get a single resource from the endpoint given an ID
     * @param id String
     */
    RelatedManager.prototype.getOne = function (id, options) {
        var _this = this;
        return this.to.detail(id, options).then(function (resource) {
            assert_1.default(resource.getConstructor().toResourceName() == _this.to.toResourceName(), "Related class detail() returned invalid instance: " + resource.toResourceName() + " (returned) !== " + _this.to.toResourceName() + " (expected)");
            _this._objects[resource.id] = resource;
            return resource;
        });
    };
    /**
     * Primary function of the RelatedManager -- get some objects (`this.primaryKeys`) related to some
     * other Resource (`this.to` instance). Load the first n objects (`this.batchSize`) and set `this.resolved = true`.
     * Subsequent calls may be required to get all objects in `this.primaryKeys` because there is an inherent
     * limit to how many requests that can be made at one time. If you want to remove this limit, set `this.batchSize` to `Infinity`
     * @param options DetailOpts
     */
    RelatedManager.prototype.resolve = function (options) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var promises, i, pk;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        promises = [];
                        this.deferred = [];
                        for (i in this.primaryKeys) {
                            pk = this.primaryKeys[i];
                            if (Number(i) > this.batchSize) {
                                this.deferred.push(this.getOne.bind(this, pk, options));
                            }
                            else {
                                promises.push(this.getOne(pk, options));
                            }
                        }
                        return [4 /*yield*/, Promise.all(promises)];
                    case 1:
                        _a.sent();
                        this.resolved = true;
                        return [2 /*return*/, Object.values(this.objects)];
                }
            });
        });
    };
    /**
     * Calls pending functions in `this.deferred` until it's empty. Runs `this.resolve()` first if it hasn't been ran yet
     * @param options DetailOpts
     */
    RelatedManager.prototype.all = function (options) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var promises, i, deferredFn;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        promises = [];
                        if (!!this.resolved) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.resolve(options)];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        // Take 0 to n (this.batchSize) items from this.deferred
                        for (i = 0; i < this.batchSize; i++) {
                            deferredFn = this.deferred.shift();
                            if (deferredFn) {
                                promises.push(deferredFn());
                            }
                        }
                        return [4 /*yield*/, Promise.all(promises)];
                    case 3:
                        _a.sent();
                        if (this.deferred.length) {
                            return [2 /*return*/, this.all()];
                        }
                        else {
                            return [2 /*return*/, Object.values(this.objects)];
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Add a resource to the manager
     * @param resource Resource instance
     */
    RelatedManager.prototype.add = function (resource) {
        assert_1.default(this.many, "Related Manager \"many\" must be true to add()");
        assert_1.default(resource.id, "Resource must be saved before adding to Related Manager");
        assert_1.default(resource.getConstructor() === this.to, "Related Manager add() expected " + this.to.toResourceName() + ", recieved " + resource.getConstructor().toResourceName());
        var ContentCtor = this.getValueContentType();
        var value;
        if (ContentCtor === Object) {
            value = resource.toJSON();
        }
        else if (ContentCtor === Number || ContentCtor === String) {
            value = resource.id;
        }
        ;
        this.value.push(value);
        this._objects[resource.id] = resource;
    };
    Object.defineProperty(RelatedManager.prototype, "objects", {
        /**
         * Getter -- get `this._objects` but make sure we've actually retrieved the objects first
         * Throws AttributeError if `this.resolve()` hasn't finished
         */
        get: function () {
            if (!this.resolved) {
                throw new exceptions_1.AttributeError("Can't read results of " + this.constructor.name + "[objects], " + this.to.toResourceName() + " must resolve() first");
            }
            var allObjects = Object.values(this._objects);
            return allObjects;
        },
        enumerable: true,
        configurable: true
    });
    RelatedManager.prototype.toJSON = function () {
        return this.value;
    };
    return RelatedManager;
}());
exports.default = RelatedManager;
//# sourceMappingURL=index.js.map