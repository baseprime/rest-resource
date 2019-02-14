import * as exceptions from './exceptions'
import { stringify } from 'querystring'
import { DefaultClient, RequestConfig, ResourceResponse } from './client'
import { AxiosResponse } from 'axios';

const assert = require('assert')
const isEqual = require('lodash').isEqual

export type ResourceLike<T extends Resource = Resource> = T | Resource
export type ResourceCtorLike<T extends typeof Resource = typeof Resource> = T | typeof Resource

export interface GetRelatedDict {
    deep?: boolean
    relatedKeys?: string[]
    relatedSubKeys?: string[]
}

export interface ResourceClassDict {
    [key: string]: ResourceCtorLike
}

export interface ResourceDict<T extends ResourceLike = ResourceLike> {
    [key: string]: T | T[]
}

export interface CachedResource<T extends ResourceLike = ResourceLike> {
    expires: number
    resource: T
}

export default class Resource implements ResourceLike {
    static endpoint: string = ''
    static cacheMaxAge: number = 60
    static data: any = {}
    static _cache: any = {}
    static client: DefaultClient = new DefaultClient('/')
    static queued: any = {}
    static uniqueKey = 'id'
    static defaults: any = {}
    static related: ResourceClassDict = {}
    _attributes: any = {}
    attributes: any = {}
    related: ResourceDict = {}
    changes: any = {}

    constructor(attributes?: any, options?: any) {
        const Ctor = this.getConstructor()
        if (typeof Ctor.getClient() !== 'object') {
            throw new exceptions.ImproperlyConfiguredError("Resource can't be used without Client class instance")
        }

        // Set up attributes and defaults
        this._attributes = Object.assign({}, Ctor.defaults || {}, attributes || {})
        // Add getters/setters for attributes
        for (let attrKey of Object.keys(this._attributes)) {
            this.set(attrKey, this._attributes[attrKey])
        }

        if (this.id) {
            Ctor.cacheResource(this)
        }
    }

    /**
     * Cache getter
     */
    static get cache() {
        if (!this._cache || this._cache === Resource._cache) {
            this._cache = {}
            return this._cache
        }
        return this._cache
    }

    /**
     * Cache a resource onto this class' cache for cacheMaxAge seconds
     * @param resource
     * @param replace
     */
    static cacheResource(resource: ResourceLike, replace: boolean = false) {
        if(!resource.id) {
            throw new exceptions.CacheError(`Can't cache ${resource.toResourceName()} resource without ${resource.getConstructor().uniqueKey} field`)
        } else if (replace) {
            try {
                return this.replaceCache(resource)
            } catch(e) {}
        }

        this.cache[resource.id] = {
            resource,
            expires: this.cacheDeltaSeconds(),
        }
    }

    /**
     * Replace attributes on a cached resource onto this class' cache for cacheMaxAge seconds (useful for bubbling up changes to states that may be already rendered)
     * @param resource
     */
    static replaceCache(resource: ResourceLike) {
        if (!this.cache[resource.id]) {
            throw new exceptions.CacheError("Can't replace cache: resource doesn't exist")
        }

        Object.assign(this.cache[resource.id].resource.attributes, resource.attributes)
        this.cache[resource.id].expires = this.cacheDeltaSeconds()
    }

    /**
     * Get time delta in seconds of cache expiry
     */
    static cacheDeltaSeconds() {
        return Date.now() + this.cacheMaxAge * 1000
    }

    /**
     * Get a cached resource by ID
     * @param id
     */
    static getCached(id: string): CachedResource | undefined {
        const cached = this.cache[id]
        if (cached && cached.expires > Date.now()) {
            return cached
        }
        return undefined
    }

    static getCachedAll(): CachedResource[] {
        return Object.keys(this.cache)
            .map((cacheKey) => this.getCached(cacheKey))
            .filter((valid) => !!valid)
    }

    /**
     * Get HTTP client for a resource Class
     * This is meant to be overridden if we want to define a client at any time
     */
    static getClient(): DefaultClient {
        if (!this.client) {
            throw new exceptions.ImproperlyConfiguredError('Resource client class not defined. Did you try Resource.setClient or overriding Resource.getClient?')
        }
        return this.client
    }

    /**
     * Set HTTP client
     * @param client instanceof Client
     */
    static setClient(client: DefaultClient) {
        this.client = client
    }

    /**
     * Get list route path (eg. /users) to be used with HTTP requests and allow a querystring object
     * @param query Querystring
     */
    static getListRoutePath(query?: any): string {
        if (query) {
            let qs = stringify(query)
            return `${this.endpoint}?${qs}`
        }
        return this.endpoint
    }

