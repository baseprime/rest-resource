import { DefaultClient, RequestConfig, ResourceResponse } from './client';
export declare type ResourceLike<T extends Resource = Resource> = T | Resource;
export declare type ResourceClassLike<T extends typeof Resource = typeof Resource> = T | typeof Resource;
export declare type IterableDict = {
    [index: string]: any;
};
export interface GetRelatedDict {
    deep?: boolean;
    relatedKeys?: string[];
    relatedSubKeys?: string[];
}
export interface ResourceClassDict extends IterableDict {
    [key: string]: ResourceClassLike;
}
export interface ResourceDict<T extends ResourceLike = ResourceLike> {
    [key: string]: T | T[];
}
export interface ValidatorDict extends IterableDict {
    [key: string]: (value?: any, resource?: ResourceLike) => void;
}
export interface CachedResource<T extends ResourceLike = ResourceLike> {
    expires: number;
    resource: T;
}
export interface SaveOptions {
    partial?: boolean;
    replaceCache?: boolean;
    force?: boolean;
}
export default class Resource implements ResourceLike {
    static endpoint: string;
    static cacheMaxAge: number;
    static _cache: any;
    static _client: DefaultClient;
    static _uuid: string;
    static queued: IterableDict;
    static uniqueKey: string;
    static perPage: number | null;
    static defaults: IterableDict;
    static validators: ValidatorDict;
    static related: ResourceClassDict;
    _attributes: IterableDict;
    uuid: string;
    attributes: IterableDict;
    related: ResourceDict;
    changes: IterableDict;
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
    static cacheResource(resource: ResourceLike, replace?: boolean): void;
    /**
     * Replace attributes on a cached resource onto this class' cache for cacheMaxAge seconds (useful for bubbling up changes to states that may be already rendered)
     * @param resource
     */
    static replaceCache(resource: ResourceLike): void;
    /**
     * Get time delta in seconds of cache expiry
     */
    static cacheDeltaSeconds(): number;
    /**
     * Get a cached resource by ID
     * @param id
     */
    static getCached(id: string): CachedResource | undefined;
    static getCachedAll(): CachedResource[];
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
     * @param options HTTP Request Options
     * @returns Promise
     */
    static list(options?: RequestConfig): Promise<ResourceResponse>;
    static detail<T extends ResourceLike = ResourceLike>(id: string, options?: RequestConfig): Promise<T>;
    static getRelated(resource: ResourceLike, { deep, relatedKeys, relatedSubKeys }?: GetRelatedDict): Promise<Resource>;
    static getRelatedDeep(resource: ResourceLike, options?: GetRelatedDict): Promise<Resource>;
    /**
     * Get related class by key
     * @param key
     */
    static rel(key: string): ResourceClassLike;
    static toResourceName(): string;
    static makeDefaultsObject(): any;
    /**
     * Set an attribute of Resource instance and apply getters/setters
     * Do not use Dot Notation here
     * @param key
     * @param value
     */
    set(key: string, value: any): this;
    /**
     * Get an attribute of Resource instance
     * You can use dot notation here -- eg. resource.get('user.username')
     * @param key
     */
    get(key?: string): any;
    /**
     * Persist getting an attribute and get related keys until a key can be found (or not found)
     * TypeError in get() will be thrown, we're just doing the getRelated() work for you...
     * @param key
     */
    getAsync(key: string): Promise<any>;
    /**
     * Translate this.attributes[key] into an internal value
     * Usually this is just setting a key/value but we want to be able to accept
     * anything -- another Resource instance for example. If a Resource instance is
     * provided, set the this.related[key] as the new instance, then set the
     * this.attributes[key] field as just the primary key of the related Resource instance
     * @param key
     * @param value
     */
    toInternalValue(key: string, value: any): any;
    /**
     * Used to check if an incoming attribute (key)'s value should be translated from
     * a Related Resource (defined in Resource.related) to a primary key (the ID)
     * @param key
     * @param value
     */
    shouldTranslateValueToPrimaryKey(key: string, value: any): boolean;
    /**
     * Like calling instance.constructor but safer:
     * changing objects down the line won't creep up the prototype chain and end up on native global objects like Function or Object
     */
    getConstructor(): ResourceClassLike;
    getRelated(options?: GetRelatedDict): Promise<Resource>;
    getRelatedDeep(options?: GetRelatedDict): Promise<Resource>;
    /**
     * Get related class by key
     * @param key
     */
    rel(key: string): typeof Resource;
    /**
     * Saves the instance -- sends changes as a PATCH or sends whole object as a POST if it's new
     */
    save(options?: SaveOptions): Promise<ResourceResponse>;
    /**
     * Validate attributes -- returns empty if no errors exist -- you should throw new errors here
     * @returns `Error[]` Array of Exceptions
     */
    validate(): Error[];
    update(): Promise<Resource>;
    delete(options?: RequestConfig): Promise<any>;
    hasRelatedDefined(relatedKey: string): boolean;
    cache(replace?: boolean): ResourceLike;
    getCached(): CachedResource | undefined;
    isNew(): boolean;
    id: string;
    toString(): string;
    toResourceName(): string;
    toJSON(): any;
}
