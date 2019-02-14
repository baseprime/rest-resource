# Documentation

## Resource class

```typescript
static endpoint: string;
static cacheMaxAge: number;
static data: any;
static _cache: any;
static _client: DefaultClient;
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
static getClient(): DefaultClient;
/**
 * Set HTTP client
 * @param client instanceof Client
 */
static setClient(client: DefaultClient): void;
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
static list<T extends ResourceLike = ResourceLike>(options?: RequestConfig): Promise<ResourceLike<T>[]>;
static detail<T extends ResourceLike = ResourceLike>(id: string, options?: RequestConfig): Promise<T>;
static getDetailRoute<T extends ResourceLike = ResourceLike>(id: string, options?: RequestConfig): Promise<ResourceResponse<ResourceLike<T>>>;
static getListRoute<T extends ResourceLike = ResourceLike>(options?: RequestConfig): Promise<ResourceResponse<ResourceLike<T>>>;
static extractObjectsFromResponse<T extends ResourceLike = ResourceLike>(result: any): ResourceResponse<T>;
static getRelated(resource: ResourceLike, { deep, relatedKeys, relatedSubKeys }?: GetRelatedDict): Promise<Resource>;
static getRelatedDeep(resource: ResourceLike, options?: GetRelatedDict): Promise<Resource>;
/**
 * Get related class by key
 * @param key
 */
static rel(key: string): typeof Resource;
static toResourceName(): string;
/**
 * Set an attribute of Resource instance
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
 * Mutate key/value on this.attributes[key] into an internal value
 * Usually this is just setting a key/value but we want to be able to accept
 * anything -- another Resource instance for example. If a Resource instance is
 * provided, set the this.related[key] as the new instance, then set the
 * this.attributes[key] field as just the primary key of the related Resource instance
 * @param key
 * @param value
 */
toInternalValue(key: string, value: any): any;
/**
 * Like toInternalValue except the other way around
 * @param key
 */
fromInternalValue(key: string): any;
/**
 * Like calling instance.constructor but safer:
 * changing objects down the line won't creep up the prototype chain and end up on native global objects like Function or Object
 */
getConstructor(): ResourceCtorLike;
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

-   [Resource][1]
    -   [set][2]
        -   [Parameters][3]
    -   [get][4]
        -   [Parameters][5]
    -   [getAsync][6]
        -   [Parameters][7]
    -   [toInternalValue][8]
        -   [Parameters][9]
    -   [fromInternalValue][10]
        -   [Parameters][11]
    -   [getConstructor][12]
    -   [rel][13]
        -   [Parameters][14]
    -   [save][15]
    -   [cacheResource][16]
        -   [Parameters][17]
    -   [replaceCache][18]
        -   [Parameters][19]
    -   [cacheDeltaSeconds][20]
    -   [getCached][21]
        -   [Parameters][22]
    -   [getClient][23]
    -   [setClient][24]
        -   [Parameters][25]
    -   [getListRoutePath][26]
        -   [Parameters][27]
    -   [getDetailRoutePath][28]
        -   [Parameters][29]
    -   [list][30]
        -   [Parameters][31]
    -   [rel][32]
        -   [Parameters][33]
-   [get][34]
-   [Error][35]
-   [Error][36]
-   [TypeError][37]

## Resource

### set

Set an attribute of Resource instance

#### Parameters

-   `key`  
-   `value`  

### get

Get an attribute of Resource instance
You can use dot notation here -- eg. resource.get('user.username')

#### Parameters

-   `key`  

### getAsync

Persist getting an attribute and get related keys until a key can be found (or not found)
TypeError in get() will be thrown, we're just doing the getRelated() work for you...

#### Parameters

-   `key`  

### toInternalValue

Mutate key/value on this.attributes[key] into an internal value
Usually this is just setting a key/value but we want to be able to accept
anything -- another Resource instance for example. If a Resource instance is
provided, set the this.related[key] as the new instance, then set the
this.attributes[key] field as just the primary key of the related Resource instance

#### Parameters

-   `key`  
-   `value`  

### fromInternalValue

Like toInternalValue except the other way around

#### Parameters

-   `key`  

### getConstructor

Like calling instance.constructor but safer:
changing objects down the line won't creep up the prototype chain and end up on native global objects like Function or Object

### rel

Get related class by key

#### Parameters

-   `key`  

### save

Saves the instance -- sends changes as a PATCH or sends whole object as a POST if it's new

### cacheResource

Cache a resource onto this class' cache for cacheMaxAge seconds

#### Parameters

-   `resource`  
-   `replace`  

### replaceCache

Replace attributes on a cached resource onto this class' cache for cacheMaxAge seconds (useful for bubbling up changes to states that may be already rendered)

#### Parameters

-   `resource`  

### cacheDeltaSeconds

Get time delta in seconds of cache expiry

### getCached

Get a cached resource by ID

#### Parameters

-   `id`  

### getClient

Get HTTP client for a resource Class
This is meant to be overridden if we want to define a client at any time

### setClient

Set HTTP client

#### Parameters

-   `client`  instanceof Client

### getListRoutePath

Get list route path (eg. /users) to be used with HTTP requests and allow a querystring object

#### Parameters

-   `query`  Querystring

### getDetailRoutePath

Get detail route path (eg. /users/123) to be used with HTTP requests

#### Parameters

-   `id`  
-   `query`  Querystring

### list

HTTP Get of resource's list route--returns a promise

#### Parameters

-   `options`  HTTP Request Options

Returns **any** Promise

### rel

Get related class by key

#### Parameters

-   `key`  

## get

Cache getter

## Error

## Error

## TypeError

[1]: #resource

[2]: #set

[3]: #parameters

[4]: #get

[5]: #parameters-1

[6]: #getasync

[7]: #parameters-2

[8]: #tointernalvalue

[9]: #parameters-3

[10]: #frominternalvalue

[11]: #parameters-4

[12]: #getconstructor

[13]: #rel

[14]: #parameters-5

[15]: #save

[16]: #cacheresource

[17]: #parameters-6

[18]: #replacecache

[19]: #parameters-7

[20]: #cachedeltaseconds

[21]: #getcached

[22]: #parameters-8

[23]: #getclient

[24]: #setclient

[25]: #parameters-9

[26]: #getlistroutepath

[27]: #parameters-10

[28]: #getdetailroutepath

[29]: #parameters-11

[30]: #list

[31]: #parameters-12

[32]: #rel-1

[33]: #parameters-13

[34]: #get-1

[35]: #error

[36]: #error-1

[37]: #typeerror