    /**
     * Get detail route path (eg. /users/123) to be used with HTTP requests
     * @param id
     * @param query Querystring
     */
    static getDetailRoutePath(id: string, query?: any): string {
        let qs = stringify(query)
        return `${this.endpoint}/${id}${query ? '?' : ''}${qs}`
    }

    /**
     * HTTP Get of resource's list route--returns a promise
     * @param options HTTP Request Options
     * @returns Promise
     */
    static list<T extends ResourceLike = ResourceLike>(options: RequestConfig = {}): Promise<ResourceLike<T>[]> {
        return this.getListRoute(options).then((results: ResourceResponse) => results.objects)
    }

    static detail<T extends ResourceLike = ResourceLike>(id: string, options: RequestConfig = {}): Promise<T> {
        // Check cache first
        const cached: CachedResource<ResourceLike<T>> = this.getCached(String(id))
        return new Promise((resolve) => {
            // Do we want to use cache?
            if (!cached || options.useCache === false) {
                // Set a hash key for the queue (keeps it organized by type+id)
                const queueHashKey = (new Buffer(`${this.name}:${id}`)).toString('base64')
                // If we want to use cache and cache wasn't found...
                if (!cached && !this.queued[queueHashKey]) {
                    // We want to use cached and a resource with this ID hasn't been requested yet
                    this.queued[queueHashKey] = []
                    this.getDetailRoute(id).then((response) => {
                        // Get detail route and get resource from response
                        const correctResource = <T>response.objects.pop()
                        // Resolve first-sent request
                        resolve(<T>correctResource)
                        // Then resolve any deferred requests if there are any
                        this.queued[queueHashKey].forEach((deferred: (resource: ResourceLike<T>) => any) => {
                            deferred(<T>correctResource)
                        })
                        // Finally, remove the fact that we've queued any requests with this ID
                        delete this.queued[queueHashKey]
                    })
                } else {
                    // We want to use cache, but a resource with this ID has already been queued--defer promise and resolve when queued resource actually completes
                    const deferredPromise: Promise<T> = new Promise((resolveDeferred) => {
                        this.queued[queueHashKey].push(resolveDeferred)
                    })
                    // Resolve related call to detail() but deferredPromise doesn't run until the first queued resource is completed
                    resolve(deferredPromise)
                }
            } else {
                // We want to use cache, and we found it!
                resolve(<T>cached.resource)
            }
        })
    }

    static getDetailRoute<T extends ResourceLike = ResourceLike>(id: string, options: RequestConfig = {}): Promise<ResourceResponse<ResourceLike<T>>> {
        return this.getClient()
            .get(this.getDetailRoutePath(id), options)
            .then(this.extractObjectsFromResponse.bind(this))
    }

    static getListRoute<T extends ResourceLike = ResourceLike>(options: RequestConfig = {}): Promise<ResourceResponse<ResourceLike<T>>> {
        return this.getClient()
            .get(this.getListRoutePath(options.query), options)
            .then(this.extractObjectsFromResponse.bind(this))
    }

    static extractObjectsFromResponse<T extends ResourceLike = ResourceLike>(result: any): ResourceResponse<T> {
        let objects: T[] = []
        const body: any = result.data
        const Cls = <ResourceCtorLike>this

        if (body && body.results) {
            body.results.forEach((obj: any) => {
                objects.push(<T>new Cls(obj))
            })
        } else {
            objects = <T[]>[new Cls(body)]
        }

        return {
            response: result,
            objects,
        }
    }

