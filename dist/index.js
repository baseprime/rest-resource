"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var querystring_1 = require("querystring");
var client_1 = require("./client");
var util_1 = require("./util");
var exceptions = require('./exceptions');
var assert = require('assert');
var isEqual = require('lodash').isEqual;
var Resource = /** @class */ (function () {
    function Resource(attributes, options) {
        if (attributes === void 0) { attributes = {}; }
        if (options === void 0) { options = {}; }
        var _this = this;
        this._attributes = {};
        this.attributes = {};
        this.related = {};
        this.changes = {};
        var Ctor = this.getConstructor();
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
            }
        });
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
        return this.endpoint + "/" + id + ((query && Object.keys(query).length) ? '?' : '') + qs;
    };
    /**
     * HTTP Get of resource's list route--returns a promise
     * @param options HTTP Request Options
     * @returns Promise
     */
    Resource.list = function (options) {
        if (options === void 0) { options = {}; }
        return this.client.list(this, options);
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
                var queueHashKey_1 = Buffer.from(_this.uuid + ":" + id).toString('base64');
                // If we want to use cache and cache wasn't found...
                if (!cached && !_this.queued[queueHashKey_1]) {
                    // We want to use cached and a resource with this ID hasn't been requested yet
                    _this.queued[queueHashKey_1] = [];
                    _this.client.detail(_this, id).then(function (result) {
                        // Get detail route and get resource from response
                        var correctResource = result.resources.pop();
                        // Resolve first-sent request
                        resolve(correctResource);
                        // Then resolve any deferred requests if there are any
                        _this.queued[queueHashKey_1].forEach(function (deferred) {
                            deferred(correctResource);
                        });
                    }).catch(function (e) {
                        reject(e);
                    }).finally(function () {
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
                resolve(cached.resource);
            }
        });
    };
    Resource.getRelated = function (resource, _a) {
        var _this = this;
        var _b = _a === void 0 ? {} : _a, _c = _b.deep, deep = _c === void 0 ? false : _c, _d = _b.relatedKeys, relatedKeys = _d === void 0 ? undefined : _d, _e = _b.relatedSubKeys, relatedSubKeys = _e === void 0 ? undefined : _e;
        var promises = [];
        var _loop_1 = function (resourceKey) {
            // Allow specification of keys to related resources they want to get
            if (typeof relatedKeys !== 'undefined' && Array.isArray(relatedKeys) && !~relatedKeys.indexOf(resourceKey)) {
                return "continue";
            }
            // If this resource key exists on the resource's attributes, and it's not null
            if (resource.attributes[resourceKey] !== 'undefined' && resource.attributes[resourceKey] !== null) {
                // Get related Resource class
                var RelatedCls_1 = this_1.related[resourceKey];
                // If the property of the attributes is a list of IDs, we need to return a collection of Resources
                var isMany_1 = Array.isArray(resource.attributes[resourceKey]);
                // Get resource ids -- coerce to list (even if it's 1 ID to get, it'll be [id])
                var rids = [].concat(resource.attributes[resourceKey]);
                if (isMany_1 && !Array.isArray(resource.related[resourceKey])) {
                    resource.related[resourceKey] = [];
                }
                // Now for all IDs...
                rids.forEach(function (rid, idx) {
                    // Create a promise getting the details
                    var promise = RelatedCls_1.detail(rid).then(function (instance) {
                        assert(instance.getConstructor().name == RelatedCls_1.name, "Related class detail() returned invalid instance on key " + _this.name + ".related." + resourceKey + ": " + instance.getConstructor().name + " (returned) !== " + RelatedCls_1.name + " (related)");
                        if (isMany_1) {
                            // If it's a list, make sure the array property exists before pushing it onto the list
                            if (!Array.isArray(resource.related[resourceKey])) {
                                resource.related[resourceKey] = [];
                            }
                            // Finally, put this resource into the collection of other instances
                            resource.related[resourceKey][idx] = instance;
                        }
                        else {
                            // The corresponding attribute is just a Primary Key, so no need to create a collection
                            resource.related[resourceKey] = instance;
                        }
                        if (deep) {
                            // If we want to go deeper, recursively call new instance's getRelated() -- note we're shifting over the relatedKeys
                            return instance
                                .getRelated({
                                deep: deep,
                                relatedKeys: relatedSubKeys,
                            })
                                .then(function () { return resource.related; });
                        }
                        // We're done!
                        return resource.related;
                    });
                    // Add this promise to the list of other related models to get
                    promises.push(promise);
                });
            }
            else {
                // Probably a null value, just leave it null
            }
        };
        var this_1 = this;
        for (var resourceKey in this.related) {
            _loop_1(resourceKey);
        }
        // Run all promises then return related resources
        return Promise.all(promises).then(function () { return resource; });
    };
    Resource.getRelatedDeep = function (resource, options) {
        var opts = Object.assign({ deep: true }, options);
        return this.getRelated(resource, opts);
    };
    /**
     * Get related class by key
     * @param key
     */
    Resource.rel = function (key) {
        return this.related[key];
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
     * You can use dot notation here -- eg. resource.get('user.username')
     * @param key
     */
    Resource.prototype.get = function (key) {
        if (typeof key !== 'undefined') {
            // We're simply getting a value
            var pieces_1 = key.split('.');
            var thisKey = String(pieces_1.shift());
            var thisValue = this.attributes[thisKey];
            var relatedResource = this.related[thisKey];
            if (pieces_1.length > 0 && typeof relatedResource !== 'undefined') {
                // We're not done getting attributes (it contains a ".") send it to related resource
                if (Array.isArray(relatedResource)) {
                    return relatedResource.map(function (thisResource) {
                        return thisResource.get(pieces_1.join('.'));
                    });
                }
                return relatedResource.get(pieces_1.join('.'));
            }
            if (pieces_1.length > 0 && thisValue && typeof relatedResource === 'undefined' && this.hasRelatedDefined(thisKey)) {
                throw new exceptions.AttributeError("Can't read related property " + thisKey + " before getRelated() is called");
            }
            else if (!pieces_1.length && typeof relatedResource !== 'undefined') {
                return relatedResource;
            }
            else if (!pieces_1.length && typeof thisValue !== 'undefined') {
                return thisValue;
            }
            else {
                return undefined;
            }
        }
        else {
            // We're getting all attributes -- any related resources also get converted to an object
            var related = Object.keys(this.related);
            var obj = Object.assign({}, this.attributes);
            while (related.length) {
                var key_1 = String(related.shift());
                var relatedResource = this.related[key_1];
                if (Array.isArray(relatedResource)) {
                    obj[key_1] = relatedResource.map(function (subResource) { return subResource.get(); });
                }
                else {
                    obj[key_1] = relatedResource.get();
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
                    var thisKey_1 = String(pieces_2.shift());
                    _this.getRelated({ relatedKeys: [thisKey_1] }).then(function () {
                        var attrValue = _this.get(thisKey_1);
                        var isMany = Array.isArray(attrValue);
                        var relatedResources = [].concat(attrValue);
                        var relatedKey = pieces_2.join('.');
                        var promises = relatedResources.map(function (resource) {
                            return resource.getAsync(relatedKey);
                        });
                        Promise.all(promises).then(function (values) {
                            if (isMany) {
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
     * Translate this.attributes[key] into an internal value
     * Usually this is just setting a key/value but we want to be able to accept
     * anything -- another Resource instance for example. If a Resource instance is
     * provided, set the this.related[key] as the new instance, then set the
     * this.attributes[key] field as just the primary key of the related Resource instance
     * @param key
     * @param value
     */
    Resource.prototype.toInternalValue = function (key, value) {
        var currentValue = this.attributes[key];
        if (!isEqual(currentValue, value)) {
            // New value has changed -- set it in this.changed and this._attributes
            var translateValueToPk = this.shouldTranslateValueToPrimaryKey(key, value);
            // Also resolve any related Resources back into foreign keys -- @todo What if it's a list of related Resources?
            if (value && translateValueToPk) {
                // Newly set value is an actual Resource instance
                var relatedResource = value;
                // Don't accept any resources that aren't saved
                if (!relatedResource.id) {
                    throw new exceptions.AttributeError("Can't append Related Resource on field \"" + key + "\": Related Resource " + relatedResource.getConstructor().name + " must be saved first");
                }
                // this.related is a related resource or a list of related resources
                this.related[key] = relatedResource;
                // this._attributes is a list of IDs
                value = relatedResource.id;
            }
            else if (value instanceof Resource && !translateValueToPk) {
                throw new exceptions.AttributeError("Can't accept a Related Resource on field \"" + key + "\": Value must be related Resource's primary key if there is an assigned value of \"" + key + "\" on " + this.getConstructor().name + ".related");
            }
            this.changes[key] = value;
        }
        return value;
    };
    /**
     * Used to check if an incoming attribute (key)'s value should be translated from
     * a Related Resource (defined in Resource.related) to a primary key (the ID)
     * @param key
     * @param value
     */
    Resource.prototype.shouldTranslateValueToPrimaryKey = function (key, value) {
        return !!(value instanceof Resource && value.getConstructor() === this.rel(key));
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
    Resource.prototype.getRelated = function (options) {
        return this.getConstructor().getRelated(this, options);
    };
    Resource.prototype.getRelatedDeep = function (options) {
        var opts = Object.assign({ deep: true }, options || {});
        return this.getRelated(opts);
    };
    /**
     * Get related class by key
     * @param key
     */
    Resource.prototype.rel = function (key) {
        return this.getConstructor().rel(key);
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
            _this.cache((options.replaceCache === false) ? false : true);
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
    Resource.prototype.hasRelatedDefined = function (relatedKey) {
        return this.getConstructor().related[relatedKey] && !this.related[relatedKey];
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
    Resource.validators = {};
    Resource.related = {};
    return Resource;
}());
exports.default = Resource;
//# sourceMappingURL=index.js.map