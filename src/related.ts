import Resource, { DetailOpts } from './index'
import { first as _first } from 'lodash'
import assert from 'assert'
import { AttributeError } from './exceptions'
export type RelatedObjectValue = string | string[] | number | number[] | Record<string, any> | Record<string, any>[]
export type CollectionValue = Record<string, any>[]

export default class RelatedManager<T extends typeof Resource = typeof Resource> {
    to: T
    value: RelatedObjectValue
    many: boolean = false
    /**
     * Is `true` when `resolve()` is called and first page of results loads up to `this.batchSize` objects
     */
    resolved: boolean = false
    /**
     * Deferred promises when `this.resolve()` hits the max requests in `this.batchSize`
     */
    deferred: (() => Promise<InstanceType<T>>)[] = []
    /**
     * List of stringified Primary Keys, even if `this.value` is a list of objects, or Resource instances
     */
    primaryKeys: string[]
    /**
     * When sending `this.resolve()`, only send out the first `n` requests where `n` is `this.batchSize`. You
     * can call `this.all()` to recursively get all objects
     */
    batchSize: number = Infinity
    _objects: Record<string, InstanceType<T>> = {}

    constructor(to: T, value: RelatedObjectValue) {
        assert(typeof to === 'function', `Can't use RelatedManager without Resource class: received ${to}`)
        this.to = to
        this.value = value
        this.many = Array.isArray(value)
        this.primaryKeys = this.getPrimaryKeys()

        if (!this.value || (this.many && !Object.keys(this.value).length)) {
            this.resolved = true
        }
    }

    /**
     * Return a constructor so we can guess the content type. For example, if an object literal 
     * is passed, this function should return `Object`, and it's likely one single object literal representing attributes. 
     * If the constructor is an `Array`, then all we know is that there are many of these sub items (in which case, we're 
     * taking the first node of that array and using that node to guess). If it's a `Number`, then it's likely 
     * that it's just a primary key. If it's a `Resource` instance, it should return `Resource`. Etc.
     * @returns Function
     */
    getValueContentType() {
        let node = _first([].concat(this.value))
        let Ctor = node.constructor
        if (Ctor.prototype instanceof Resource) {
            return Resource
        } else {
            return Ctor
        }
    }

    /**
     * Get the current value and the content type and turn it into a list of primary keys
     * @returns String
     */
    getPrimaryKeys(): string[] {
        if (!Boolean(this.value) || (Array.isArray(this.value) && !this.value.length)) {
            return []
        }

        let contentType = this.getValueContentType()
        let iterValue = this.value as any[]

        if (this.many) {
            if (contentType === Resource) {
                return iterValue.map((resource: InstanceType<T>) => this.getIdFromResource(resource))
            } else if (this.many && contentType === Object) {
                return iterValue.map((record) => this.getIdFromObject(record))
            } else {
                return this.value as string[]
            }
        } else {
            if (contentType === Resource) {
                return [this.getIdFromResource(this.value as InstanceType<T>)]
            } else if (contentType === Object) {
                return [this.getIdFromObject(this.value)]
            } else {
                return [this.value as string]
            }
        }
    }

    /**
     * Get unique key property from object literal and turn it into a string
     * @param object Object
     */
    getIdFromObject(object: any): string {
        return String(object[this.to.uniqueKey])
    }

    /**
     * Get unique key from resource instance
     * @param resource Resource
     */
    getIdFromResource(resource: InstanceType<T>) {
        return resource.id
    }

    /**
     * Get a single resource from the endpoint given an ID
     * @param id String
     */
    getOne(id: string, options?: DetailOpts): Promise<InstanceType<T>> {
        return this.to.detail<T>(id, options).then((resource: InstanceType<T>) => {
            assert(resource.getConstructor().toResourceName() == this.to.toResourceName(), `Related class detail() returned invalid instance: ${resource.toResourceName()} (returned) !== ${this.to.toResourceName()} (expected)`)
            this._objects[resource.id] = resource
            return resource
        })
    }

    /**
     * Primary function of the RelatedManager -- get some objects (`this.primaryKeys`) related to some 
     * other Resource (`this.to` instance). Load the first n objects (`this.batchSize`) and set `this.resolved = true`. 
     * Subsequent calls may be required to get all objects in `this.primaryKeys` because there is an inherent 
     * limit to how many requests that can be made at one time. If you want to remove this limit, set `this.batchSize` to `Infinity`
     * @param options DetailOpts
     */
    async resolve(options?: DetailOpts): Promise<InstanceType<T>[]> {
        const promises: Promise<any>[] = []
        this.deferred = []

        for (let i in this.primaryKeys) {
            let pk = this.primaryKeys[i]

            if (Number(i) > this.batchSize) {
                this.deferred.push(this.getOne.bind(this, pk, options))
            } else {
                promises.push(this.getOne(pk, options))
            }
        }

        await Promise.all(promises)
        this.resolved = true
        return Object.values(this.objects)
    }

    async next(options?: DetailOpts): Promise<InstanceType<T>[]> {
        const promises: Promise<InstanceType<T>>[] = []

        if (!this.resolved) {
            return await this.resolve(options)
        }

        // Take 0 to n items from this.deferred where n is this.batchSize
        this.deferred.splice(0, this.batchSize).forEach((deferredFn) => {
            promises.push(deferredFn())
        })

        return await Promise.all(promises)
    }

    /**
     * Calls pending functions in `this.deferred` until it's empty. Runs `this.resolve()` first if it hasn't been ran yet
     * @param options DetailOpts
     */
    async all(options?: DetailOpts): Promise<InstanceType<T>[]> {
        await this.next(options)

        if (this.deferred.length) {
            // Still have some left
            return await this.all(options)
        } else {
            return Object.values(this.objects)
        }
    }

    /**
     * Add a resource to the manager
     * @param resource Resource instance
     */
    add(resource: InstanceType<T>) {
        assert(this.many, `Related Manager "many" must be true to add()`)
        assert(resource.id, `Resource must be saved before adding to Related Manager`)
        assert(resource.getConstructor() === this.to, `Related Manager add() expected ${this.to.toResourceName()}, received ${resource.getConstructor().toResourceName()}`)
        const ContentCtor = this.getValueContentType()
        var value
        if (ContentCtor === Object) {
            value = resource.toJSON()
        } else if (ContentCtor === Number || ContentCtor === String) {
            value = resource.id
        }

        ;(this.value as any[]).push(value)
        this._objects[resource.id] = resource
    }

    /**
     * Getter -- get `this._objects` but make sure we've actually retrieved the objects first
     * Throws AttributeError if `this.resolve()` hasn't finished
     */
    get objects(): InstanceType<T>[] {
        if (!this.resolved) {
            throw new AttributeError(`Can't read results of ${this.constructor.name}[objects], ${this.to.toResourceName()} must resolve() first`)
        }

        const allObjects = Object.values(this._objects)

        return allObjects
    }

    get length(): number {
        return this.primaryKeys.length
    }

    toJSON() {
        return this.value
    }
}