    static getRelated(resource: ResourceLike, { deep = false, relatedKeys = undefined, relatedSubKeys = undefined }: GetRelatedDict = {}): Promise<Resource> {
        const promises: Promise<ResourceDict>[] = []
        for (const resourceKey in this.related) {
            // Allow specification of keys to related resources they want to get
            if (typeof relatedKeys !== 'undefined' && Array.isArray(relatedKeys) && !~relatedKeys.indexOf(resourceKey)) {
                continue
            }
            // If this resource key exists on the resource's attributes, and it's not null
            if (resource.attributes[resourceKey] !== 'undefined' && resource.attributes[resourceKey] !== null) {
                // Get related Resource class
                const RelatedCls: ResourceCtorLike = this.related[resourceKey]
                // If the property of the attributes is a list of IDs, we need to return a collection of Resources
                const isMany = Array.isArray(resource.attributes[resourceKey])
                // Get resource ids -- coerce to list (even if it's 1 ID to get, it'll be [id])
                const rids = [].concat(resource.attributes[resourceKey])
                if(isMany && !Array.isArray(resource.related[resourceKey])) {
                    resource.related[resourceKey] = []
                }
                // Now for all IDs...
                rids.forEach((rid, idx) => {
                    // Create a promise getting the details
                    const promise = RelatedCls.detail(rid).then((instance) => {
                        assert(instance instanceof RelatedCls, `Related class detail() returned invalid instance on key ${this.name}.related.${resourceKey}: ${instance.getConstructor().name} (returned) !== ${RelatedCls.name} (related)`)
                        
                        if (isMany) {
                            // If it's a list, make sure the array property exists before pushing it onto the list
                            if (!Array.isArray(resource.related[resourceKey])) {
                                resource.related[resourceKey] = []
                            }
                            // Finally, put this resource into the collection of other instances
                            (resource.related[resourceKey] as ResourceLike[])[idx] = instance
                        } else {
                            // The corresponding attribute is just a Primary Key, so no need to create a collection
                            resource.related[resourceKey] = instance
                        }

                        if (deep) {
                            // If we want to go deeper, recursively call new instance's getRelated() -- note we're shifting over the relatedKeys
                            return instance
                                .getRelated(<GetRelatedDict>{
                                    deep,
                                    relatedKeys: relatedSubKeys,
                                })
                                .then(() => resource.related)
                        }
                        // We're done!
                        return resource.related
                    })
                    // Add this promise to the list of other related models to get
                    promises.push(promise)
                })
            } else {
                // Probably a null value, just leave it null
            }
        }
        // Run all promises then return related resources
        return Promise.all(promises).then(() => resource)
    }

    static getRelatedDeep(resource: ResourceLike, options?: GetRelatedDict) {
        const opts = Object.assign({ deep: true }, options)
        return this.getRelated(resource, opts)
    }

    /**
     * Get related class by key
     * @param key 
     */
    static rel(key: string): typeof Resource {
        return this.related[key]
    }

    static toResourceName(): string {
        return this.name
    }

    /**
     * Set an attribute of Resource instance
     * @param key 
     * @param value 
     */
    set(key: string, value: any) {
        // We're setting a value -- setters in ctor takes care of changes
        const pieces = key.split('.')
        if (pieces.length > 1) {
            throw new exceptions.AttributeError("Can't use dot notation when setting value of nested resource")
        }

        Object.defineProperty(this.attributes, key, {
            configurable: true,
            enumerable: true,
            get: () => this.fromInternalValue(key),
            set: (newVal) => {
                this._attributes[key] = this.toInternalValue(key, newVal)
            }
        })

        this.attributes[key] = value

        return this
    }

    /**
     * Get an attribute of Resource instance
     * You can use dot notation here -- eg. resource.get('user.username')
     * @param key 
     */
    get(key?: string): any {
        if (typeof key !== 'undefined') {
            // We're simply getting a value
            const pieces = key.split('.')
            const thisKey = String(pieces.shift())
            const thisValue = this.attributes[thisKey]
            const relatedResource = this.related[thisKey]
            if (pieces.length > 0 && typeof relatedResource !== 'undefined') {
                // We're not done getting attributes (it contains a ".") send it to related resource
                if (Array.isArray(relatedResource)) {
                    return relatedResource.map((thisResource) => {
                        return thisResource.get(pieces.join('.'))
                    })
                }
                return relatedResource.get(pieces.join('.'))
            }
            if (pieces.length > 0 && thisValue && typeof relatedResource === 'undefined' && this.hasRelatedDefined(thisKey)) {
                throw new exceptions.AttributeError(`Can't read related property ${thisKey} before getRelated() is called`)
            } else if (!pieces.length && typeof relatedResource !== 'undefined') {
                return relatedResource
            } else if (!pieces.length && typeof thisValue !== 'undefined') {
                return thisValue
            } else {
                return undefined
            }
        } else {
            // We're getting all attributes -- any related resources also get converted to an object
            const related = Object.keys(this.related)
            const obj = Object.assign({}, this.attributes)
            while (related.length) {
                const key = String(related.shift())
                const relatedResource = this.related[key]
                if (Array.isArray(relatedResource)) {
                    obj[key] = relatedResource.map((subResource) => subResource.get())
                } else {
                    obj[key] = relatedResource.get()
                }
            }
            return obj
        }
    }

