"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var index_1 = tslib_1.__importDefault(require("./index"));
var assert_1 = tslib_1.__importDefault(require("assert"));
var exceptions_1 = require("./exceptions");
var util_1 = require("./util");
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
        this._resources = {};
        assert_1.default(typeof to === 'function', "RelatedManager expected first parameter to be Resource class, received \"" + to + "\". Please double check related definitions on class.");
        this.to = to;
        this.value = value;
        this.many = Array.isArray(value);
        this.primaryKeys = this.getPrimaryKeys();
        if (!this.value || (this.many && !Object.keys(this.value).length)) {
            this.resolved = true;
        }
    }
    /**
     * Check if values exist on manager
     */
    RelatedManager.prototype.hasValues = function () {
        if (this.many) {
            return this.value.length > 0;
        }
        return Boolean(this.value);
    };
    RelatedManager.prototype.canAutoResolve = function () {
        var value = this.value;
        var isObject = Object === this.getValueContentType();
        var hasIds = this.primaryKeys.length > 0;
        if (this.many) {
            return isObject && hasIds && this.primaryKeys.length === value.length;
        }
        return isObject && hasIds;
    };
    /**
     * Return a constructor so we can guess the content type. For example, if an object literal
     * is passed, this function should return `Object`, and it's likely one single object literal representing attributes.
     * If the constructor is an `Array`, then all we know is that there are many of these sub items (in which case, we're
     * taking the first node of that array and using that node to guess). If it's a `Number`, then it's likely
     * that it's just a primary key. If it's a `Resource` instance, it should return `Resource`. Etc.
     * @returns Function
     */
    RelatedManager.prototype.getValueContentType = function () {
        return util_1.getContentTypeWeak(this.value);
    };
    /**
     * Get the current value and the content type and turn it into a list of primary keys
     * @returns String
     */
    RelatedManager.prototype.getPrimaryKeys = function () {
        var _this = this;
        if (!Boolean(this.value) || (Array.isArray(this.value) && !this.value.length)) {
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
     * @param id String | Number
     */
    RelatedManager.prototype.getOne = function (id, options) {
        var _this = this;
        return this.to.detail(id, options).then(function (resource) {
            assert_1.default(resource.getConstructor().toResourceName() == _this.to.toResourceName(), "Related class detail() returned invalid instance: " + resource.toResourceName() + " (returned) !== " + _this.to.toResourceName() + " (expected)");
            _this._resources[resource.id] = resource;
            return resource;
        });
    };
    /**
     * Same as getOne but allow lookup by index
     * @param index Number
     */
    RelatedManager.prototype.getOneAtIndex = function (index) {
        return this.getOne(this.primaryKeys[index]);
    };
    /**
     * Get all loaded resources relevant to this relation
     * Like manager.resources getter except it won't throw an AttributeError and will return with any loaded resources if its ID is listed in `this.primaryKeys`
     */
    RelatedManager.prototype.getAllLoaded = function () {
        try {
            return this.resources;
        }
        catch (e) {
            if (e.name === 'AttributeError') {
                // Some resources aren't loaded -- just return any cached resources
                var cachedObjects = [];
                for (var _i = 0, _a = this.primaryKeys; _i < _a.length; _i++) {
                    var id = _a[_i];
                    // Check relation cache
                    var cached = this.to.getCached(id);
                    // If cache is good, add it to the list of objects to respond wtih
                    if (cached) {
                        cachedObjects.push(cached.resource);
                    }
                }
                return cachedObjects;
            }
            else {
                throw e;
            }
        }
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
                        return [2 /*return*/, Object.values(this.resources)];
                }
            });
        });
    };
    RelatedManager.prototype.next = function (options) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var promises;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        promises = [];
                        if (!!this.resolved) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.resolve(options)];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        // Take 0 to n items from this.deferred where n is this.batchSize
                        this.deferred.splice(0, this.batchSize).forEach(function (deferredFn) {
                            promises.push(deferredFn());
                        });
                        return [4 /*yield*/, Promise.all(promises)];
                    case 3: return [2 /*return*/, _a.sent()];
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
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.next(options)];
                    case 1:
                        _a.sent();
                        if (!this.deferred.length) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.all(options)];
                    case 2: 
                    // Still have some left
                    return [2 /*return*/, _a.sent()];
                    case 3: return [2 /*return*/, Object.values(this.resources)];
                }
            });
        });
    };
    RelatedManager.prototype.resolveFromObjectValue = function () {
        var Ctor = this.to;
        var value = this.value;
        var contentType = this.getValueContentType();
        var newResources = {};
        assert_1.default(Object === contentType, "Expected RelatedResource.value to be an Object. Received " + contentType);
        try {
            if (this.many) {
                for (var i in value) {
                    var resource = new Ctor(value[i]);
                    assert_1.default(!!resource.id, "RelatedResource.value[" + i + "] does not have an ID.");
                    newResources[resource.id] = resource;
                }
            }
            else {
                var resource = new Ctor(value);
                assert_1.default(!!resource.id, "RelatedResource value does not have an ID.");
                newResources[this.getIdFromObject(value)] = new Ctor(value);
            }
            this.resolved = true;
            Object.assign(this._resources, newResources);
            return true;
        }
        catch (e) {
            throw e;
        }
    };
    /**
     * Add a resource to the manager
     * @param resource Resource instance
     */
    RelatedManager.prototype.add = function (resource) {
        assert_1.default(this.many, "Related Manager \"many\" must be true to add()");
        assert_1.default(resource.id, "Resource must be saved before adding to Related Manager");
        assert_1.default(resource.getConstructor() === this.to, "Related Manager add() expected " + this.to.toResourceName() + ", received " + resource.getConstructor().toResourceName());
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
        this._resources[resource.id] = resource;
    };
    /**
     * Create a copy of `this` except with new value(s)
     * @param value
     */
    RelatedManager.prototype.fromValue = function (value) {
        var Ctor = this.constructor;
        return new Ctor(this.to, value);
    };
    Object.defineProperty(RelatedManager.prototype, "resources", {
        /**
         * Getter -- get `this._resources` but make sure we've actually retrieved the objects first
         * Throws AttributeError if `this.resolve()` hasn't finished
         */
        get: function () {
            if (!this.resolved) {
                throw new exceptions_1.AttributeError("Can't read results of " + this.constructor.name + "[resources], " + this.to.toResourceName() + " must resolve() first");
            }
            var allObjects = Object.values(this._resources);
            return allObjects;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(RelatedManager.prototype, "resource", {
        /**
         * Getter -- Same as manager.resources except returns first node
         */
        get: function () {
            return this.resources[0];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(RelatedManager.prototype, "length", {
        get: function () {
            return this.primaryKeys.length;
        },
        enumerable: true,
        configurable: true
    });
    RelatedManager.prototype.toJSON = function () {
        return JSON.parse(JSON.stringify(this.value));
    };
    return RelatedManager;
}());
exports.default = RelatedManager;
//# sourceMappingURL=related.js.map