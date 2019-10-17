import Resource, { DetailOpts } from '../index';
export declare type RelatedObjectValue = string | string[] | number | number[] | Record<string, any> | Record<string, any>[];
export declare type CollectionValue = Record<string, any>[];
export default class RelatedManager<T extends typeof Resource = typeof Resource> {
    to: T;
    value: RelatedObjectValue;
    many: boolean;
    /**
     * Is `true` when `resolve()` is called and first page of results loads up to `this.batchSize` objects
     */
    resolved: boolean;
    /**
     * Deferred promises when `this.resolve()` hits the max requests in `this.batchSize`
     */
    deferred: (() => Promise<InstanceType<T>>)[];
    /**
     * List of stringified Primary Keys, even if `this.value` is a list of objects, or Resource instances
     */
    primaryKeys: string[];
    /**
     * When sending `this.resolve()`, only send out the first `n` requests where `n` is `this.batchSize`. You
     * can call `this.all()` to recursively get all objects
     */
    batchSize: number;
    _objects: Record<string, InstanceType<T>>;
    constructor(to: T, value: RelatedObjectValue);
    /**
     * Return a constructor so we can guess the content type. For example, if an object literal
     * is passed, this function should return `Object`, and it's likely one single object literal representing attributes.
     * If the constructor is an `Array`, then all we know is that there are many of these sub items (in which case, we're
     * taking the first node of that array and using that node to guess). If it's a `Number`, then it's likely
     * that it's just a primary key. If it's a `Resource` instance, it should return `Resource`. Etc.
     * @returns Function
     */
    getValueContentType(): any;
    /**
     * Get the current value and the content type and turn it into a list of primary keys
     * @returns String
     */
    getPrimaryKeys(): string[];
    /**
     * Get unique key property from object literal and turn it into a string
     * @param object Object
     */
    getIdFromObject(object: any): string;
    /**
     * Get unique key from resource instance
     * @param resource Resource
     */
    getIdFromResource(resource: InstanceType<T>): string;
    /**
     * Get a single resource from the endpoint given an ID
     * @param id String
     */
    getOne(id: string, options?: DetailOpts): Promise<InstanceType<T>>;
    /**
     * Primary function of the RelatedManager -- get some objects (`this.primaryKeys`) related to some
     * other Resource (`this.to` instance). Load the first n objects (`this.batchSize`) and set `this.resolved = true`.
     * Subsequent calls may be required to get all objects in `this.primaryKeys` because there is an inherent
     * limit to how many requests that can be made at one time. If you want to remove this limit, set `this.batchSize` to `Infinity`
     * @param options DetailOpts
     */
    resolve(options?: DetailOpts): Promise<InstanceType<T>[]>;
    /**
     * Calls pending functions in `this.deferred` until it's empty. Runs `this.resolve()` first if it hasn't been ran yet
     * @param options DetailOpts
     */
    all(options?: DetailOpts): Promise<InstanceType<T>[]>;
    /**
     * Add a resource to the manager
     * @param resource Resource instance
     */
    add(resource: InstanceType<T>): void;
    /**
     * Getter -- get `this._objects` but make sure we've actually retrieved the objects first
     * Throws AttributeError if `this.resolve()` hasn't finished
     */
    readonly objects: InstanceType<T>[];
    toJSON(): RelatedObjectValue;
}
