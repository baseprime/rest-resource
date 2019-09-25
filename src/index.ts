import { stringify } from 'querystring'
import { DefaultClient, RequestConfig, ResourceResponse } from './client'
import { AxiosResponse } from 'axios'
import { uuidWeak } from './util'

const exceptions = require('./exceptions')
const assert = require('assert')
const isEqual = require('lodash').isEqual

export type IterableDict = {
    [index: string]: any
}

export interface GetRelatedDict {
    deep?: boolean
    relatedKeys?: string[]
    relatedSubKeys?: string[]
}

export interface ResourceClassDict<T extends typeof Resource = typeof Resource> extends IterableDict {
    [key: string]: T
}

export interface ResourceDict<T extends Resource = Resource> {
    [key: string]: T | T[]
}

export interface ValidatorDict extends IterableDict {
    [key: string]: (value?: any, resource?: Resource) => void
}

export interface CachedResource<T extends Resource> {
    expires: number
    resource: T
}

export interface SaveOptions {
    partial?: boolean
    replaceCache?: boolean
    force?: boolean
}

export default class Resource {
    static endpoint: string = ''
    static cacheMaxAge: number = 60
    static _cache: any = {}
    static _client: DefaultClient = new DefaultClient('/')
    static _uuid: string
    static queued: IterableDict = {}
    static uniqueKey: string = 'id'
    static perPage: number | null = null
    static defaults: IterableDict = {}
    static validators: ValidatorDict = {}
    static related: ResourceClassDict = {}
    _attributes: IterableDict = {}
    uuid: string
    attributes: IterableDict = {}
    related: ResourceDict = {}
    changes: IterableDict = {}

