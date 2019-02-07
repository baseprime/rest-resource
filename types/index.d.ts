import Client from './client';
import { RequestOptions } from './client';
export declare type ResourceLike<T extends Resource = Resource> = T | Resource;
export declare type ResourceCtorLike<T extends typeof Resource = typeof Resource> = T | typeof Resource;
export interface ResourceResponse<T extends ResourceLike = ResourceLike> {
    objects: T[];
    response: any;
    count?: number;
    previous?: () => ResourceResponse<T>;
    next?: () => ResourceResponse<T>;
}
export interface GetRelatedDict {
    deep?: boolean;
    relatedKeys?: string[];
    relatedSubKeys?: string[];
}
export interface ResourceClassDict {
    [key: string]: ResourceCtorLike;
}
export interface ResourceDict<T extends ResourceLike = ResourceLike> {
    [key: string]: T | T[];
}
export interface CachedResource<T extends ResourceLike = ResourceLike> {
    expires: number;
    resource: T;
}
export default class Resource implements ResourceLike {
    static endpoint: string;
    static cacheMaxAge: number;
    static data: any;
    static _cache: any;
    static _client: Client;
    static queued: any;
    static uniqueKey: string;
    static defaults: any;
    static related: ResourceClassDict;
    _attributes: any;
    attributes: any;
    related: ResourceDict;
    changes: any;
    constructor(attributes?: any, options?: any);
    /**
     * Cache getter
     */
    static readonly cache: any;
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
    static getClient(): Client;
    /**
     * Set HTTP client
     * @param client instanceof Client
     */
    static setClient(client: Client): void;
    /**
     * Get list route path (eg. /users) to be used with HTTP requests and allow a querystring object
     * @param query Querystring
     */
    static listRoutePath(query?: RequestOptions['query']): string;
    /**
     * Get detail route path (eg. /users/123) to be used with HTTP requests
     * @param id
     * @param query Querystring
     */
    static detailRoutePath(id: string, query?: RequestOptions['query']): string;
    /**
     * HTTP Get of resource's list route--returns a promise
     * @param options HTTP Request Options
     * @returns Promise
     */
    static list<T extends ResourceLike = ResourceLike>(options?: RequestOptions): Promise<ResourceLike<T>[]>;
    static detail<T extends ResourceLike = ResourceLike>(id: string, options?: RequestOptions): Promise<T>;
    static getDetailRoute<T extends ResourceLike = ResourceLike>(id: string, options?: RequestOptions): Promise<ResourceResponse<ResourceLike<T>>>;
    static getListRoute<T extends ResourceLike = ResourceLike>(options?: RequestOptions): Promise<ResourceResponse<ResourceLike<T>>>;
    static parseResponse<T extends ResourceLike = ResourceLike>(result: any): ResourceResponse<T>;
    static getRelated(resource: ResourceLike, { deep, relatedKeys, relatedSubKeys }?: GetRelatedDict): Promise<ResourceDict>;
    static getRelatedDeep(resource: ResourceLike, options?: GetRelatedDict): Promise<ResourceDict<Resource>>;
    /**
     * Get related class by key
     * @param key
     */
    static rel(key: string): typeof Resource;
    static toResourceName(): string;
    static getIdFromAttributes(attributes: any): string;
    attr(key?: string, value?: any): any;
    /**
     * Persist getting an attribute and get related keys until a key can be found (or not found)
     * TypeError in attr() will be thrown, we're just doing the getRelated() work for you...
     * @param key
     */
    getAttr(key: string): Promise<any>;
    /**
     * Directly sets a value onto instance._attributes
     * @param key
     * @param value
     */
    setValueDirect(key: string, value: any): void;
    /**
     * Like calling instance.constructor but safer:
     * changing objects down the line won't creep up the prototype chain and end up on native global objects like Function or Object
     */
    getConstructor(): ResourceCtorLike;
    getRelated(options?: GetRelatedDict): Promise<ResourceDict>;
    getRelatedDeep(options?: GetRelatedDict): Promise<ResourceDict>;
    /**
     * Get related class by key
     * @param key
     */
    rel(key: string): typeof Resource;
    /**
     * Saves the instance -- sends changes as a PATCH or sends whole object as a POST if it's new
     */
    save(): Promise<ResourceLike>;
    update(): Promise<Resource>;
    hasRelatedDefined(relatedKey: string): boolean;
    cache(replace?: boolean): ResourceLike;
    getCached(): CachedResource | undefined;
    id: string;
    toString(): string;
    toResourceName(): string;
    toJSON(): any;
}
