import { DefaultClient, RequestConfig, ResourceResponse } from './client';
import RelatedManager from './related';
export declare type IterableDict = {
    [index: string]: any;
};
export interface ResourceClassDict<T extends typeof Resource = typeof Resource> extends IterableDict {
    [key: string]: T;
}
export interface ResourceDict<T extends Resource = Resource> {
    [key: string]: T | T[];
}
export interface ValidatorDict extends IterableDict {
    [key: string]: (value?: any, resource?: Resource) => void;
}
export interface CachedResource<T extends Resource> {
    expires: number;
    resource: T;
}
export interface SaveOptions {
    partial?: boolean;
    replaceCache?: boolean;
    force?: boolean;
}
export interface GetRelatedOpts {
    managers?: string[];
    deep?: boolean;
}
export declare type ListOpts = RequestConfig & {
    getRelated?: boolean;
};
export declare type DetailOpts = RequestConfig & {
    getRelated?: boolean;
};
export default class Resource {
    static endpoint: string;
    static cacheMaxAge: number;
    static _cache: any;
    static _client: DefaultClient;
    static _uuid: string;
    static queued: Record<string, any>;
    static uniqueKey: string;
    static perPage: number | null;
    static defaults: Record<string, any>;
    static relatedManager: typeof RelatedManager;
    static validators: ValidatorDict;
    static related: ResourceClassDict;
    _attributes: Record<string, any>;
    uuid: string;
    attributes: Record<string, any>;
    managers: Record<string, RelatedManager>;
    changes: Record<string, any>;
    constructor(attributes?: any, options?: any);
    /**
     * Cache getter
     */
    static readonly cache: any;
    static readonly uuid: string;
    /**
     * Cache a resource onto this class' cache for cacheMaxAge seconds
     * @param resource
     * @param replace
     */
    static cacheResource<T extends typeof Resource = typeof Resource>(this: T, resource: InstanceType<T>, replace?: boolean): void;
    /**
     * Replace attributes on a cached resource onto this class' cache for cacheMaxAge seconds (useful for bubbling up changes to states that may be already rendered)
     * @param resource
     */
    static replaceCache<T extends Resource = Resource>(resource: T): void;
    static clearCache(): void;
    /**
     * Get time delta in seconds of cache expiry
     */
    static cacheDeltaSeconds(): number;
    /**
     * Get a cached resource by ID
     * @param id
     */
    static getCached<T extends typeof Resource>(this: T, id: string): CachedResource<InstanceType<T>> | undefined;
    static getCachedAll<T extends typeof Resource>(this: T): CachedResource<InstanceType<T>>[];
    /**
     * Get HTTP client for a resource Class
     * This is meant to be overridden if we want to define a client at any time
     */
    /**
    * Set HTTP client
    * @param client instanceof Client
    */
    static client: DefaultClient;
    /**
     * Get list route path (eg. /users) to be used with HTTP requests and allow a querystring object
     * @param query Querystring
     */
    static getListRoutePath(query?: any): string;
    /**
     * Get detail route path (eg. /users/123) to be used with HTTP requests
     * @param id
     * @param query Querystring
     */
    static getDetailRoutePath(id: string, query?: any): string;
    /**
     * HTTP Get of resource's list route--returns a promise
     * @param options Options object
     * @returns Promise
     */
    static list<T extends typeof Resource = typeof Resource>(this: T, options?: ListOpts): Promise<ResourceResponse<InstanceType<T>>>;
    static detail<T extends typeof Resource = typeof Resource>(this: T, id: string, options?: DetailOpts): Promise<InstanceType<T>>;
    static toResourceName(): string;
    static makeDefaultsObject(): any;
    /**
     * Unique resource hash key used for caching and organizing requests
     * @param resourceId
     */
    static getResourceHashKey(resourceId: string): string;
    static extend<T, U>(this: U, classProps: T): U & T;
    /**
     * Set an attribute of Resource instance and apply getters/setters
     * Do not use Dot Notation here
     * @param key
     * @param value
     */
    set(key: string, value: any): this;
    /**
     * Get an attribute of Resource instance
     * You can use dot notation here -- eg. `resource.get('user.username')`
     * You can also get all properties by not providing any arguments
     * @param? key
     */
    get(key?: string): any;
    /**
     * Persist getting an attribute and get related keys until a key can be found (or not found)
     * TypeError in get() will be thrown, we're just doing the getRelated() work for you...
     * @param key
     */
    getAsync(key: string): Promise<any>;
    /**
     * Setter -- Translate new value into an internal value onto this._attributes[key]
     * Usually this is just setting a key/value but we want to be able to accept
     * anything -- another Resource instance for example. If a Resource instance is
     * provided, set the this.managers[key] as the new manager instance, then set the
     * this.attributes[key] field as just the primary key of the related Resource instance
     * @param key
     * @param value
     */
    toInternalValue(key: string, value: any): any;
    /**
     * Like calling instance.constructor but safer:
     * changing objects down the line won't creep up the prototype chain and end up on native global objects like Function or Object
     */
    getConstructor<T extends typeof Resource = typeof Resource>(): T;
    /**
     * Match all related values in `attributes[key]` where key is primary key of related instance defined in `Resource.related[key]`
     * @param options GetRelatedDict
     */
    getRelated({ deep, managers }?: GetRelatedOpts): Promise<void>;
    /**
     * Same as `Resource.prototype.getRelated` except `options.deep` defaults to `true`
     * @param options
     */
    getRelatedDeep(options?: GetRelatedOpts): Promise<void>;
    /**
     * Get related class by key
     * @param key
     */
    rel(key: string): RelatedManager<typeof Resource>;
    /**
     * Saves the instance -- sends changes as a PATCH or sends whole object as a POST if it's new
     */
    save<T extends this>(options?: SaveOptions): Promise<ResourceResponse<T>>;
    /**
     * Validate attributes -- returns empty if no errors exist -- you should throw new errors here
     * @returns `Error[]` Array of Exceptions
     */
    validate(): Error[];
    update<T extends Resource = Resource>(this: T): Promise<T>;
    delete(options?: RequestConfig): Promise<any>;
    cache<T extends Resource = Resource>(this: T, replace?: boolean): T;
    getCached<T extends Resource = Resource>(this: T): CachedResource<T>;
    isNew(): boolean;
    id: string;
    toString(): string;
    toResourceName(): string;
    toJSON(): any;
}
