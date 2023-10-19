import { DefaultClient, RequestConfig, ResourceResponse } from './client'
import { AxiosResponse } from 'axios'
import { uuidWeak, urlStringify } from './util'
import RelatedManager from './related'
import { BaseNormalizer, NormalizerDict, ValidNormalizer } from './helpers/normalization'
import { Buffer } from 'buffer'
import * as exceptions from './exceptions'
import assert from 'assert'

const _ = require('lodash')

export default class Resource {
    static endpoint: string = ''
    static cacheMaxAge: number = 10
    static client: DefaultClient = new DefaultClient('/')
    static queued: Record<string, any> = {}
    static uniqueKey: string = 'id'
    static defaults: Record<string, any> = {}
    static RelatedManagerClass: typeof RelatedManager = RelatedManager
    static validation: ValidatorDictOrFunction = {}
    static normalization: NormalizerDict = {}
    static fields: string[] = []
    static related: RelatedDictOrFunction = {}
    static _cache: any = {}
    static _uuid: string
    _attributes: Record<string, any> = {}
    uuid: string
    attributes: Record<string, any> = {}
    managers: Record<string, RelatedManager> = {}
    changes: Record<string, any> = {}

    constructor(attributes: any = {}, options: any = {}) {
        const Ctor = this.getConstructor()
        if (typeof Ctor.client !== 'object') {
            throw new exceptions.ImproperlyConfiguredError("Resource can't be used without Client class instance")
        }
        this._attributes = {}
        let _attrKeys = Object.keys(attributes)
        let _defaults = Ctor.makeDefaultsObject()
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
        // Default attributes, ignore any that will be overridden
        for (let defaultsKey in _defaults) {
            if (_attrKeys.includes(defaultsKey)) {
                continue
            }

            this.attributes[defaultsKey] = _defaults[defaultsKey]
        }
        // Attributes parameters, will fire setter
        for (let attrKey in attributes) {
            this.attributes[attrKey] = attributes[attrKey]
        }
        // Set/Reset changes
        this.changes = {}
        // Create related managers
        for (let relAttrKey in Ctor.getRelatedClasses()) {
            this.managers[relAttrKey] = this.createManagerFor(relAttrKey)
        }

        if (this.id) {
            Ctor.cacheResource(this)
        }
    }

