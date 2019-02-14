"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var exceptions = tslib_1.__importStar(require("./exceptions"));
var querystring_1 = require("querystring");
var assert = require('assert');
var isEqual = require('lodash').isEqual;
var Resource = /** @class */ (function () {
    function Resource(attributes, options) {
        this._attributes = {};
        this.attributes = {};
        this.related = {};
        this.changes = {};
        var Ctor = this.getConstructor();
        if (typeof Ctor.getClient() !== 'object') {
            throw new exceptions.ImproperlyConfiguredError("Resource can't be used without Client class instance");
        }
        // Set up attributes and defaults
        this._attributes = Object.assign({}, Ctor.defaults || {}, attributes || {});
        // Add getters/setters for attributes
        for (var _i = 0, _a = Object.keys(this._attributes); _i < _a.length; _i++) {
            var attrKey = _a[_i];
            this.set(attrKey, this._attributes[attrKey]);
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
    /**
     * Get HTTP client for a resource Class
     * This is meant to be overridden if we want to define a client at any time
     */
    Resource.getClient = function () {
        if (!this._client) {
            throw new exceptions.ImproperlyConfiguredError('Resource client class not defined. Did you try Resource.setClient or overriding Resource.getClient?');
        }
        return this._client;
    };
    /**
     * Set HTTP client
     * @param client instanceof Client
     */
    Resource.setClient = function (client) {
        this._client = client;
    };
    /**
     * Get list route path (eg. /users) to be used with HTTP requests and allow a querystring object
     * @param query Querystring
     */
    Resource.getListRoutePath = function (query) {
        if (query) {
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
        return this.endpoint + "/" + id + (query ? '?' : '') + qs;
    };
    /**
     * HTTP Get of resource's list route--returns a promise
     * @param options HTTP Request Options
     * @returns Promise
     */
    Resource.list = function (options) {
        if (options === void 0) { options = {}; }
        return this.getListRoute(options).then(function (results) { return results.objects; });
    };
    Resource.detail = function (id, options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        // Check cache first
        var cached = this.getCached(String(id));
        return new Promise(function (resolve) {
            // Do we want to use cache?
            if (!cached || options.useCache === false) {
                // Set a hash key for the queue (keeps it organized by type+id)
                var queueHashKey_1 = (new Buffer(_this.name + ":" + id)).toString('base64');
                // If we want to use cache and cache wasn't found...
                if (!cached && !_this.queued[queueHashKey_1]) {
                    // We want to use cached and a resource with this ID hasn't been requested yet
                    _this.queued[queueHashKey_1] = [];
                    _this.getDetailRoute(id).then(function (response) {
                        // Get detail route and get resource from response
                        var correctResource = response.objects.pop();
                        // Resolve first-sent request
                        resolve(correctResource);
                        // Then resolve any deferred requests if there are any
                        _this.queued[queueHashKey_1].forEach(function (deferred) {
                            deferred(correctResource);
                        });
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
    Resource.getDetailRoute = function (id, options) {
        if (options === void 0) { options = {}; }
        return this.getClient()
            .get(this.getDetailRoutePath(id), options)
            .then(this.extractObjectsFromResponse.bind(this));
    };
    Resource.getListRoute = function (options) {
        if (options === void 0) { options = {}; }
        return this.getClient()
            .get(this.getListRoutePath(options.query), options)
            .then(this.extractObjectsFromResponse.bind(this));
    };
    Resource.extractObjectsFromResponse = function (result) {
        var objects = [];
        var body = result.data;
        var Cls = this;
        if (body && body.results) {
            body.results.forEach(function (obj) {
                objects.push(new Cls(obj));
            });
        }
        else {
            objects = [new Cls(body)];
        }
        return {
            response: result,
            objects: objects,
        };
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
                        assert(instance instanceof RelatedCls_1, "Related class detail() returned invalid instance on key " + _this.name + ".related." + resourceKey + ": " + instance.getConstructor().name + " (returned) !== " + RelatedCls_1.name + " (related)");
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
    /**
     * Set an attribute of Resource instance
     * @param key
     * @param value
     */
    Resource.prototype.set = function (key, value) {
        var _this = this;
        // We're setting a value -- setters in ctor takes care of changes
        var pieces = key.split('.');
        if (pieces.length > 1) {
            throw new exceptions.AttributeError("Can't use dot notation when setting value of nested resource");
        }
        Object.defineProperty(this.attributes, key, {
            configurable: true,
            enumerable: true,
            get: function () { return _this.fromInternalValue(key); },
            set: function (newVal) {
                _this._attributes[key] = _this.toInternalValue(key, newVal);
            }
        });
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
        return new Promise(function (resolve) {
            try {
                resolve(_this.get(key));
            }
            catch (e) {
                if (e instanceof exceptions.AttributeError) {
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
            }
        });
    };
    /**
     * Mutate key/value on this.attributes[key] into an internal value
     * Usually this is just setting a key/value but we want to be able to accept
     * anything -- another Resource instance for example. If a Resource instance is
     * provided, set the this.related[key] as the new instance, then set the
     * this.attributes[key] field as just the primary key of the related Resource instance
     * @param key
     * @param value
     */
    Resource.prototype.toInternalValue = function (key, value) {
        if (!isEqual(this.attributes[key], value)) {
            // New value has changed -- set it in this.changed and this._attributes
            var validRelatedKey = value instanceof Resource && value.getConstructor() === this.rel(key);
            // Also resolve any related Resources back into foreign keys -- @todo What if it's a list of related Resources?
            if (value && validRelatedKey) {
                // Newly set value is an actual Resource instance
                // this.related is a related resource or a list of related resources
                var newRelatedResource = value;
                this.related[key] = newRelatedResource;
                // this._attributes is a list of IDs
                value = newRelatedResource.id;
            }
            this.changes[key] = value;
        }
        return value;
    };
    /**
     * Like toInternalValue except the other way around
     * @param key
     */
    Resource.prototype.fromInternalValue = function (key) {
        return this._attributes[key];
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
    Resource.prototype.save = function () {
        var _this = this;
        var promise;
        var Ctor = this.getConstructor();
        if (!this.id) {
            promise = Ctor.getClient().post(Ctor.getListRoutePath(), this.attributes);
        }
        else {
            promise = Ctor.getClient().patch(Ctor.getDetailRoutePath(this.id), this.changes);
        }
        return promise.then(function (response) {
            _this.changes = {};
            for (var resKey in response.data) {
                _this.set(resKey, response.data[resKey]);
            }
            return _this.cache(true);
        });
    };
    Resource.prototype.update = function () {
        return this.getConstructor().detail(this.id);
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
    Resource.data = {};
    Resource._cache = {};
    Resource.queued = {};
    Resource.uniqueKey = 'id';
    Resource.defaults = {};
    Resource.related = {};
    return Resource;
}());
exports.default = Resource;
//# sourceMappingURL=index.js.map