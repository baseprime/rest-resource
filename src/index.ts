import { stringify } from 'querystring'
import { DefaultClient, RequestConfig, ResourceResponse } from './client'
import { AxiosResponse } from 'axios'
import { uuidWeak } from './util'
import RelatedManager from './related'

const exceptions = require('./exceptions')
const assert = require('assert')
const isEqual = require('lodash').isEqual

export type IterableDict = {
    [index: string]: any
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

export interface GetRelatedOpts {
    managers?: string[]
    deep?: boolean
}

export type ListOpts = RequestConfig & {
    getRelated?: boolean
}

export type DetailOpts = RequestConfig & {
    getRelated?: boolean
}

export default class Resource {
    static endpoint: string = ''
    static cacheMaxAge: number = 60
    static _cache: any = {}
    static _client: DefaultClient = new DefaultClient('/')
    static _uuid: string
    static queued: Record<string, any> = {}
    static uniqueKey: string = 'id'
    static perPage: number | null = null
    static defaults: Record<string, any> = {}
    static relatedManager: typeof RelatedManager = RelatedManager
    static validators: ValidatorDict = {}
    static related: ResourceClassDict = {}
    _attributes: Record<string, any> = {}
    uuid: string
    attributes: Record<string, any> = {}
    managers: Record<string, RelatedManager> = {}
    changes: Record<string, any> = {}

    constructor(attributes: any = {}, options: any = {}) {
        const Ctor = this.getConstructor()
        const RelatedManagerCtor = Ctor.relatedManager
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
        // Create related managers
        // Because we're using Object.assign above, we shouldn't have to iterate here again -- @todo improve it
        for (let attrKey in Ctor.related) {
            this.managers[attrKey] = new RelatedManagerCtor(Ctor.related[attrKey], this._attributes[attrKey])
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

    static clearCache() {
        this._cache = {}
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
     * @param options Options object
     * @returns Promise
     */
    static list<T extends typeof Resource = typeof Resource>(this: T, options: ListOpts = {}): Promise<ResourceResponse<InstanceType<T>>> {
        return this.client.list<T>(this as T, options).then((result) => {
            if (options.getRelated) {
                const promises: Promise<void>[] = []
                result.resources.forEach((resource) => {
                    promises.push(resource.getRelated({ deep: true }))
                })
                return Promise.all(promises).then(() => result)
            }
            return result
        })
    }

    static detail<T extends typeof Resource = typeof Resource>(this: T, id: string, options: DetailOpts = {}): Promise<InstanceType<T>> {
        // Check cache first
        const cached: CachedResource<InstanceType<T>> = this.getCached(String(id))
        return new Promise((resolve, reject) => {
            // Do we want to use cache?
            if (!cached || options.useCache === false) {
                // Set a hash key for the queue (keeps it organized by type+id)
                const queueHashKey = this.getResourceHashKey(id)
                // If we want to use cache and cache wasn't found...
                if (!cached && !this.queued[queueHashKey]) {
                    // We want to use cached and a resource with this ID hasn't been requested yet
                    this.queued[queueHashKey] = []
                    this.client
                        .detail(this, id, options)
                        .then(async (result) => {
                            // Get detail route and get resource from response
                            const correctResource = <InstanceType<T>>result.resources.pop()
                            // Get related resources?
                            if (options.getRelated) {
                                await correctResource.getRelated({ deep: true })
                            }
                            // Resolve first-sent request
                            setTimeout(() => resolve(correctResource), 0)
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
                const cachedResource = cached.resource
                // Get related resources?
                if (options.getRelated) {
                    cached.resource.getRelated({ deep: true }).then(() => resolve(cachedResource))
                } else {
                    resolve(cachedResource)
                }
            }
        })
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

    /**
     * Unique resource hash key used for caching and organizing requests
     * @param resourceId
     */
    static getResourceHashKey(resourceId: string) {
        assert(Boolean(resourceId), "Can't generate resource hash key with an empty Resource ID. Please ensure Resource is saved first.")
        return Buffer.from(`${this.uuid}:${resourceId}`).toString('base64')
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
     * You can use dot notation here -- eg. `resource.get('user.username')`
     * You can also get all properties by not providing any arguments
     * @param? key
     */
    get(key?: string): any {
        if (typeof key !== 'undefined') {
            // Get a value
            const pieces = key.split('.')
            const thisKey = String(pieces.shift())
            const thisValue = this.attributes[thisKey]
            const relatedManager: RelatedManager = this.managers[thisKey]

            if (pieces.length > 0) {
                // We need to go deeper...
                if (!relatedManager) {
                    throw new exceptions.ImproperlyConfiguredError(`No relation found on ${this.toResourceName()}[${thisKey}]. Did you define it on ${this.toResourceName()}.related?`)
                }

                if (relatedManager.many) {
                    return relatedManager.objects.map((thisResource) => {
                        return thisResource.get(pieces.join('.'))
                    })
                }

                return relatedManager.objects[0].get(pieces.join('.'))
            } else if (Boolean(thisValue) && relatedManager) {
                // If the related manager is a single object and is inflated, auto resolve the resource.get(key) to that object
                // @todo Maybe we should always return the manager? Or maybe we should always return the resolved object(s)? I am skeptical about this part
                return !relatedManager.many && relatedManager.resolved ? relatedManager.objects[0] : relatedManager
            } else {
                return thisValue
            }
        } else {
            // We're getting all attributes -- any related resources also get converted to an object
            const managers = Object.keys(this.managers)
            const obj = Object.assign({}, this.attributes)
            while (managers.length) {
                const key = String(managers.shift())
                const manager = this.managers[key]
                if (manager.many) {
                    obj[key] = manager.objects.map((subResource) => subResource.get())
                } else if (!manager.many && manager.objects[0]) {
                    obj[key] = manager.objects[0].get()
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
                    const manager = this.managers[thisKey]

                    manager.resolve().then(() => {
                        let relatedKey = pieces.join('.')
                        let promises = manager.objects.map((resource: Resource) => {
                            return resource.getAsync(relatedKey)
                        })

                        Promise.all(promises).then((values) => {
                            if (manager.many) {
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
     * Setter -- Translate new value into an internal value onto this._attributes[key]
     * Usually this is just setting a key/value but we want to be able to accept
     * anything -- another Resource instance for example. If a Resource instance is
     * provided, set the this.managers[key] as the new manager instance, then set the
     * this.attributes[key] field as just the primary key of the related Resource instance
     * @param key
     * @param value
     */
    toInternalValue(key: string, value: any): any {
        let currentValue = this.attributes[key]
        let newValue = value

        if (!isEqual(currentValue, newValue)) {
            // Also resolve any related Resources back into foreign keys
            if (newValue && newValue['getConstructor']) {
                // newValue is a Resource instance
                // Don't accept any resources that aren't saved
                if (!newValue.id) {
                    throw new exceptions.AttributeError(`Can't append Related Resource on field "${key}": Related Resource ${newValue.getConstructor().name} must be saved first`)
                }
                // Create a RelatedManager
                let RelatedCtor = newValue.getConstructor()
                let RelatedManager = this.getConstructor().relatedManager
                let manager = new RelatedManager(RelatedCtor, newValue)
                newValue = manager.toJSON()
                this.managers[key] = manager
            } else if (newValue && this.managers[key]) {
                // newValue has an old manager -- needs a new one
                // Create a RelatedManager
                let RelatedCtor = newValue.to
                let RelatedManager = this.getConstructor().relatedManager
                let manager = new RelatedManager(RelatedCtor, newValue)
                newValue = manager.toJSON()
                this.managers[key] = manager
            }

            this.changes[key] = newValue
        }

        return newValue
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
    getRelated({ deep = false, managers = [] }: GetRelatedOpts = {}): Promise<void> {
        const promises: Promise<void>[] = []
        for (const resourceKey in this.managers) {
            if (Array.isArray(managers) && managers.length > 0 && !~managers.indexOf(resourceKey)) {
                continue
            }

            const manager = this.managers[resourceKey]
            const promise = manager.resolve().then((objects) => {
                if (deep) {
                    let otherPromises = objects.map((resource) => resource.getRelated({ deep, managers }))
                    return Promise.all(otherPromises).then(() => {
                        return void {}
                    })
                } else {
                    return void {}
                }
            })

            promises.push(promise)
        }

        return Promise.all(promises).then(() => void {})
    }

    /**
     * Same as `Resource.prototype.getRelated` except `options.deep` defaults to `true`
     * @param options
     */
    getRelatedDeep(options?: GetRelatedOpts): Promise<void> {
        const opts = Object.assign({ deep: true }, options || {})
        return this.getRelated(opts)
    }

    /**
     * Get related class by key
     * @param key
     */
    rel(key: string) {
        return this.managers[key]
    }

    /**
     * Saves the instance -- sends changes as a PATCH or sends whole object as a POST if it's new
     */
    save<T extends this>(options: SaveOptions = {}): Promise<ResourceResponse<T>> {
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
            } as ResourceResponse<T>
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
