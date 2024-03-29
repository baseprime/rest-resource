import { DefaultClient, RequestConfig, ResourceResponse } from './client';
import RelatedManager from './related';
import { NormalizerDict } from './helpers/normalization';
import * as exceptions from './exceptions';
export default class Resource {
    static endpoint: string;
    static cacheMaxAge: number;
    static client: DefaultClient;
    static queued: Record<string, any>;
    static uniqueKey: string;
    static defaults: Record<string, any>;
    static RelatedManagerClass: typeof RelatedManager;
    static validation: ValidatorDictOrFunction;
    static normalization: NormalizerDict;
    static fields: string[];
    static related: RelatedDictOrFunction;
    static _cache: any;
    static _uuid: string;
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
    static cacheResource<T extends typeof Resource>(this: T, resource: InstanceType<T>, replace?: boolean): void;
    /**
     * Replace attributes on a cached resource onto this class' cache for cacheMaxAge seconds (useful for bubbling up changes to states that may be already rendered)
     * @param resource
     */
    static replaceCache<T extends Resource>(resource: T): void;
    static clearCache(): void;
    /**
     * Get time delta in seconds of cache expiry
     */
    static cacheDeltaSeconds(): number;
    /**
     * Get a cached resource by ID
     * @param id
     */
    static getCached<T extends typeof Resource>(this: T, id: string | number): CachedResource<InstanceType<T>> | undefined;
    static getCachedAll<T extends typeof Resource>(this: T): CachedResource<InstanceType<T>>[];
    /**
     * Backwards compatibility
     * Remove in next major release @todo
     */
    /**
    * Backwards compatibility
    * Remove in next major release @todo
    */
    static validators: any;
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
    static getDetailRoutePath(id: string | number, query?: any): string;
    /**
     * HTTP Get of resource's list route--returns a promise
     * @param options Options object
     * @returns Promise
     */
    static list<T extends typeof Resource>(this: T, options?: ListOpts): ListResponse<T>;
    static detail<T extends typeof Resource>(this: T, id: string | number, options?: DetailOpts): Promise<InstanceType<T>>;
    static wrap(relativePath: string, query?: any): {
        get: (options?: import("axios").AxiosRequestConfig) => import("axios").AxiosPromise<{}>;
        post: (body?: any, options?: import("axios").AxiosRequestConfig) => import("axios").AxiosPromise<{}>;
        put: (body?: any, options?: import("axios").AxiosRequestConfig) => import("axios").AxiosPromise<{}>;
        patch: (body?: any, options?: import("axios").AxiosRequestConfig) => import("axios").AxiosPromise<{}>;
        head: (options?: import("axios").AxiosRequestConfig) => import("axios").AxiosPromise<{}>;
        options: (options?: import("axios").AxiosRequestConfig) => import("axios").AxiosPromise<{}>;
        /**
         * Get a cached resource by ID
         * @param id
         */
        delete: (options?: import("axios").AxiosRequestConfig) => import("axios").AxiosPromise<{}>;
    };
    static toResourceName(): string;
    static makeDefaultsObject(): any;
    /**
     * Unique resource hash key used for caching and organizing requests
     * @param resourceId
     */
    static getResourceHashKey(resourceId: string | number): string;
    private static getRelatedClasses;
    private static getValidatorObject;
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
    get<T = any>(key?: string): T;
    /**
     * Persist getting an attribute and get related keys until a key can be found (or not found)
     * TypeError in get() will be thrown, we're just doing the resolveRelated() work for you...
     * @param key
     */
    resolveAttribute<T = any>(key: string): Promise<T>;
    /**
     * Alias of resource.resolveAttribute(key)
     * @param key
     */
    getAsync<T = any>(key: string): Promise<T>;
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
    getConstructor<T extends typeof Resource>(): T;
    /**
     * Match all related values in `attributes[key]` where key is primary key of related instance defined in `Resource.related[key]`
     * @param options resolveRelatedDict
     */
    resolveRelated({ deep, managers }?: ResolveRelatedOpts): Promise<void>;
    /**
     * Same as `Resource.prototype.resolveRelated` except `options.deep` defaults to `true`
     * @param options
     */
    resolveRelatedDeep(options?: ResolveRelatedOpts): Promise<void>;
    /**
     * Get related manager class by key
     * @param key
     */
    rel<T extends typeof Resource>(key: string): RelatedManager<T>;
    /**
     * Create a manager instance on based on current attributes
     * @param relatedKey
     */
    createManagerFor(relatedKey: string): RelatedManager<typeof Resource>;
    /**
     * Saves the instance -- sends changes as a PATCH or sends whole object as a POST if it's new
     */
    save<T extends this>(options?: SaveOptions): Promise<ResourceResponse<T>>;
    /**
     * Validate attributes -- returns empty if no errors exist -- you should throw new errors here
     * @returns `Error[]` Array of Exceptions
     */
    validate(): Error[];
    update<T extends Resource>(this: T): Promise<T>;
    delete(options?: RequestConfig): import("axios").AxiosPromise<any>;
    cache<T extends Resource>(this: T, replace?: boolean): T;
    getCached<T extends Resource>(this: T): CachedResource<T>;
    wrap(relativePath: string, query?: any): {
        get: (options?: import("axios").AxiosRequestConfig) => import("axios").AxiosPromise<{}>;
        post: (body?: any, options?: import("axios").AxiosRequestConfig) => import("axios").AxiosPromise<{}>;
        put: (body?: any, options?: import("axios").AxiosRequestConfig) => import("axios").AxiosPromise<{}>;
        patch: (body?: any, options?: import("axios").AxiosRequestConfig) => import("axios").AxiosPromise<{}>;
        head: (options?: import("axios").AxiosRequestConfig) => import("axios").AxiosPromise<{}>;
        options: (options?: import("axios").AxiosRequestConfig) => import("axios").AxiosPromise<{}>;
        /**
         * Get a cached resource by ID
         * @param id
         */
        delete: (options?: import("axios").AxiosRequestConfig) => import("axios").AxiosPromise<{}>;
    };
    isNew(): boolean;
    id: string;
    toString(): string;
    toResourceName(): string;
    toJSON(): any;
}
export declare type TypeOrFunctionReturningType<T> = (() => T) | T;
export declare type RelatedDict = Record<string, typeof Resource | RelatedLiteral>;
export declare type RelatedDictOrFunction = TypeOrFunctionReturningType<RelatedDict>;
export interface RelatedLiteral {
    to: typeof Resource;
    nested?: boolean;
}
export declare type ValidatorFunc = (value?: any, resource?: Resource, validationExceptionClass?: typeof exceptions.ValidationError) => void;
export declare type ValidatorDict = Record<string, ValidatorFunc | ValidatorFunc[]>;
export declare type ValidatorDictOrFunction = TypeOrFunctionReturningType<ValidatorDict>;
export interface CachedResource<T extends Resource> {
    expires: number;
    resource: T;
}
export interface SaveOptions {
    partial?: boolean;
    replaceCache?: boolean;
    force?: boolean;
    fields?: any;
}
export interface ResolveRelatedOpts {
    managers?: string[];
    deep?: boolean;
}
export declare type ListOpts = RequestConfig & {
    resolveRelated?: boolean;
    resolveRelatedDeep?: boolean;
};
export declare type ListResponse<T extends typeof Resource> = Promise<ResourceResponse<InstanceType<T>, any>>;
export declare type DetailOpts = RequestConfig & {
    resolveRelated?: boolean;
    resolveRelatedDeep?: boolean;
};
