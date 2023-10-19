"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var client_1 = require("./client");
var util_1 = require("./util");
var related_1 = tslib_1.__importDefault(require("./related"));
var buffer_1 = require("buffer");
var exceptions = tslib_1.__importStar(require("./exceptions"));
var assert_1 = tslib_1.__importDefault(require("assert"));
var _ = require('lodash');
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
        if (typeof Ctor.client !== 'object') {
            throw new exceptions.ImproperlyConfiguredError("Resource can't be used without Client class instance");
        }
        this._attributes = {};
        var _attrKeys = Object.keys(attributes);
        var _defaults = Ctor.makeDefaultsObject();
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
        // Default attributes, ignore any that will be overridden
        for (var defaultsKey in _defaults) {
            if (_attrKeys.includes(defaultsKey)) {
                continue;
            }
            this.attributes[defaultsKey] = _defaults[defaultsKey];
        }
        // Attributes parameters, will fire setter
        for (var attrKey in attributes) {
            this.attributes[attrKey] = attributes[attrKey];
        }
        // Set/Reset changes
        this.changes = {};
        // Create related managers
        for (var relAttrKey in Ctor.getRelatedClasses()) {
            this.managers[relAttrKey] = this.createManagerFor(relAttrKey);
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
            var ParentClass = Object.getPrototypeOf(this);
            // FooResource.cache === BarResource.cache should always return false where BarResource extends FooResource
            if (!this._cache || this._cache === ParentClass._cache) {
                this._cache = {};
            }
            return new Proxy(this._cache, {
                set: function (receiver, key, value) {
                    receiver[key] = value;
                    return true;
                },
                get: function (receiver, key) {
                    return receiver[key];
                },
                defineProperty: function (target, prop, descriptor) {
                    return Reflect.defineProperty(target, prop, descriptor);
                },
            });
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
        var cached = this.cache[String(id)];
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
    Object.defineProperty(Resource, "validators", {
        /**
         * Backwards compatibility
         * Remove in next major release @todo
         */
        get: function () {
            return this.validation;
        },
        /**
         * Backwards compatibility
         * Remove in next major release @todo
         */
        set: function (value) {
            this.validation = value;
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
            var qs = util_1.urlStringify(query);
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
        var qs = util_1.urlStringify(query);
        return this.endpoint + "/" + String(id) + (query && Object.keys(query).length ? '?' : '') + qs;
    };
    /**
     * HTTP Get of resource's list route--returns a promise
     * @param options Options object
     * @returns Promise
     */
    Resource.list = function (options) {
        if (options === void 0) { options = {}; }
        return this.client.list(this, options).then(function (result) {
            if (options.resolveRelated || options.resolveRelatedDeep) {
                var deep_1 = !!options.resolveRelatedDeep;
                var promises_1 = [];
                result.resources.forEach(function (resource) {
                    promises_1.push(resource.resolveRelated({ deep: deep_1 }));
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
                var queueHashKey_1 = _this.getResourceHashKey(String(id));
                // If we want to use cache and cache wasn't found...
                if (!_this.queued[queueHashKey_1]) {
                    // We want to use cached and a resource with this ID hasn't been requested yet
                    _this.queued[queueHashKey_1] = [];
                    _this.client
                        .detail(_this, String(id), options)
                        .then(function (result) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                        var correctResource, deep;
                        return tslib_1.__generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    correctResource = result.resources.pop();
                                    if (!(options.resolveRelated || options.resolveRelatedDeep)) return [3 /*break*/, 2];
                                    deep = !!options.resolveRelatedDeep;
                                    return [4 /*yield*/, correctResource.resolveRelated({ deep: deep })];
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
                if (options.resolveRelated || options.resolveRelatedDeep) {
                    var deep = !!options.resolveRelatedDeep;
                    cached.resource.resolveRelated({ deep: deep }).then(function () { return resolve(cachedResource_1); });
                }
                else {
                    resolve(cachedResource_1);
                }
            }
        });
    };
    Resource.wrap = function (relativePath, query) {
        assert_1.default(relativePath && relativePath[0] === '/', "Relative path \"" + relativePath + "\" must start with a \"/\"");
        var relEndpoint = this.endpoint + relativePath;
        if (query && Object.keys(query).length) {
            var qs = util_1.urlStringify(query);
            relEndpoint = relEndpoint + "?" + qs;
        }
        return this.client.bindMethodsToPath(relEndpoint);
    };
    Resource.toResourceName = function () {
        // In an ES5 config, Webpack will reassign class name as a function like
        // function class_1() { } when transpiling, so to help out with this in
        // debugging, replace the class_1 function name with something more descriptive
        if (this.name.match(/^class_/)) {
            return "ResourceClass(" + this.endpoint + ")";
        }
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
        assert_1.default(Boolean(resourceId), "Can't generate resource hash key with an empty Resource ID. Please ensure Resource is saved first.");
        return buffer_1.Buffer.from(this.uuid + ":" + String(resourceId)).toString('base64');
    };
    Resource.getRelatedClasses = function () {
        if ('function' === typeof this.related) {
            return this.related();
        }
        return this.related;
    };
    Resource.getValidatorObject = function () {
        if ('function' === typeof this.validation) {
            return this.validation();
        }
        return this.validation;
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
            var manager = this.rel(thisKey);
            if (pieces_1.length > 0) {
                // We need to go deeper...
                if (!manager) {
                    throw new exceptions.ImproperlyConfiguredError("No relation found on " + this.toResourceName() + "[" + thisKey + "]. Did you define it on " + this.toResourceName() + ".related?");
                }
                if (!manager.hasValues()) {
                    return undefined;
                }
                if (manager.many) {
                    return manager.resources.map(function (thisResource) {
                        return thisResource.get(pieces_1.join('.'));
                    });
                }
                return manager.resource.get(pieces_1.join('.'));
            }
            else if (Boolean(thisValue) && manager) {
                // If the related manager is a single object and is inflated, auto resolve the resource.get(key) to that object
                // @todo Maybe we should always return the manager? Or maybe we should always return the resolved object(s)? I am skeptical about this part
                return (!manager.many && manager.resolved ? manager.resource : manager);
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
                var manager = this.rel(key_1);
                if (manager.many) {
                    obj[key_1] = manager.resources.map(function (subResource) { return subResource.get(); });
                }
                else if (!manager.many && manager.resource) {
                    obj[key_1] = manager.resource.get();
                }
            }
            return obj;
        }
    };
    /**
     * Persist getting an attribute and get related keys until a key can be found (or not found)
     * TypeError in get() will be thrown, we're just doing the resolveRelated() work for you...
     * @param key
     */
    Resource.prototype.resolveAttribute = function (key) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                resolve(_this.get(key));
            }
            catch (e) {
                // This is an annoying issue and why I hate using transpilers -- for some reason, we cannot 
                // use e instanceof AttributeError here, because the transpiled AttributeError !== AttributeError
                // at runtime! (faceOfDisapproval.jpg)
                // @ts-ignore 
                if (e.name === 'AttributeError') {
                    var pieces_2 = key.split('.');
                    var thisKey = String(pieces_2.shift());
                    var manager_1 = _this.rel(thisKey);
                    manager_1.resolve().then(function () {
                        var relatedKey = pieces_2.join('.');
                        var promises = manager_1.resources.map(function (resource) {
                            return resource.resolveAttribute(relatedKey);
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
     * Alias of resource.resolveAttribute(key)
     * @param key
     */
    Resource.prototype.getAsync = function (key) {
        return this.resolveAttribute(key);
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
        var Ctor = this.getConstructor();
        if (!_.isEqual(currentValue, newValue)) {
            // Also resolve any related Resources back into foreign keys
            if (newValue && this.rel(key) instanceof related_1.default) {
                // newValue has an old manager -- needs a new one
                // Create a new RelatedManager
                var manager = this.rel(key).fromValue(newValue);
                newValue = manager.toJSON();
                this.managers[key] = manager;
            }
            this.changes[key] = newValue;
        }
        if ('undefined' !== typeof Ctor.normalization[key]) {
            var normalizer = Ctor.normalization[key];
            if ('function' === typeof normalizer.normalize) {
                newValue = normalizer.normalize(newValue);
            }
            else if ('function' === typeof normalizer) {
                newValue = normalizer(newValue);
            }
            if (this.changes[key]) {
                this.changes[key] = newValue;
            }
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
     * @param options resolveRelatedDict
     */
    Resource.prototype.resolveRelated = function (_a) {
        var _b = _a === void 0 ? {} : _a, _c = _b.deep, deep = _c === void 0 ? false : _c, _d = _b.managers, managers = _d === void 0 ? [] : _d;
        var promises = [];
        for (var resourceKey in this.managers) {
            if (Array.isArray(managers) && managers.length > 0 && !~managers.indexOf(resourceKey)) {
                continue;
            }
            var manager = this.rel(resourceKey);
            var promise = manager.resolve().then(function (objects) {
                if (deep) {
                    var otherPromises = objects.map(function (resource) { return resource.resolveRelated({ deep: deep, managers: managers }); });
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
     * Same as `Resource.prototype.resolveRelated` except `options.deep` defaults to `true`
     * @param options
     */
    Resource.prototype.resolveRelatedDeep = function (options) {
        var opts = Object.assign({ deep: true }, options || {});
        return this.resolveRelated(opts);
    };
    /**
     * Get related manager class by key
     * @param key
     */
    Resource.prototype.rel = function (key) {
        return this.managers[key];
    };
    /**
     * Create a manager instance on based on current attributes
     * @param relatedKey
     */
    Resource.prototype.createManagerFor = function (relatedKey) {
        var Ctor = this.getConstructor();
        var related = Ctor.getRelatedClasses();
        var to = related[relatedKey];
        var nested = false;
        try {
            if ('object' === typeof to) {
                var relatedLiteral = to;
                to = relatedLiteral.to;
                nested = !!relatedLiteral.nested;
            }
            assert_1.default('function' === typeof to, "Couldn't find RelatedResource class with key \"" + relatedKey + "\". Does it exist?");
            var RelatedManagerCtor = to.RelatedManagerClass;
            var relatedManager = new RelatedManagerCtor(to, this._attributes[relatedKey]);
            if (nested && relatedManager.canAutoResolve()) {
                relatedManager.resolveFromObjectValue();
            }
            return relatedManager;
        }
        catch (e) {
            if (e instanceof assert_1.default.AssertionError) {
                e.message = e.message + " -- Relation: " + this.toResourceName() + ".related[" + relatedKey + "]";
            }
            throw e;
        }
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
        var fields = options.fields || Ctor.fields;
        if (errors.length > 0 && !options.force) {
            throw new exceptions.ValidationError(errors);
        }
        if (this.isNew()) {
            var attrs = fields.length ? _.pick(this.attributes, fields) : this.attributes;
            promise = Ctor.client.post(Ctor.getListRoutePath(), attrs);
        }
        else if (options.partial === false) {
            var attrs = fields.length ? _.pick(this.attributes, fields) : this.attributes;
            promise = Ctor.client.put(Ctor.getDetailRoutePath(this.id), attrs);
        }
        else {
            var attrs = fields.length ? _.pick(this.changes, fields) : this.changes;
            promise = Ctor.client.patch(Ctor.getDetailRoutePath(this.id), attrs);
        }
        return promise.then(function (response) {
            _this.changes = {};
            for (var resKey in response.data) {
                _this.set(resKey, response.data[resKey]);
            }
            if (_this.id) {
                // Replace cache
                _this.cache(options.replaceCache === false ? false : true);
            }
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
        var _this = this;
        var errs = [];
        var validators = this.getConstructor().getValidatorObject();
        var tryFn = function (func, key) {
            try {
                // Declare call of validator with params:
                //    attribute, resource, ValidationError class
                func.call(null, _this.attributes[key], _this, exceptions.ValidationError);
            }
            catch (e) {
                errs.push(e);
            }
        };
        for (var key in validators) {
            if ('function' === typeof validators[key]) {
                tryFn(validators[key], key);
            }
            else if (Array.isArray(validators[key])) {
                var validatorArray = validators[key];
                for (var vKey in validatorArray) {
                    tryFn(validatorArray[vKey], key);
                }
            }
        }
        return errs;
    };
    Resource.prototype.update = function () {
        var _this = this;
        return this.getConstructor()
            .detail(this.id, { useCache: false })
            .then(function (resource) {
            for (var key in resource.attributes) {
                _this.attributes[key] = resource.attributes[key];
            }
        });
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
    Resource.prototype.wrap = function (relativePath, query) {
        assert_1.default(relativePath && relativePath[0] === '/', "Relative path \"" + relativePath + "\" must start with a \"/\"");
        assert_1.default(this.id, "Can't look up a relative route on a resource that has not been created yet.");
        var Ctor = this.getConstructor();
        var thisPath = '/' + this.id + relativePath;
        return Ctor.wrap(thisPath, query);
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
    Resource.cacheMaxAge = 10;
    Resource.client = new client_1.DefaultClient('/');
    Resource.queued = {};
    Resource.uniqueKey = 'id';
    Resource.defaults = {};
    Resource.RelatedManagerClass = related_1.default;
    Resource.validation = {};
    Resource.normalization = {};
    Resource.fields = [];
    Resource.related = {};
    Resource._cache = {};
    return Resource;
}());
exports.default = Resource;
//# sourceMappingURL=index.js.map