# Documentation

## Resource class

```typescript
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
static list(options?: RequestOptions): Promise<ResourceLike<T>[]>;
static detail(id: string, options?: RequestOptions): Promise<T>;
static getDetailRoute(id: string, options?: RequestOptions): Promise<ResourceResponse<ResourceLike<T>>>;
static getListRoute(options?: RequestOptions): Promise<ResourceResponse<ResourceLike<T>>>;
static parseResponse(result: any): ResourceResponse<T>;
static getRelated(resource: ResourceLike, { deep, relatedKeys, relatedSubKeys }?: GetRelatedDict): Promise<ResourceDict>;
static getRelatedDeep(resource: ResourceLike, options?: GetRelatedDict): Promise<ResourceDict<Resource>>;
static toResourceName(): string;
static getIdFromAttributes(attributes: any): string;
attr(key?: string, value?: any): any;
/**
 * Persist getting an attribute and get related keys until a key can be found (or not found)
 * TypeError in attr() will be thrown, we're just doing the getRelated() work for you...
 * @param key
 */
getAttr(key: string): Promise<any>;
getConstructor(): ResourceCtorLike;
getRelated(options?: GetRelatedDict): Promise<ResourceDict>;
getRelatedDeep(options?: GetRelatedDict): Promise<ResourceDict>;
save(): Promise<ResourceLike>;
update(): Promise<Resource>;
hasRelatedDefined(relatedKey: string): boolean;
cache(replace?: boolean): ResourceLike;
getCached(): CachedResource | undefined;
id: string;
toString(): string;
toResourceName(): string;
toJSON(): any;
```

### Table of Contents

- [getAttr][1]
  - [Parameters][2]
- [cache][3]
- [cacheResource][4]
  - [Parameters][5]
- [replaceCache][6]
  - [Parameters][7]
- [cacheDeltaSeconds][8]
- [getCached][9]
  - [Parameters][10]
- [getClient][11]
- [setClient][12]
  - [Parameters][13]
- [listRoutePath][14]
  - [Parameters][15]
- [detailRoutePath][16]
  - [Parameters][17]
- [list][18]
  - [Parameters][19]

## getAttr

Persist getting an attribute and get related keys until a key can be found (or not found)
TypeError in attr() will be thrown, we're just doing the getRelated() work for you...

### Parameters

- `key`  

## cache

Cache getter

## cacheResource

Cache a resource onto this class' cache for cacheMaxAge seconds

### Parameters

- `resource`  
- `replace`  

## replaceCache

Replace attributes on a cached resource onto this class' cache for cacheMaxAge seconds (useful for bubbling up changes to states that may be already rendered)

### Parameters

- `resource`  

## cacheDeltaSeconds

Get time delta in seconds of cache expiry

## getCached

Get a cached resource by ID

### Parameters

- `id`  

## getClient

Get HTTP client for a resource Class
This is meant to be overridden if we want to define a client at any time

## setClient

Set HTTP client

### Parameters

- `client`  instanceof Client

## listRoutePath

Get list route path (eg. /users) to be used with HTTP requests and allow a querystring object

### Parameters

- `query`  Querystring

## detailRoutePath

Get detail route path (eg. /users/123) to be used with HTTP requests

### Parameters

- `id`  
- `query`  Querystring

## list

HTTP Get of resource's list route--returns a promise

### Parameters

- `options`  HTTP Request Options

Returns **any** Promise

[1]: #getattr

[2]: #parameters

[3]: #cache

[4]: #cacheresource

[5]: #parameters-1

[6]: #replacecache

[7]: #parameters-2

[8]: #cachedeltaseconds

[9]: #getcached

[10]: #parameters-3

[11]: #getclient

[12]: #setclient

[13]: #parameters-4

[14]: #listroutepath

[15]: #parameters-5

[16]: #detailroutepath

[17]: #parameters-6

[18]: #list

[19]: #parameters-7