    /**
     * Persist getting an attribute and get related keys until a key can be found (or not found)
     * TypeError in get() will be thrown, we're just doing the getRelated() work for you...
     * @param key
     */
    getAsync(key: string): Promise<any> {
        return new Promise((resolve) => {
            try {
                resolve(this.get(key))
            } catch (e) {
                if (e instanceof exceptions.AttributeError) {
                    const pieces = key.split('.')
                    const thisKey = String(pieces.shift())

                    this.getRelated({ relatedKeys: [thisKey] }).then(() => {
                        let attrValue = this.get(thisKey)
                        let isMany = Array.isArray(attrValue)
                        let relatedResources = [].concat(attrValue)
                        let relatedKey = pieces.join('.')
                        let promises = relatedResources.map((resource) => {
                            return resource.getAsync(relatedKey)
                        })
                        
                        Promise.all(promises).then((values) => {
                            if(isMany) {
                                resolve(values)
                            } else if(values.length === 1) {
                                resolve(values[0])
                            } else {
                                resolve(values)
                            }
                        })
                    })
                }
            }
        })
    }

    /**
     * Mutate key/value on this.attributes[key] into an internal value
     * Usually this is just setting a key/value but we want to be able to accept 
     * anything -- another Resource instance for example. If a Resource instance is
     * provided, set the this.related[key] as the new instance, then set the 
     * this.attributes[key] field as just the primary key of the related Resource instance
     * @param key 
     * @param value 
     */
    toInternalValue(key: string, value: any): any {
        if (!isEqual(this.attributes[key], value)) {
            // New value has changed -- set it in this.changed and this._attributes
            let validRelatedKey = value instanceof Resource && value.getConstructor() === this.rel(key)
            // Also resolve any related Resources back into foreign keys -- @todo What if it's a list of related Resources?
            if(value && validRelatedKey) {
                // Newly set value is an actual Resource instance
                // this.related is a related resource or a list of related resources
                let newRelatedResource: Resource = value
                this.related[key] = newRelatedResource
                // this._attributes is a list of IDs
                value = newRelatedResource.id
            }

            this.changes[key] = value
        }

        return value
    }

    /**
     * Like toInternalValue except the other way around
     * @param key 
     */
    fromInternalValue(key: string) {
        return this._attributes[key]
    }

    /**
     * Like calling instance.constructor but safer:
     * changing objects down the line won't creep up the prototype chain and end up on native global objects like Function or Object
     */
    getConstructor(): ResourceCtorLike {
        if (this.constructor === Function) {
            // Safe guard in case something goes wrong in subclasses, we don't want to change native Function
            return Resource
        }
        return <ResourceCtorLike>this.constructor
    }

    getRelated(options?: GetRelatedDict): Promise<Resource> {
        return this.getConstructor().getRelated(this, options)
    }

    getRelatedDeep(options?: GetRelatedDict): Promise<Resource> {
        const opts = Object.assign({ deep: true }, options || {})
        return this.getRelated(opts)
    }

    /**
     * Get related class by key
     * @param key 
     */
    rel(key: string): typeof Resource {
        return this.getConstructor().rel(key)
    }

    /**
     * Saves the instance -- sends changes as a PATCH or sends whole object as a POST if it's new
     */
    save(): Promise<ResourceLike> {
        let promise
        const Ctor = this.getConstructor()

        if (!this.id) {
            promise = Ctor.getClient().post(Ctor.getListRoutePath(), this.attributes)
        } else {
            promise = Ctor.getClient().patch(Ctor.getDetailRoutePath(this.id), this.changes)
        }

        return promise.then((response: AxiosResponse) => {
            this.changes = {}
            for (const resKey in response.data) {
                this.set(resKey, response.data[resKey])
            }
            return this.cache(true)
        })
    }

    update() {
        return this.getConstructor().detail(this.id)
    }

    hasRelatedDefined(relatedKey: string) {
        return this.getConstructor().related[relatedKey] && !this.related[relatedKey]
    }

    cache(replace: boolean = false): ResourceLike {
        this.getConstructor().cacheResource(this, !!replace)
        return this
    }

    getCached(): CachedResource | undefined {
        return this.getConstructor().getCached(this.id)
    }

    get id(): string {
        let uniqueKey =  this.getConstructor().uniqueKey
        return this.attributes[uniqueKey]
    }

    set id(value) {
        throw new exceptions.AttributeError('Cannot set ID manually. Set ID by using attributes[id] = value')
    }

    toString(): string {
        return `${this.toResourceName()} ${this.id||'(New)'}`
    }

    toResourceName(): string {
        return this.getConstructor().toResourceName()
    }

    toJSON(): any {
        return this.get()
    }
}