    constructor(attributes: any = {}, options: any = {}) {
        const Ctor = this.getConstructor()
        if (typeof Ctor.client !== 'object') {
            throw new exceptions.ImproperlyConfiguredError("Resource can't be used without Client class instance")
        }
        // Set up attributes and defaults
        this._attributes = Object.assign({}, Ctor.makeDefaultsObject(), attributes)
        // Set up Proxy to this._attributes
        this.attributes = new Proxy(this._attributes, {
            set: (receiver: any, key: string, value: any) => {
                receiver[key] = this.toInternalValue(key, value)
                return true
            },
            get: (receiver: any, key: string) => {
                return receiver[key]
            },
            defineProperty: (target, prop, descriptor) => {
                return Reflect.defineProperty(target, prop, descriptor)
            },
        })

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

    static get uuid() {
        if (!this._uuid) {
            this._uuid = uuidWeak()
            return this._uuid
        }
        return this._uuid
    }

    /**
     * Cache a resource onto this class' cache for cacheMaxAge seconds
     * @param resource
     * @param replace
     */
    static cacheResource<T extends typeof Resource = typeof Resource>(this: T, resource: InstanceType<T>, replace: boolean = false) {
        if (!resource.id) {
            throw new exceptions.CacheError(`Can't cache ${resource.toResourceName()} resource without ${resource.getConstructor().uniqueKey} field`)
        } else if (replace) {
            try {
                return this.replaceCache<InstanceType<T>>(resource)
            } catch (e) {}
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
    static replaceCache<T extends Resource = Resource>(resource: T) {
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
    static getCached<T extends typeof Resource>(this: T, id: string): CachedResource<InstanceType<T>> | undefined {
        const cached = this.cache[id]
        if (cached && cached.expires > Date.now()) {
            return cached as CachedResource<InstanceType<T>>
        }
        return undefined
    }

    static getCachedAll<T extends typeof Resource>(this: T): CachedResource<InstanceType<T>>[] {
        return Object.keys(this.cache)
            .map((cacheKey) => this.getCached(cacheKey))
            .filter((valid) => !!valid)
    }

    /**
     * Get HTTP client for a resource Class
     * This is meant to be overridden if we want to define a client at any time
     */
    static get client() {
        if (!this._client) {
            throw new exceptions.ImproperlyConfiguredError('Resource client class not defined. Did you try Resource.setClient or overriding Resource.getClient?')
        }
        return this._client
    }

    /**
     * Set HTTP client
     * @param client instanceof Client
     */
    static set client(client) {
        this._client = client
    }

    /**
     * Get list route path (eg. /users) to be used with HTTP requests and allow a querystring object
     * @param query Querystring
     */
    static getListRoutePath(query?: any): string {
        if (query && Object.keys(query).length) {
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
        return `${this.endpoint}/${id}${query && Object.keys(query).length ? '?' : ''}${qs}`
    }

    /**
     * HTTP Get of resource's list route--returns a promise
     * @param options HTTP Request Options
     * @returns Promise
     */
    static list<T extends typeof Resource = typeof Resource>(this: T, options: RequestConfig = {}): Promise<ResourceResponse<InstanceType<T>>> {
        return this.client.list<T>(this as T, options)
    }

    static detail<T extends typeof Resource = typeof Resource>(this: T, id: string, options: RequestConfig = {}): Promise<InstanceType<T>> {
        // Check cache first
        const cached: CachedResource<InstanceType<T>> = this.getCached(String(id))
        return new Promise((resolve, reject) => {
            // Do we want to use cache?
            if (!cached || options.useCache === false) {
                // Set a hash key for the queue (keeps it organized by type+id)
                const queueHashKey = Buffer.from(`${this.uuid}:${id}`).toString('base64')
                // If we want to use cache and cache wasn't found...
                if (!cached && !this.queued[queueHashKey]) {
                    // We want to use cached and a resource with this ID hasn't been requested yet
                    this.queued[queueHashKey] = []
                    this.client
                        .detail(this, id)
                        .then((result) => {
                            // Get detail route and get resource from response
                            const correctResource = <InstanceType<T>>result.resources.pop()
                            // Resolve first-sent request
                            setImmediate(() => resolve(correctResource))
                            // Then resolve any deferred requests if there are any
                            this.queued[queueHashKey].forEach((deferred: (resource: InstanceType<T>) => any) => {
                                deferred(correctResource)
                            })
                        })
                        .catch((e) => {
                            reject(e)
                        })
                        .finally(() => {
                            // Finally, remove the fact that we've queued any requests with this ID
                            delete this.queued[queueHashKey]
                        })
                } else {
                    // We want to use cache, but a resource with this ID has already been queued--defer promise and resolve when queued resource actually completes
                    const deferredPromise: Promise<InstanceType<T>> = new Promise((resolveDeferred) => {
                        this.queued[queueHashKey].push(resolveDeferred)
                    })
                    // Resolve related call to detail() but deferredPromise doesn't run until the first queued resource is completed
                    resolve(deferredPromise)
                }
            } else {
                // We want to use cache, and we found it!
                resolve(cached.resource)
            }
        })
    }

    /**
     * Match all related values in `attributes[key]` where key is primary key of related instance
     * @param resource Resource Instance
     */
    static getRelated<T extends typeof Resource = typeof Resource>(this: T, resource: InstanceType<T>, { deep = false, relatedKeys = undefined, relatedSubKeys = undefined }: GetRelatedDict = {}): Promise<void> {
        const promises: Promise<ResourceDict>[] = []
        for (const resourceKey in this.related) {
            // Allow specification of keys to related resources they want to get
            if (typeof relatedKeys !== 'undefined' && Array.isArray(relatedKeys) && !~relatedKeys.indexOf(resourceKey)) {
                continue
            }
            // If this resource key exists on the resource's attributes, and it's not null
            if (resource.attributes[resourceKey] !== 'undefined' && resource.attributes[resourceKey] !== null) {
                // Get related Resource class
                const RelatedCls: typeof Resource = this.related[resourceKey]
                // If the property of the attributes is a list of IDs, we need to return a collection of Resources
                const isMany = Array.isArray(resource.attributes[resourceKey])
                // Get resource ids -- coerce to list (even if it's 1 ID to get, it'll be [id])
                const rids = [].concat(resource.attributes[resourceKey])
                if (isMany && !Array.isArray(resource.related[resourceKey])) {
                    resource.related[resourceKey] = []
                }
                // Now for all IDs...
                rids.forEach((rid, idx) => {
                    // Create a promise getting the details
                    const promise = RelatedCls.detail(rid).then((instance) => {
                        assert(instance.getConstructor().name == RelatedCls.name, `Related class detail() returned invalid instance on key ${this.name}.related.${resourceKey}: ${instance.getConstructor().name} (returned) !== ${RelatedCls.name} (related)`)

                        if (isMany) {
                            // If it's a list, make sure the array property exists before pushing it onto the list
                            if (!Array.isArray(resource.related[resourceKey])) {
                                resource.related[resourceKey] = []
                            }
                            // Finally, put this resource into the collection of other instances
                            ;(resource.related[resourceKey] as Resource[])[idx] = instance
                        } else {
                            // The corresponding attribute is just a Primary Key, so no need to create a collection
                            resource.related[resourceKey] = instance
                        }

                        if (deep) {
                            // If we want to go deeper, recursively call new instance's getRelated() -- note we're shifting over the relatedKeys
                            return instance
                                .getRelated({
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
        return Promise.all(promises).then(() => void {})
    }

    /**
     * Same as `Resource.getRelated` except with `deep` as `true`
     * @param resource
     * @param options
     */
    static getRelatedDeep(resource: Resource, options?: GetRelatedDict) {
        const opts = Object.assign({ deep: true }, options)
        return this.getRelated(resource, opts)
    }

    /**
     * Get related class by key
     * @param key
     */
    static rel<T extends typeof Resource = typeof Resource>(key: string): T {
        return this.related[key] as T
    }

    static toResourceName(): string {
        return this.name
    }

    static makeDefaultsObject(): any {
        let defaults: any = {}
        for (let key in this.defaults) {
            let thisDefault = this.defaults[key]
            if ('function' === typeof thisDefault) {
                defaults[key] = thisDefault.call(null)
            } else {
                defaults[key] = thisDefault
            }
        }
        return defaults
    }

    static extend<T, U>(this: U, classProps: T): U & T {
        // @todo Figure out typings here -- this works perfectly but typings are not happy
        // @ts-ignore
        return Object.assign(class extends this {}, classProps)
    }

    /**
     * Set an attribute of Resource instance and apply getters/setters
     * Do not use Dot Notation here
     * @param key
     * @param value
     */
    set(key: string, value: any) {
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
        return new Promise((resolve, reject) => {
            try {
                resolve(this.get(key))
            } catch (e) {
                if (exceptions.AttributeError.isInstance(e)) {
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
                            if (isMany) {
                                resolve(values)
                            } else if (values.length === 1) {
                                resolve(values[0])
                            } else {
                                resolve(values)
                            }
                        })
                    })
                } else {
                    reject(e)
                }
            }
        })
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
    toInternalValue(key: string, value: any): any {
        let currentValue = this.attributes[key]
        if (!isEqual(currentValue, value)) {
            // New value has changed -- set it in this.changed and this._attributes
            let translateValueToPk = this.shouldTranslateValueToPrimaryKey(key, value)
            // Also resolve any related Resources back into foreign keys -- @todo What if it's a list of related Resources?
            if (value && translateValueToPk) {
                // Newly set value is an actual Resource instance
                let relatedResource: Resource = value
                // Don't accept any resources that aren't saved
                if (!relatedResource.id) {
                    throw new exceptions.AttributeError(`Can't append Related Resource on field "${key}": Related Resource ${relatedResource.getConstructor().name} must be saved first`)
                }
                // this.related is a related resource or a list of related resources
                this.related[key] = relatedResource
                // this._attributes is a list of IDs
                value = relatedResource.id
            } else if (value instanceof Resource && !translateValueToPk) {
                throw new exceptions.AttributeError(`Can't accept a Related Resource on field "${key}": Value must be related Resource's primary key if there is an assigned value of "${key}" on ${this.getConstructor().name}.related`)
            }

            this.changes[key] = value
        }

        return value
    }

    /**
     * Used to check if an incoming attribute (key)'s value should be translated from
     * a Related Resource (defined in Resource.related) to a primary key (the ID)
     * @param key
     * @param value
     */
    shouldTranslateValueToPrimaryKey(key: string, value: any) {
        return !!(value instanceof Resource && value.getConstructor() === this.rel(key))
    }

    /**
     * Like calling instance.constructor but safer:
     * changing objects down the line won't creep up the prototype chain and end up on native global objects like Function or Object
     */
    getConstructor<T extends typeof Resource = typeof Resource>(): T {
        if (this.constructor === Function) {
            // Safe guard in case something goes wrong in subclasses, we don't want to change native Function
            return Resource as T
        }
        return this.constructor as T
    }

    /**
     * Match all related values in `attributes[key]` where key is primary key of related instance defined in `Resource.related[key]`
     * @param options GetRelatedDict
     */
    getRelated<T extends typeof Resource = typeof Resource>(this: InstanceType<T>, options?: GetRelatedDict) {
        return this.getConstructor<T>().getRelated(this, options)
    }

    /**
     * Same as `Resource.prototype.getRelated` except `options.deep` defaults to `true`
     * @param options
     */
    getRelatedDeep(options?: GetRelatedDict): Promise<void> {
        const opts = Object.assign({ deep: true }, options || {})
        return this.getRelated(opts)
    }

    /**
     * Get related class by key
     * @param key
     */
    rel<T extends typeof Resource = typeof Resource>(key: string): T {
        return this.getConstructor().rel<T>(key)
    }

    /**
     * Saves the instance -- sends changes as a PATCH or sends whole object as a POST if it's new
     */
    save<T extends Resource = Resource>(this: T, options: SaveOptions = {}): Promise<ResourceResponse<T>> {
        let promise
        const Ctor = this.getConstructor()

        let errors = this.validate()

        if (errors.length > 0 && !options.force) {
            throw new exceptions.ValidationError(errors)
        }

        if (this.isNew()) {
            promise = Ctor.client.post(Ctor.getListRoutePath(), this.attributes)
        } else if (options.partial === false) {
            promise = Ctor.client.put(Ctor.getDetailRoutePath(this.id), this.attributes)
        } else {
            promise = Ctor.client.patch(Ctor.getDetailRoutePath(this.id), this.changes)
        }

        return promise.then((response: AxiosResponse<T>) => {
            this.changes = {}
            for (const resKey in response.data) {
                this.set(resKey, response.data[resKey])
            }
            // Replace cache
            this.cache(options.replaceCache === false ? false : true)
            return {
                response,
                resources: [this],
            }
        })
    }

    /**
     * Validate attributes -- returns empty if no errors exist -- you should throw new errors here
     * @returns `Error[]` Array of Exceptions
     */
    validate(): Error[] {
        let errs = []
        let validators = this.getConstructor().validators
        for (let key in validators) {
            try {
                if ('function' === typeof validators[key]) {
                    validators[key].call(null, this.attributes[key], this)
                }
            } catch (e) {
                // One of the downsides of using Webpack is that you can't strict compare from
                //  another module because the exported member will be transpiled and therefore will not
                //  be the same address in memory. So we have a handy function to detect ValidationError
                if (exceptions.ValidationError.isInstance(e)) {
                    errs.push(e)
                } else {
                    throw e
                }
            }
        }

        return errs
    }

    update<T extends Resource = Resource>(this: T): Promise<T> {
        return this.getConstructor().detail(this.id) as Promise<T>
    }

    delete(options?: RequestConfig) {
        return this.getConstructor().client.delete(this.getConstructor().getDetailRoutePath(this.id), options)
    }

    hasRelatedDefined(relatedKey: string) {
        return this.getConstructor().related[relatedKey] && !this.related[relatedKey]
    }

    cache<T extends Resource = Resource>(this: T, replace: boolean = false): T {
        this.getConstructor().cacheResource(this, !!replace)
        return this
    }

    getCached<T extends Resource = Resource>(this: T) {
        return this.getConstructor().getCached(this.id) as CachedResource<T>
    }

    isNew(): boolean {
        return !this.id
    }

    get id(): string {
        let uniqueKey = this.getConstructor().uniqueKey
        return this.attributes[uniqueKey]
    }

    set id(value) {
        throw new exceptions.AttributeError('Cannot set ID manually. Set ID by using attributes[id] = value')
    }

    toString(): string {
        return `${this.toResourceName()} ${this.id || '(New)'}`
    }

    toResourceName(): string {
        return this.getConstructor().toResourceName()
    }

    toJSON(): any {
        return this.get()
    }
}
