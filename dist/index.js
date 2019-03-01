import { stringify } from 'querystring';
import { DefaultClient } from './client';
import { AttributeError } from './exceptions';
const exceptions = require('./exceptions');
const assert = require('assert');
const isEqual = require('lodash').isEqual;
export default class Resource {
    constructor(attributes, options) {
        this._attributes = {};
        this.attributes = {};
        this.related = {};
        this.changes = {};
        const Ctor = this.getConstructor();
        if (typeof Ctor.client !== 'object') {
            throw new exceptions.ImproperlyConfiguredError("Resource can't be used without Client class instance");
        }
        // Set up attributes and defaults
        this._attributes = Object.assign({}, Ctor.makeDefaultsObject(), attributes || {});
        // Add getters/setters for attributes
        for (let attrKey in this._attributes) {
            this.set(attrKey, this._attributes[attrKey]);
        }
        if (this.id) {
            Ctor.cacheResource(this);
        }
    }
    /**
     * Cache getter
     */
    static get cache() {
        if (!this._cache || this._cache === Resource._cache) {
            this._cache = {};
            return this._cache;
        }
        return this._cache;
    }
    /**
     * Cache a resource onto this class' cache for cacheMaxAge seconds
     * @param resource
     * @param replace
     */
    static cacheResource(resource, replace = false) {
        if (!resource.id) {
            throw new exceptions.CacheError(`Can't cache ${resource.toResourceName()} resource without ${resource.getConstructor().uniqueKey} field`);
        }
        else if (replace) {
            try {
                return this.replaceCache(resource);
            }
            catch (e) { }
        }
        this.cache[resource.id] = {
            resource,
            expires: this.cacheDeltaSeconds(),
        };
    }
    /**
     * Replace attributes on a cached resource onto this class' cache for cacheMaxAge seconds (useful for bubbling up changes to states that may be already rendered)
     * @param resource
     */
    static replaceCache(resource) {
        if (!this.cache[resource.id]) {
            throw new exceptions.CacheError("Can't replace cache: resource doesn't exist");
        }
        Object.assign(this.cache[resource.id].resource.attributes, resource.attributes);
        this.cache[resource.id].expires = this.cacheDeltaSeconds();
    }
    /**
     * Get time delta in seconds of cache expiry
     */
    static cacheDeltaSeconds() {
        return Date.now() + this.cacheMaxAge * 1000;
    }
    /**
     * Get a cached resource by ID
     * @param id
     */
    static getCached(id) {
        const cached = this.cache[id];
        if (cached && cached.expires > Date.now()) {
            return cached;
        }
        return undefined;
    }
    static getCachedAll() {
        return Object.keys(this.cache)
            .map((cacheKey) => this.getCached(cacheKey))
            .filter((valid) => !!valid);
    }
    /**
     * Get HTTP client for a resource Class
     * This is meant to be overridden if we want to define a client at any time
     */
    static get client() {
        if (!this._client) {
            throw new exceptions.ImproperlyConfiguredError('Resource client class not defined. Did you try Resource.setClient or overriding Resource.getClient?');
        }
        return this._client;
    }
    /**
     * Set HTTP client
     * @param client instanceof Client
     */
    static set client(client) {
        this._client = client;
    }
    /**
     * Get list route path (eg. /users) to be used with HTTP requests and allow a querystring object
     * @param query Querystring
     */
    static getListRoutePath(query) {
        if (query && Object.keys(query).length) {
            let qs = stringify(query);
            return `${this.endpoint}?${qs}`;
        }
        return this.endpoint;
    }
    /**
     * Get detail route path (eg. /users/123) to be used with HTTP requests
     * @param id
     * @param query Querystring
     */
    static getDetailRoutePath(id, query) {
        let qs = stringify(query);
        return `${this.endpoint}/${id}${(query && Object.keys(query).length) ? '?' : ''}${qs}`;
    }
    /**
     * HTTP Get of resource's list route--returns a promise
     * @param options HTTP Request Options
     * @returns Promise
     */
    static list(options = {}) {
        return this.client.list(this, options);
    }
    static detail(id, options = {}) {
        // Check cache first
        const cached = this.getCached(String(id));
        return new Promise((resolve) => {
            // Do we want to use cache?
            if (!cached || options.useCache === false) {
                // Set a hash key for the queue (keeps it organized by type+id)
                const queueHashKey = (new Buffer(`${this.name}:${id}`)).toString('base64');
                // If we want to use cache and cache wasn't found...
                if (!cached && !this.queued[queueHashKey]) {
                    // We want to use cached and a resource with this ID hasn't been requested yet
                    this.queued[queueHashKey] = [];
                    this.client.detail(this, id).then((result) => {
                        // Get detail route and get resource from response
                        const correctResource = result.resources.pop();
                        // Resolve first-sent request
                        resolve(correctResource);
                        // Then resolve any deferred requests if there are any
                        this.queued[queueHashKey].forEach((deferred) => {
                            deferred(correctResource);
                        });
                        // Finally, remove the fact that we've queued any requests with this ID
                        delete this.queued[queueHashKey];
                    });
                }
                else {
                    // We want to use cache, but a resource with this ID has already been queued--defer promise and resolve when queued resource actually completes
                    const deferredPromise = new Promise((resolveDeferred) => {
                        this.queued[queueHashKey].push(resolveDeferred);
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
    }
    static getRelated(resource, { deep = false, relatedKeys = undefined, relatedSubKeys = undefined } = {}) {
        const promises = [];
        for (const resourceKey in this.related) {
            // Allow specification of keys to related resources they want to get
            if (typeof relatedKeys !== 'undefined' && Array.isArray(relatedKeys) && !~relatedKeys.indexOf(resourceKey)) {
                continue;
            }
            // If this resource key exists on the resource's attributes, and it's not null
            if (resource.attributes[resourceKey] !== 'undefined' && resource.attributes[resourceKey] !== null) {
                // Get related Resource class
                const RelatedCls = this.related[resourceKey];
                // If the property of the attributes is a list of IDs, we need to return a collection of Resources
                const isMany = Array.isArray(resource.attributes[resourceKey]);
                // Get resource ids -- coerce to list (even if it's 1 ID to get, it'll be [id])
                const rids = [].concat(resource.attributes[resourceKey]);
                if (isMany && !Array.isArray(resource.related[resourceKey])) {
                    resource.related[resourceKey] = [];
                }
                // Now for all IDs...
                rids.forEach((rid, idx) => {
                    // Create a promise getting the details
                    const promise = RelatedCls.detail(rid).then((instance) => {
                        assert(instance instanceof RelatedCls, `Related class detail() returned invalid instance on key ${this.name}.related.${resourceKey}: ${instance.getConstructor().name} (returned) !== ${RelatedCls.name} (related)`);
                        if (isMany) {
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
                                deep,
                                relatedKeys: relatedSubKeys,
                            })
                                .then(() => resource.related);
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
        }
        // Run all promises then return related resources
        return Promise.all(promises).then(() => resource);
    }
    static getRelatedDeep(resource, options) {
        const opts = Object.assign({ deep: true }, options);
        return this.getRelated(resource, opts);
    }
    /**
     * Get related class by key
     * @param key
     */
    static rel(key) {
        return this.related[key];
    }
    static toResourceName() {
        return this.name;
    }
    static makeDefaultsObject() {
        let defaults = {};
        for (let key in this.defaults) {
            let thisDefault = this.defaults[key];
            if ('function' === typeof thisDefault) {
                defaults[key] = thisDefault.call(null);
            }
            else {
                defaults[key] = thisDefault;
            }
        }
        return defaults;
    }
    /**
     * Set an attribute of Resource instance and apply getters/setters
     * Do not use Dot Notation here
     * @param key
     * @param value
     */
    set(key, value) {
        // Don't accept dot notation here
        const pieces = key.split('.');
        if (pieces.length > 1) {
            throw new exceptions.AttributeError("Can't use dot notation when setting value of nested resource");
        }
        // Define Getters/Setters on this property
        Object.defineProperty(this.attributes, key, {
            configurable: true,
            enumerable: true,
            get: () => this.fromInternalValue(key),
            set: (newVal) => {
                this._attributes[key] = this.toInternalValue(key, newVal);
            }
        });
        this.attributes[key] = value;
        return this;
    }
    /**
     * Get an attribute of Resource instance
     * You can use dot notation here -- eg. resource.get('user.username')
     * @param key
     */
    get(key) {
        if (typeof key !== 'undefined') {
            // We're simply getting a value
            const pieces = key.split('.');
            const thisKey = String(pieces.shift());
            const thisValue = this.attributes[thisKey];
            const relatedResource = this.related[thisKey];
            if (pieces.length > 0 && typeof relatedResource !== 'undefined') {
                // We're not done getting attributes (it contains a ".") send it to related resource
                if (Array.isArray(relatedResource)) {
                    return relatedResource.map((thisResource) => {
                        return thisResource.get(pieces.join('.'));
                    });
                }
                return relatedResource.get(pieces.join('.'));
            }
            if (pieces.length > 0 && thisValue && typeof relatedResource === 'undefined' && this.hasRelatedDefined(thisKey)) {
                throw new exceptions.AttributeError(`Can't read related property ${thisKey} before getRelated() is called`);
            }
            else if (!pieces.length && typeof relatedResource !== 'undefined') {
                return relatedResource;
            }
            else if (!pieces.length && typeof thisValue !== 'undefined') {
                return thisValue;
            }
            else {
                return undefined;
            }
        }
        else {
            // We're getting all attributes -- any related resources also get converted to an object
            const related = Object.keys(this.related);
            const obj = Object.assign({}, this.attributes);
            while (related.length) {
                const key = String(related.shift());
                const relatedResource = this.related[key];
                if (Array.isArray(relatedResource)) {
                    obj[key] = relatedResource.map((subResource) => subResource.get());
                }
                else {
                    obj[key] = relatedResource.get();
                }
            }
            return obj;
        }
    }
    /**
     * Persist getting an attribute and get related keys until a key can be found (or not found)
     * TypeError in get() will be thrown, we're just doing the getRelated() work for you...
     * @param key
     */
    getAsync(key) {
        return new Promise((resolve, reject) => {
            try {
                resolve(this.get(key));
            }
            catch (e) {
                if (e instanceof exceptions.AttributeError) {
                    const pieces = key.split('.');
                    const thisKey = String(pieces.shift());
                    this.getRelated({ relatedKeys: [thisKey] }).then(() => {
                        let attrValue = this.get(thisKey);
                        let isMany = Array.isArray(attrValue);
                        let relatedResources = [].concat(attrValue);
                        let relatedKey = pieces.join('.');
                        let promises = relatedResources.map((resource) => {
                            return resource.getAsync(relatedKey);
                        });
                        Promise.all(promises).then((values) => {
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
    }
    /**
     * Translate this.attributes[key] into an internal value
     * Usually this is just setting a key/value but we want to be able to accept
     * anything -- another Resource instance for example. If a Resource instance is
     * provided, set the this.related[key] as the new instance, then set the
     * this.attributes[key] field as just the primary key of the related Resource instance
     * @param key
     * @param value
     */
    toInternalValue(key, value) {
        let currentValue = this.fromInternalValue(key);
        if (!isEqual(currentValue, value)) {
            // New value has changed -- set it in this.changed and this._attributes
            let translateValueToPk = this.shouldTranslateValueToPrimaryKey(key, value);
            // Also resolve any related Resources back into foreign keys -- @todo What if it's a list of related Resources?
            if (value && translateValueToPk) {
                // Newly set value is an actual Resource instance
                let relatedResource = value;
                // Don't accept any resources that aren't saved
                if (!relatedResource.id) {
                    throw new AttributeError(`Can't append Related Resource on field "${key}": Related Resource ${relatedResource.getConstructor().name} must be saved first`);
                }
                // this.related is a related resource or a list of related resources
                this.related[key] = relatedResource;
                // this._attributes is a list of IDs
                value = relatedResource.id;
            }
            else if (value instanceof Resource && !translateValueToPk) {
                throw new AttributeError(`Can't accept a Related Resource on field "${key}": try using Resource's primary key or assign a value of "${key}" on ${this.getConstructor().name}.related`);
            }
            this.changes[key] = value;
        }
        return value;
    }
    /**
     * Like toInternalValue except the other way around
     * @param key
     */
    fromInternalValue(key) {
        return this._attributes[key];
    }
    /**
     * Used to check if an incoming attribute (key)'s value should be translated from
     * a Related Resource (defined in Resource.related) to a primary key (the ID)
     * @param key
     * @param value
     */
    shouldTranslateValueToPrimaryKey(key, value) {
        return !!(value instanceof Resource && value.getConstructor() === this.rel(key));
    }
    /**
     * Like calling instance.constructor but safer:
     * changing objects down the line won't creep up the prototype chain and end up on native global objects like Function or Object
     */
    getConstructor() {
        if (this.constructor === Function) {
            // Safe guard in case something goes wrong in subclasses, we don't want to change native Function
            return Resource;
        }
        return this.constructor;
    }
    getRelated(options) {
        return this.getConstructor().getRelated(this, options);
    }
    getRelatedDeep(options) {
        const opts = Object.assign({ deep: true }, options || {});
        return this.getRelated(opts);
    }
    /**
     * Get related class by key
     * @param key
     */
    rel(key) {
        return this.getConstructor().rel(key);
    }
    /**
     * Saves the instance -- sends changes as a PATCH or sends whole object as a POST if it's new
     */
    save(options = {}) {
        let promise;
        const Ctor = this.getConstructor();
        if (this.isNew()) {
            promise = Ctor.client.post(Ctor.getListRoutePath(), this.attributes);
        }
        else if (options.partial === false) {
            promise = Ctor.client.put(Ctor.getDetailRoutePath(this.id), this.attributes);
        }
        else {
            promise = Ctor.client.patch(Ctor.getDetailRoutePath(this.id), this.changes);
        }
        return promise.then((response) => {
            this.changes = {};
            for (const resKey in response.data) {
                this.set(resKey, response.data[resKey]);
            }
            return this.cache(true);
        });
    }
    update() {
        return this.getConstructor().detail(this.id);
    }
    hasRelatedDefined(relatedKey) {
        return this.getConstructor().related[relatedKey] && !this.related[relatedKey];
    }
    cache(replace = false) {
        this.getConstructor().cacheResource(this, !!replace);
        return this;
    }
    getCached() {
        return this.getConstructor().getCached(this.id);
    }
    isNew() {
        return !this.id;
    }
    get id() {
        let uniqueKey = this.getConstructor().uniqueKey;
        return this.attributes[uniqueKey];
    }
    set id(value) {
        throw new exceptions.AttributeError('Cannot set ID manually. Set ID by using attributes[id] = value');
    }
    toString() {
        return `${this.toResourceName()} ${this.id || '(New)'}`;
    }
    toResourceName() {
        return this.getConstructor().toResourceName();
    }
    toJSON() {
        return this.get();
    }
}
Resource.endpoint = '';
Resource.cacheMaxAge = 60;
Resource.data = {};
Resource._cache = {};
Resource._client = new DefaultClient('/');
Resource.queued = {};
Resource.uniqueKey = 'id';
Resource.perPage = null;
Resource.defaults = {};
Resource.related = {};
//# sourceMappingURL=index.js.map