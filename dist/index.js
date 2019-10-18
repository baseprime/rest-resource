"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var querystring_1 = require("querystring");
var client_1 = require("./client");
var util_1 = require("./util");
var related_1 = tslib_1.__importDefault(require("./related"));
var exceptions = require('./exceptions');
var assert = require('assert');
var isEqual = require('lodash').isEqual;
var Resource = /** @class */ (function () {
    function Resource(attributes, options) {
        var _this = this;
        if (attributes === void 0) { attributes = {}; }
        if (options === void 0) { options = {}; }
        this._attributes = {};
        this.attributes = {};
        this.managers = {};
        this.changes = {};
        var Ctor = this.getConstructor();
        var RelatedManagerCtor = Ctor.relatedManager;
        if (typeof Ctor.client !== 'object') {
            throw new exceptions.ImproperlyConfiguredError("Resource can't be used without Client class instance");
        }
        // Set up attributes and defaults
        this._attributes = Object.assign({}, Ctor.makeDefaultsObject(), attributes);
        // Set up Proxy to this._attributes
        this.attributes = new Proxy(this._attributes, {
            set: function (receiver, key, value) {
                receiver[key] = _this.toInternalValue(key, value);
                return true;
            },
            get: function (receiver, key) {
                return receiver[key];
            },
            defineProperty: function (target, prop, descriptor) {
                return Reflect.defineProperty(target, prop, descriptor);
            },
        });
        // Create related managers
        // Because we're using Object.assign above, we shouldn't have to iterate here again -- @todo improve it
        for (var attrKey in Ctor.related) {
            this.managers[attrKey] = new RelatedManagerCtor(Ctor.related[attrKey], this._attributes[attrKey]);
        }
        if (this.id) {
            Ctor.cacheResource(this);
        }
    }
    Object.defineProperty(Resource, "cache", {
        /**
         * Cache getter
         */
        get: function () {
            if (!this._cache || this._cache === Resource._cache) {
                this._cache = {};
                return this._cache;
            }
            return this._cache;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Resource, "uuid", {
        get: function () {
            if (!this._uuid) {
                this._uuid = util_1.uuidWeak();
                return this._uuid;
            }
            return this._uuid;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Cache a resource onto this class' cache for cacheMaxAge seconds
     * @param resource
     * @param replace
     */
    Resource.cacheResource = function (resource, replace) {
        if (replace === void 0) { replace = false; }
        if (!resource.id) {
            throw new exceptions.CacheError("Can't cache " + resource.toResourceName() + " resource without " + resource.getConstructor().uniqueKey + " field");
        }
        else if (replace) {
            try {
                return this.replaceCache(resource);
            }
            catch (e) { }
        }
        this.cache[resource.id] = {
            resource: resource,
            expires: this.cacheDeltaSeconds(),
        };
    };
    /**
     * Replace attributes on a cached resource onto this class' cache for cacheMaxAge seconds (useful for bubbling up changes to states that may be already rendered)
     * @param resource
     */
    Resource.replaceCache = function (resource) {
        if (!this.cache[resource.id]) {
            throw new exceptions.CacheError("Can't replace cache: resource doesn't exist");
        }
        Object.assign(this.cache[resource.id].resource.attributes, resource.attributes);
        this.cache[resource.id].expires = this.cacheDeltaSeconds();
    };
    Resource.clearCache = function () {
        this._cache = {};
    };
    /**
     * Get time delta in seconds of cache expiry
     */
    Resource.cacheDeltaSeconds = function () {
        return Date.now() + this.cacheMaxAge * 1000;
    };
    /**
     * Get a cached resource by ID
     * @param id
     */
    Resource.getCached = function (id) {
        var cached = this.cache[id];
        if (cached && cached.expires > Date.now()) {
            return cached;
        }
        return undefined;
    };
    Resource.getCachedAll = function () {
        var _this = this;
        return Object.keys(this.cache)
            .map(function (cacheKey) { return _this.getCached(cacheKey); })
            .filter(function (valid) { return !!valid; });
    };
    Object.defineProperty(Resource, "client", {
        /**
         * Get HTTP client for a resource Class
         * This is meant to be overridden if we want to define a client at any time
         */
        get: function () {
            if (!this._client) {
                throw new exceptions.ImproperlyConfiguredError('Resource client class not defined. Did you try Resource.setClient or overriding Resource.getClient?');
            }
            return this._client;
        },
        /**
         * Set HTTP client
         * @param client instanceof Client
         */
        set: function (client) {
            this._client = client;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Get list route path (eg. /users) to be used with HTTP requests and allow a querystring object
     * @param query Querystring
     */
    Resource.getListRoutePath = function (query) {
        if (query && Object.keys(query).length) {
            var qs = querystring_1.stringify(query);
            return this.endpoint + "?" + qs;
        }
        return this.endpoint;
    };
    /**
     * Get detail route path (eg. /users/123) to be used with HTTP requests
     * @param id
     * @param query Querystring
     */
    Resource.getDetailRoutePath = function (id, query) {
        var qs = querystring_1.stringify(query);
        return this.endpoint + "/" + id + (query && Object.keys(query).length ? '?' : '') + qs;
    };
    /**
     * HTTP Get of resource's list route--returns a promise
     * @param options Options object
     * @returns Promise
     */
    Resource.list = function (options) {
        if (options === void 0) { options = {}; }
        return this.client.list(this, options).then(function (result) {
            if (options.getRelated) {
                var promises_1 = [];
                result.resources.forEach(function (resource) {
                    promises_1.push(resource.getRelated({ deep: true }));
                });
                return Promise.all(promises_1).then(function () { return result; });
            }
            return result;
        });
    };
    Resource.detail = function (id, options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        // Check cache first
        var cached = this.getCached(String(id));
        return new Promise(function (resolve, reject) {
            // Do we want to use cache?
            if (!cached || options.useCache === false) {
                // Set a hash key for the queue (keeps it organized by type+id)
                var queueHashKey_1 = _this.getResourceHashKey(id);
                // If we want to use cache and cache wasn't found...
                if (!cached && !_this.queued[queueHashKey_1]) {
                    // We want to use cached and a resource with this ID hasn't been requested yet
                    _this.queued[queueHashKey_1] = [];
                    _this.client
                        .detail(_this, id, options)
                        .then(function (result) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                        var correctResource;
                        return tslib_1.__generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    correctResource = result.resources.pop();
                                    if (!options.getRelated) return [3 /*break*/, 2];
                                    return [4 /*yield*/, correctResource.getRelated({ deep: true })];
                                case 1:
                                    _a.sent();
                                    _a.label = 2;
                                case 2:
                                    // Resolve first-sent request
                                    setTimeout(function () { return resolve(correctResource); }, 0);
                                    // Then resolve any deferred requests if there are any
                                    this.queued[queueHashKey_1].forEach(function (deferred) {
                                        deferred(correctResource);
                                    });
                                    return [2 /*return*/];
                            }
                        });
                    }); })
                        .catch(function (e) {
                        reject(e);
                    })
                        .finally(function () {
                        // Finally, remove the fact that we've queued any requests with this ID
                        delete _this.queued[queueHashKey_1];
                    });
                }
                else {
                    // We want to use cache, but a resource with this ID has already been queued--defer promise and resolve when queued resource actually completes
                    var deferredPromise = new Promise(function (resolveDeferred) {
                        _this.queued[queueHashKey_1].push(resolveDeferred);
                    });
                    // Resolve related call to detail() but deferredPromise doesn't run until the first queued resource is completed
                    resolve(deferredPromise);
                }
            }
            else {
                // We want to use cache, and we found it!
                var cachedResource_1 = cached.resource;
                // Get related resources?
                if (options.getRelated) {
                    cached.resource.getRelated({ deep: true }).then(function () { return resolve(cachedResource_1); });
                }
                else {
                    resolve(cachedResource_1);
                }
            }
        });
    };
    Resource.toResourceName = function () {
        return this.name;
    };
    Resource.makeDefaultsObject = function () {
        var defaults = {};
        for (var key in this.defaults) {
            var thisDefault = this.defaults[key];
            if ('function' === typeof thisDefault) {
                defaults[key] = thisDefault.call(null);
            }
            else {
                defaults[key] = thisDefault;
            }
        }
        return defaults;
    };
    /**
     * Unique resource hash key used for caching and organizing requests
     * @param resourceId
     */
    Resource.getResourceHashKey = function (resourceId) {
        assert(Boolean(resourceId), "Can't generate resource hash key with an empty Resource ID. Please ensure Resource is saved first.");
        return Buffer.from(this.uuid + ":" + resourceId).toString('base64');
    };
    Resource.extend = function (classProps) {
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
    /**
     * Set an attribute of Resource instance and apply getters/setters
     * Do not use Dot Notation here
     * @param key
     * @param value
     */
    Resource.prototype.set = function (key, value) {
        this.attributes[key] = value;
        return this;
    };
    /**
     * Get an attribute of Resource instance
     * You can use dot notation here -- eg. `resource.get('user.username')`
     * You can also get all properties by not providing any arguments
     * @param? key
     */
    Resource.prototype.get = function (key) {
        if (typeof key !== 'undefined') {
            // Get a value
            var pieces_1 = key.split('.');
            var thisKey = String(pieces_1.shift());
            var thisValue = this.attributes[thisKey];
            var relatedManager = this.managers[thisKey];
            if (pieces_1.length > 0) {
                // We need to go deeper...
                if (!relatedManager) {
                    throw new exceptions.ImproperlyConfiguredError("No relation found on " + this.toResourceName() + "[" + thisKey + "]. Did you define it on " + this.toResourceName() + ".related?");
                }
                if (relatedManager.many) {
                    return relatedManager.objects.map(function (thisResource) {
                        return thisResource.get(pieces_1.join('.'));
                    });
                }
                return relatedManager.objects[0].get(pieces_1.join('.'));
            }
            else if (Boolean(thisValue) && relatedManager) {
                // If the related manager is a single object and is inflated, auto resolve the resource.get(key) to that object
                // @todo Maybe we should always return the manager? Or maybe we should always return the resolved object(s)? I am skeptical about this part
                return !relatedManager.many && relatedManager.resolved ? relatedManager.objects[0] : relatedManager;
            }
            else {
                return thisValue;
            }
        }
        else {
            // We're getting all attributes -- any related resources also get converted to an object
            var managers = Object.keys(this.managers);
            var obj = Object.assign({}, this.attributes);
            while (managers.length) {
                var key_1 = String(managers.shift());
                var manager = this.managers[key_1];
                if (manager.many) {
                    obj[key_1] = manager.objects.map(function (subResource) { return subResource.get(); });
                }
                else if (!manager.many && manager.objects[0]) {
                    obj[key_1] = manager.objects[0].get();
                }
            }
            return obj;
        }
    };
    /**
     * Persist getting an attribute and get related keys until a key can be found (or not found)
     * TypeError in get() will be thrown, we're just doing the getRelated() work for you...
     * @param key
     */
    Resource.prototype.getAsync = function (key) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                resolve(_this.get(key));
            }
            catch (e) {
                if (exceptions.AttributeError.isInstance(e)) {
                    var pieces_2 = key.split('.');
                    var thisKey = String(pieces_2.shift());
                    var manager_1 = _this.managers[thisKey];
                    manager_1.resolve().then(function () {
                        var relatedKey = pieces_2.join('.');
                        var promises = manager_1.objects.map(function (resource) {
                            return resource.getAsync(relatedKey);
                        });
                        Promise.all(promises).then(function (values) {
                            if (manager_1.many) {
                                resolve(values);
                            }
                            else if (values.length === 1) {
                                resolve(values[0]);
                            }
                            else {
                                resolve(values);
                            }
                        });
                    });
                }
                else {
                    reject(e);
                }
            }
        });
    };
    /**
     * Setter -- Translate new value into an internal value onto this._attributes[key]
     * Usually this is just setting a key/value but we want to be able to accept
     * anything -- another Resource instance for example. If a Resource instance is
     * provided, set the this.managers[key] as the new manager instance, then set the
     * this.attributes[key] field as just the primary key of the related Resource instance
     * @param key
     * @param value
     */
    Resource.prototype.toInternalValue = function (key, value) {
        var currentValue = this.attributes[key];
        var newValue = value;
        if (!isEqual(currentValue, newValue)) {
            // Also resolve any related Resources back into foreign keys
            if (newValue && newValue['getConstructor']) {
                // newValue is a Resource instance
                // Don't accept any resources that aren't saved
                if (!newValue.id) {
                    throw new exceptions.AttributeError("Can't append Related Resource on field \"" + key + "\": Related Resource " + newValue.getConstructor().name + " must be saved first");
                }
                // Create a RelatedManager
                var RelatedCtor = newValue.getConstructor();
                var RelatedManager_1 = this.getConstructor().relatedManager;
                var manager = new RelatedManager_1(RelatedCtor, newValue);
                newValue = manager.toJSON();
                this.managers[key] = manager;
            }
            else if (newValue && this.managers[key]) {
                // newValue has an old manager -- needs a new one
                // Create a RelatedManager
                var RelatedCtor = newValue.to;
                var RelatedManager_2 = this.getConstructor().relatedManager;
                var manager = new RelatedManager_2(RelatedCtor, newValue);
                newValue = manager.toJSON();
                this.managers[key] = manager;
            }
            this.changes[key] = newValue;
        }
        return newValue;
    };
    /**
     * Like calling instance.constructor but safer:
     * changing objects down the line won't creep up the prototype chain and end up on native global objects like Function or Object
     */
    Resource.prototype.getConstructor = function () {
        if (this.constructor === Function) {
            // Safe guard in case something goes wrong in subclasses, we don't want to change native Function
            return Resource;
        }
        return this.constructor;
    };
    /**
     * Match all related values in `attributes[key]` where key is primary key of related instance defined in `Resource.related[key]`
     * @param options GetRelatedDict
     */
    Resource.prototype.getRelated = function (_a) {
        var _b = _a === void 0 ? {} : _a, _c = _b.deep, deep = _c === void 0 ? false : _c, _d = _b.managers, managers = _d === void 0 ? [] : _d;
        var promises = [];
        for (var resourceKey in this.managers) {
            if (Array.isArray(managers) && managers.length > 0 && !~managers.indexOf(resourceKey)) {
                continue;
            }
            var manager = this.managers[resourceKey];
            var promise = manager.resolve().then(function (objects) {
                if (deep) {
                    var otherPromises = objects.map(function (resource) { return resource.getRelated({ deep: deep, managers: managers }); });
                    return Promise.all(otherPromises).then(function () {
                        return void {};
                    });
                }
                else {
                    return void {};
                }
            });
            promises.push(promise);
        }
        return Promise.all(promises).then(function () { return void {}; });
    };
    /**
     * Same as `Resource.prototype.getRelated` except `options.deep` defaults to `true`
     * @param options
     */
    Resource.prototype.getRelatedDeep = function (options) {
        var opts = Object.assign({ deep: true }, options || {});
        return this.getRelated(opts);
    };
    /**
     * Get related class by key
     * @param key
     */
    Resource.prototype.rel = function (key) {
        return this.managers[key];
    };
    /**
     * Saves the instance -- sends changes as a PATCH or sends whole object as a POST if it's new
     */
    Resource.prototype.save = function (options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        var promise;
        var Ctor = this.getConstructor();
        var errors = this.validate();
        if (errors.length > 0 && !options.force) {
            throw new exceptions.ValidationError(errors);
        }
        if (this.isNew()) {
            promise = Ctor.client.post(Ctor.getListRoutePath(), this.attributes);
        }
        else if (options.partial === false) {
            promise = Ctor.client.put(Ctor.getDetailRoutePath(this.id), this.attributes);
        }
        else {
            promise = Ctor.client.patch(Ctor.getDetailRoutePath(this.id), this.changes);
        }
        return promise.then(function (response) {
            _this.changes = {};
            for (var resKey in response.data) {
                _this.set(resKey, response.data[resKey]);
            }
            // Replace cache
            _this.cache(options.replaceCache === false ? false : true);
            return {
                response: response,
                resources: [_this],
            };
        });
    };
    /**
     * Validate attributes -- returns empty if no errors exist -- you should throw new errors here
     * @returns `Error[]` Array of Exceptions
     */
    Resource.prototype.validate = function () {
        var errs = [];
        var validators = this.getConstructor().validators;
        for (var key in validators) {
            try {
                if ('function' === typeof validators[key]) {
                    validators[key].call(null, this.attributes[key], this);
                }
            }
            catch (e) {
                // One of the downsides of using Webpack is that you can't strict compare from
                //  another module because the exported member will be transpiled and therefore will not
                //  be the same address in memory. So we have a handy function to detect ValidationError
                if (exceptions.ValidationError.isInstance(e)) {
                    errs.push(e);
                }
                else {
                    throw e;
                }
            }
        }
        return errs;
    };
    Resource.prototype.update = function () {
        return this.getConstructor().detail(this.id);
    };
    Resource.prototype.delete = function (options) {
        return this.getConstructor().client.delete(this.getConstructor().getDetailRoutePath(this.id), options);
    };
    Resource.prototype.cache = function (replace) {
        if (replace === void 0) { replace = false; }
        this.getConstructor().cacheResource(this, !!replace);
        return this;
    };
    Resource.prototype.getCached = function () {
        return this.getConstructor().getCached(this.id);
    };
    Resource.prototype.isNew = function () {
        return !this.id;
    };
    Object.defineProperty(Resource.prototype, "id", {
        get: function () {
            var uniqueKey = this.getConstructor().uniqueKey;
            return this.attributes[uniqueKey];
        },
        set: function (value) {
            throw new exceptions.AttributeError('Cannot set ID manually. Set ID by using attributes[id] = value');
        },
        enumerable: true,
        configurable: true
    });
    Resource.prototype.toString = function () {
        return this.toResourceName() + " " + (this.id || '(New)');
    };
    Resource.prototype.toResourceName = function () {
        return this.getConstructor().toResourceName();
    };
    Resource.prototype.toJSON = function () {
        return this.get();
    };
    Resource.endpoint = '';
    Resource.cacheMaxAge = 60;
    Resource._cache = {};
    Resource._client = new client_1.DefaultClient('/');
    Resource.queued = {};
    Resource.uniqueKey = 'id';
    Resource.perPage = null;
    Resource.defaults = {};
    Resource.relatedManager = related_1.default;
    Resource.validators = {};
    Resource.related = {};
    return Resource;
}());
exports.default = Resource;
//# sourceMappingURL=index.js.map