    /**
     * Cache getter
     */
    static get cache() {
        let ParentClass = Object.getPrototypeOf(this)
        // FooResource.cache === BarResource.cache should always return false where BarResource extends FooResource
        if (!this._cache || this._cache === ParentClass._cache) {
            this._cache = {}
        }

        return new Proxy(this._cache, {
            set: (receiver: any, key: string, value: any) => {
                receiver[key] = value
                return true
            },
            get: (receiver: any, key: string) => {
                return receiver[key]
            },
            defineProperty: (target, prop, descriptor) => {
                return Reflect.defineProperty(target, prop, descriptor)
            },
        })
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
    static cacheResource<T extends typeof Resource>(this: T, resource: InstanceType<T>, replace: boolean = false) {
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
    static replaceCache<T extends Resource>(resource: T) {
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
    static getCached<T extends typeof Resource>(this: T, id: string | number): CachedResource<InstanceType<T>> | undefined {
        const cached = this.cache[String(id)]
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
     * Backwards compatibility
     * Remove in next major release @todo
     */
    static get validators() {
        return this.validation
    }

    /**
     * Backwards compatibility
     * Remove in next major release @todo
     */
    static set validators(value: any) {
        this.validation = value
    }

    /**
     * Get list route path (eg. /users) to be used with HTTP requests and allow a querystring object
     * @param query Querystring
     */
    static getListRoutePath(query?: any): string {
        if (query && Object.keys(query).length) {
            let qs = urlStringify(query)
            return `${this.endpoint}?${qs}`
        }
        return this.endpoint
    }

    /**
     * Get detail route path (eg. /users/123) to be used with HTTP requests
     * @param id
     * @param query Querystring
     */
    static getDetailRoutePath(id: string | number, query?: any): string {
        let qs = urlStringify(query)
        return `${this.endpoint}/${String(id)}${query && Object.keys(query).length ? '?' : ''}${qs}`
    }

    /**
     * HTTP Get of resource's list route--returns a promise
     * @param options Options object
     * @returns Promise
     */
    static list<T extends typeof Resource>(this: T, options: ListOpts = {}): ListResponse<T> {
        return this.client.list<T>(this as T, options).then((result) => {
            if (options.resolveRelated || options.resolveRelatedDeep) {
                let deep = !!options.resolveRelatedDeep
                const promises: Promise<void>[] = []
                result.resources.forEach((resource) => {
                    promises.push(resource.resolveRelated({ deep }))
                })
                return Promise.all(promises).then(() => result)
            }
            return result
        })
    }

    static detail<T extends typeof Resource>(this: T, id: string | number, options: DetailOpts = {}): Promise<InstanceType<T>> {
        // Check cache first
        const cached: CachedResource<InstanceType<T>> = this.getCached(String(id))
        return new Promise((resolve, reject) => {
            // Do we want to use cache?
            if (!cached || options.useCache === false) {
                // Set a hash key for the queue (keeps it organized by type+id)
                const queueHashKey = this.getResourceHashKey(String(id))
                // If we want to use cache and cache wasn't found...
                if (!this.queued[queueHashKey]) {
                    // We want to use cached and a resource with this ID hasn't been requested yet
                    this.queued[queueHashKey] = []
                    this.client
                        .detail(this, String(id), options)
                        .then(async (result) => {
                            // Get detail route and get resource from response
                            const correctResource = <InstanceType<T>>result.resources.pop()
                            // Get related resources?
                            if (options.resolveRelated || options.resolveRelatedDeep) {
                                let deep = !!options.resolveRelatedDeep
                                await correctResource.resolveRelated({ deep })
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
                if (options.resolveRelated || options.resolveRelatedDeep) {
                    let deep = !!options.resolveRelatedDeep
                    cached.resource.resolveRelated({ deep }).then(() => resolve(cachedResource))
                } else {
                    resolve(cachedResource)
                }
            }
        })
    }

    static wrap(relativePath: string, query?: any) {
        assert(relativePath && relativePath[0] === '/', `Relative path "${relativePath}" must start with a "/"`)
        let relEndpoint = this.endpoint + relativePath

        if (query && Object.keys(query).length) {
            let qs = urlStringify(query)
            relEndpoint = `${relEndpoint}?${qs}`
        }

        return this.client.bindMethodsToPath(relEndpoint)
    }

    static toResourceName(): string {
        // In an ES5 config, Webpack will reassign class name as a function like
        // function class_1() { } when transpiling, so to help out with this in
        // debugging, replace the class_1 function name with something more descriptive
        if (this.name.match(/^class_/)) {
            return `ResourceClass(${this.endpoint})`
        }

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
    static getResourceHashKey(resourceId: string | number) {
        assert(Boolean(resourceId), "Can't generate resource hash key with an empty Resource ID. Please ensure Resource is saved first.")
        return Buffer.from(`${this.uuid}:${String(resourceId)}`).toString('base64')
    }

    private static getRelatedClasses(): RelatedDict {
        if ('function' === typeof this.related) {
            return this.related() as RelatedDict
        }

        return this.related as RelatedDict
    }

    private static getValidatorObject(): ValidatorDict {
        if ('function' === typeof this.validation) {
            return this.validation() as ValidatorDict
        }

        return this.validation as ValidatorDict
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
    get<T = any>(key?: string): T {
        if (typeof key !== 'undefined') {
            // Get a value
            const pieces = key.split('.')
            const thisKey = String(pieces.shift())
            const thisValue = this.attributes[thisKey]
            const manager: RelatedManager = this.rel(thisKey)

            if (pieces.length > 0) {
                // We need to go deeper...
                if (!manager) {
                    throw new exceptions.ImproperlyConfiguredError(`No relation found on ${this.toResourceName()}[${thisKey}]. Did you define it on ${this.toResourceName()}.related?`)
                }

                if (!manager.hasValues()) {
                    return undefined
                }

                if (manager.many) {
                    return manager.resources.map((thisResource) => {
                        return thisResource.get(pieces.join('.'))
                    }) as any
                }

                return manager.resource.get(pieces.join('.'))
            } else if (Boolean(thisValue) && manager) {
                // If the related manager is a single object and is inflated, auto resolve the resource.get(key) to that object
                // @todo Maybe we should always return the manager? Or maybe we should always return the resolved object(s)? I am skeptical about this part
                return (!manager.many && manager.resolved ? manager.resource : manager) as any
            } else {
                return thisValue
            }
        } else {
            // We're getting all attributes -- any related resources also get converted to an object
            const managers = Object.keys(this.managers)
            const obj = Object.assign({}, this.attributes)
            while (managers.length) {
                const key = String(managers.shift())
                const manager = this.rel(key)
                if (manager.many) {
                    obj[key] = manager.resources.map((subResource) => subResource.get())
                } else if (!manager.many && manager.resource) {
                    obj[key] = manager.resource.get()
                }
            }
            return obj as T
        }
    }

    /**
     * Persist getting an attribute and get related keys until a key can be found (or not found)
     * TypeError in get() will be thrown, we're just doing the resolveRelated() work for you...
     * @param key
     */
    resolveAttribute<T = any>(key: string): Promise<T> {
        return new Promise((resolve, reject) => {
            try {
                resolve(this.get(key))
            } catch (e) {
                // This is an annoying issue and why I hate using transpilers -- for some reason, we cannot 
                // use e instanceof AttributeError here, because the transpiled AttributeError !== AttributeError
                // at runtime! (faceOfDisapproval.jpg)
                // @ts-ignore 
                if (e.name === 'AttributeError') {
                    const pieces = key.split('.')
                    const thisKey = String(pieces.shift())
                    const manager = this.rel(thisKey)

                    manager.resolve().then(() => {
                        let relatedKey = pieces.join('.')
                        let promises = manager.resources.map((resource: Resource) => {
                            return resource.resolveAttribute(relatedKey)
                        })

                        Promise.all(promises).then((values) => {
                            if (manager.many) {
                                resolve(values as any)
                            } else if (values.length === 1) {
                                resolve(values[0] as any)
                            } else {
                                resolve(values as any)
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
     * Alias of resource.resolveAttribute(key)
     * @param key
     */
    getAsync<T = any>(key: string) {
        return this.resolveAttribute<T>(key)
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
        let Ctor = this.getConstructor()

        if (!_.isEqual(currentValue, newValue)) {
            // Also resolve any related Resources back into foreign keys
            if (newValue && this.rel(key) instanceof RelatedManager) {
                // newValue has an old manager -- needs a new one
                // Create a new RelatedManager
                let manager = this.rel(key).fromValue(newValue)
                newValue = manager.toJSON()
                this.managers[key] = manager
            }

            this.changes[key] = newValue
        }

        if ('undefined' !== typeof Ctor.normalization[key]) {
            let normalizer = <BaseNormalizer | Function & { normalize: () => any }>Ctor.normalization[key]
            if ('function' === typeof normalizer.normalize) {
                newValue = normalizer.normalize(newValue)
            } else if ('function' === typeof normalizer) {
                newValue = normalizer(newValue)
            }

            if (this.changes[key]) {
                this.changes[key] = newValue
            }
        }

        return newValue
    }

    /**
     * Like calling instance.constructor but safer:
     * changing objects down the line won't creep up the prototype chain and end up on native global objects like Function or Object
     */
    getConstructor<T extends typeof Resource>(): T {
        if (this.constructor === Function) {
            // Safe guard in case something goes wrong in subclasses, we don't want to change native Function
            return Resource as T
        }
        return this.constructor as T
    }

    /**
     * Match all related values in `attributes[key]` where key is primary key of related instance defined in `Resource.related[key]`
     * @param options resolveRelatedDict
     */
    resolveRelated({ deep = false, managers = [] }: ResolveRelatedOpts = {}): Promise<void> {
        const promises: Promise<void>[] = []
        for (const resourceKey in this.managers) {
            if (Array.isArray(managers) && managers.length > 0 && !~managers.indexOf(resourceKey)) {
                continue
            }

            const manager = this.rel(resourceKey)
            const promise = manager.resolve().then((objects) => {
                if (deep) {
                    let otherPromises = objects.map((resource) => resource.resolveRelated({ deep, managers }))
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
     * Same as `Resource.prototype.resolveRelated` except `options.deep` defaults to `true`
     * @param options
     */
    resolveRelatedDeep(options?: ResolveRelatedOpts): Promise<void> {
        const opts = Object.assign({ deep: true }, options || {})
        return this.resolveRelated(opts)
    }

    /**
     * Get related manager class by key
     * @param key
     */
    rel<T extends typeof Resource>(key: string) {
        return this.managers[key] as RelatedManager<T>
    }

    /**
     * Create a manager instance on based on current attributes
     * @param relatedKey
     */
    createManagerFor(relatedKey: string) {
        let Ctor = this.getConstructor()
        let related = Ctor.getRelatedClasses()
        let to = related[relatedKey]
        let nested = false

        try {
            if ('object' === typeof to) {
                let relatedLiteral = to as RelatedLiteral
                to = relatedLiteral.to
                nested = !!relatedLiteral.nested
            }

            assert('function' === typeof to, `Couldn't find RelatedResource class with key "${relatedKey}". Does it exist?`)

            let RelatedManagerCtor = to.RelatedManagerClass
            let relatedManager = new RelatedManagerCtor(to, this._attributes[relatedKey])

            if (nested && relatedManager.canAutoResolve()) {
                relatedManager.resolveFromObjectValue()
            }

            return relatedManager
        } catch (e) {
            if (e instanceof assert.AssertionError) {
                e.message = `${e.message} -- Relation: ${this.toResourceName()}.related[${relatedKey}]`
            }

            throw e
        }
    }

    /**
     * Saves the instance -- sends changes as a PATCH or sends whole object as a POST if it's new
     */
    save<T extends this>(options: SaveOptions = {}): Promise<ResourceResponse<T>> {
        let promise
        const Ctor = this.getConstructor()

        let errors = this.validate()
        let fields = options.fields || Ctor.fields

        if (errors.length > 0 && !options.force) {
            throw new exceptions.ValidationError(errors)
        }

        if (this.isNew()) {
            let attrs = fields.length ? _.pick(this.attributes, fields) : this.attributes
            promise = Ctor.client.post(Ctor.getListRoutePath(), attrs)
        } else if (options.partial === false) {
            let attrs = fields.length ? _.pick(this.attributes, fields) : this.attributes
            promise = Ctor.client.put(Ctor.getDetailRoutePath(this.id), attrs)
        } else {
            let attrs = fields.length ? _.pick(this.changes, fields) : this.changes
            promise = Ctor.client.patch(Ctor.getDetailRoutePath(this.id), attrs)
        }

        return promise.then((response: AxiosResponse<T>) => {
            this.changes = {}

            for (const resKey in response.data) {
                this.set(resKey, response.data[resKey])
            }

            if (this.id) {
                // Replace cache
                this.cache(options.replaceCache === false ? false : true)
            }

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
        let errs: Error[] = []
        let validators = this.getConstructor().getValidatorObject()

        let tryFn = (func: ValidatorFunc, key: string) => {
            try {
                // Declare call of validator with params:
                //    attribute, resource, ValidationError class
                func.call(null, this.attributes[key], this, exceptions.ValidationError)
            } catch (e) {
                errs.push(e as Error)
            }
        }

        for (let key in validators) {
            if ('function' === typeof validators[key]) {
                tryFn(validators[key] as ValidatorFunc, key)
            } else if (Array.isArray(validators[key])) {
                let validatorArray = validators[key] as ValidatorFunc[]
                for (let vKey in validatorArray) {
                    tryFn(validatorArray[vKey], key)
                }
            }
        }

        return errs
    }

    update<T extends Resource>(this: T): Promise<T> {
        return this.getConstructor()
            .detail(this.id, { useCache: false })
            .then((resource) => {
                for (let key in resource.attributes) {
                    this.attributes[key] = resource.attributes[key]
                }
            }) as Promise<T>
    }

    delete(options?: RequestConfig) {
        return this.getConstructor().client.delete(this.getConstructor().getDetailRoutePath(this.id), options)
    }

    cache<T extends Resource>(this: T, replace: boolean = false): T {
        this.getConstructor().cacheResource(this, !!replace)
        return this
    }

    getCached<T extends Resource>(this: T) {
        return this.getConstructor().getCached(this.id) as CachedResource<T>
    }

    wrap(relativePath: string, query?: any) {
        assert(relativePath && relativePath[0] === '/', `Relative path "${relativePath}" must start with a "/"`)
        assert(this.id, "Can't look up a relative route on a resource that has not been created yet.")
        let Ctor = this.getConstructor()
        let thisPath = '/' + this.id + relativePath
        return Ctor.wrap(thisPath, query)
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

export type TypeOrFunctionReturningType<T> = (() => T) | T
export type RelatedDict = Record<string, typeof Resource | RelatedLiteral>
export type RelatedDictOrFunction = TypeOrFunctionReturningType<RelatedDict>

export interface RelatedLiteral {
    to: typeof Resource
    nested?: boolean
    // To add later... Eg. "alias?: string"
}

export type ValidatorFunc = (value?: any, resource?: Resource, validationExceptionClass?: typeof exceptions.ValidationError) => void

export type ValidatorDict = Record<string, ValidatorFunc | ValidatorFunc[]>
export type ValidatorDictOrFunction = TypeOrFunctionReturningType<ValidatorDict>

export interface CachedResource<T extends Resource> {
    expires: number
    resource: T
}

export interface SaveOptions {
    partial?: boolean
    replaceCache?: boolean
    force?: boolean
    fields?: any
}

export interface ResolveRelatedOpts {
    managers?: string[]
    deep?: boolean
}

export type ListOpts = RequestConfig & {
    resolveRelated?: boolean
    resolveRelatedDeep?: boolean
}

export type ListResponse<T extends typeof Resource> = Promise<ResourceResponse<InstanceType<T>, any>>

export type DetailOpts = RequestConfig & {
    resolveRelated?: boolean
    resolveRelatedDeep?: boolean
}
