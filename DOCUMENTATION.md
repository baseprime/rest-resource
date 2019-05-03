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
    -   [shouldTranslateValueToPrimaryKey][10]
        -   [Parameters][11]
    -   [getConstructor][12]
    -   [rel][13]
        -   [Parameters][14]
    -   [save][15]
        -   [Parameters][16]
    -   [validate][17]
    -   [cacheResource][18]
        -   [Parameters][19]
    -   [replaceCache][20]
        -   [Parameters][21]
    -   [cacheDeltaSeconds][22]
    -   [getCached][23]
        -   [Parameters][24]
    -   [getListRoutePath][25]
        -   [Parameters][26]
    -   [getDetailRoutePath][27]
        -   [Parameters][28]
    -   [list][29]
        -   [Parameters][30]
    -   [rel][31]
        -   [Parameters][32]
-   [get][33]
-   [get][34]
-   [set][35]
    -   [Parameters][36]
-   [DefaultClient][37]
-   [DefaultClient][38]
-   [camelize][39]
    -   [Parameters][40]
-   [uuidWeak][41]
-   [Error][42]
-   [BaseError][43]
    -   [isInstance][44]
        -   [Parameters][45]
-   [BaseError][46]
    -   [isInstance][47]
        -   [Parameters][48]
-   [BaseError][49]
    -   [isInstance][50]
        -   [Parameters][51]
-   [BaseError][52]
    -   [isInstance][53]
        -   [Parameters][54]

## Resource

### set

Set an attribute of Resource instance and apply getters/setters
Do not use Dot Notation here

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

Translate this.attributes[key] into an internal value
Usually this is just setting a key/value but we want to be able to accept
anything -- another Resource instance for example. If a Resource instance is
provided, set the this.related[key] as the new instance, then set the
this.attributes[key] field as just the primary key of the related Resource instance

#### Parameters

-   `key`  
-   `value`  

### shouldTranslateValueToPrimaryKey

Used to check if an incoming attribute (key)'s value should be translated from
a Related Resource (defined in Resource.related) to a primary key (the ID)

#### Parameters

-   `key`  
-   `value`  

### getConstructor

Like calling instance.constructor but safer:
changing objects down the line won't creep up the prototype chain and end up on native global objects like Function or Object

### rel

Get related class by key

#### Parameters

-   `key`  

### save

Saves the instance -- sends changes as a PATCH or sends whole object as a POST if it's new

#### Parameters

-   `options`  

### validate

Validate attributes -- returns empty if no errors exist -- you should throw new errors here

Returns **any** `Error[]` Array of Exceptions

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

## get

Get HTTP client for a resource Class
This is meant to be overridden if we want to define a client at any time

## set

Set HTTP client

### Parameters

-   `client`  instanceof Client

## DefaultClient

## DefaultClient

## camelize

Takes an input and camelizes it

### Parameters

-   `str`  

## uuidWeak

This is a very quick and primitive implementation of RFC 4122 UUID
Creates a basic variant UUID
Warning: Shouldn't be used of N >> 1e9

## Error

## BaseError

### isInstance

This exists because Webpack creates a whole new copy of this class, except when you're
  comparing types in memory (eg. exception instanceof ValidationError) where exception is
  a transpiled instance of this class, and ValidationError is imported via non-transpiled
  methods (TypeScript). We need a way to check if either are instanceof ValidationError

#### Parameters

-   `exception`  

## BaseError

### isInstance

This exists because Webpack creates a whole new copy of this class, except when you're
  comparing types in memory (eg. exception instanceof ValidationError) where exception is
  a transpiled instance of this class, and ValidationError is imported via non-transpiled
  methods (TypeScript). We need a way to check if either are instanceof ValidationError

#### Parameters

-   `exception`  

## BaseError

### isInstance

This exists because Webpack creates a whole new copy of this class, except when you're
  comparing types in memory (eg. exception instanceof ValidationError) where exception is
  a transpiled instance of this class, and ValidationError is imported via non-transpiled
  methods (TypeScript). We need a way to check if either are instanceof ValidationError

#### Parameters

-   `exception`  

## BaseError

### isInstance

This exists because Webpack creates a whole new copy of this class, except when you're
  comparing types in memory (eg. exception instanceof ValidationError) where exception is
  a transpiled instance of this class, and ValidationError is imported via non-transpiled
  methods (TypeScript). We need a way to check if either are instanceof ValidationError

#### Parameters

-   `exception`  

[1]: #resource

[2]: #set

[3]: #parameters

[4]: #get

[5]: #parameters-1

[6]: #getasync

[7]: #parameters-2

[8]: #tointernalvalue

[9]: #parameters-3

[10]: #shouldtranslatevaluetoprimarykey

[11]: #parameters-4

[12]: #getconstructor

[13]: #rel

[14]: #parameters-5

[15]: #save

[16]: #parameters-6

[17]: #validate

[18]: #cacheresource

[19]: #parameters-7

[20]: #replacecache

[21]: #parameters-8

[22]: #cachedeltaseconds

[23]: #getcached

[24]: #parameters-9

[25]: #getlistroutepath

[26]: #parameters-10

[27]: #getdetailroutepath

[28]: #parameters-11

[29]: #list

[30]: #parameters-12

[31]: #rel-1

[32]: #parameters-13

[33]: #get-1

[34]: #get-2

[35]: #set-1

[36]: #parameters-14

[37]: #defaultclient

[38]: #defaultclient-1

[39]: #camelize

[40]: #parameters-15

[41]: #uuidweak

[42]: #error

[43]: #baseerror

[44]: #isinstance

[45]: #parameters-16

[46]: #baseerror-1

[47]: #isinstance-1

[48]: #parameters-17

[49]: #baseerror-2

[50]: #isinstance-2

[51]: #parameters-18

[52]: #baseerror-3

[53]: #isinstance-3

[54]: #parameters-19