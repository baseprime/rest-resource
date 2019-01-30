# Rest Resource - Simplify your REST API resources
Rest Resource is a simple library to help make your life simpler when calling REST API Endpoints.

Rest Resource Takes RESTful Resource/Service URIs and simplifies them into a Class that can be called with simple methods.

## What is a REST Resource?
REST is acronym for REpresentational State Transfer. It is architectural style for distributed hypermedia systems and was first presented by Roy Fielding in 2000 in his famous [dissertation](https://www.ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm).

Like any other architectural style, REST also does have it’s own [6 guiding constraints](https://restfulapi.net/rest-architectural-constraints/) which must be satisfied if an interface needs to be referred as RESTful.

[Please read further documentation](https://restfulapi.net/)

## Installation
```
npm install rest-resource
```

### Example
Given the URIs:

```
/users
/users/{id}
```
Code:

```javascript
import Resource from 'rest-resource'

class UserResource extends Resource {
    static endpoint = '/users'

    greet() {
        console.log('I am %s, %s!', this.attributes.name, this.attributes.occupation)
    }
}

// Sends a GET to /users
UserResource().then((users) => {
    let user = users[0]
    user.greet()
    // => I am Arthur, King of the Britons!
    user.attr('weapon', 'Sword')
    user.save()
    // PATCH { weapon: 'Sword' } to /users/123
})

// Or, get details of a Resource
// Sends a GET to /users/123
UserResource.detail(123).then((arthur) => {
	arthur.greet()
})
```

# Supports Caching out of the box
Rest Resource has a caching mechanism that caches objects returned by your API.

```javascript
let user = await UserResource.detail(123)
// GET /users/123
user.greet()
// => I am Arthur, King of the Britons!
let sameuser = await UserResource.detail(123)
// Cache is still good, did not send GET to /users/123
sameuser.greet()
// => I am Arthur, King of the Britons!
```

# Related Resources
You can also define related resources:

```javascript
import Resource from 'rest-resource'

class OccupationResource extends Resource {
	static endpont = '/occupations'
}

class EquipmentResource extends Resource {
	static endpont = '/equipment'
}

class UserResource extends Resource {
    static endpoint = '/users'
    static related = {
    	occupation: OccupationResource,
    	equipment: EquipmentResource
    }
}

// GET /users/321
let user = await UserResource.detail(321)
await user.getRelated()
// GET /occupations/<id>
// GET /equipment/<id>
// Using attr() gets the attribute `title `on related key `occupation`
let title = user.attr('occupation.title')
let name = user.attr('name')
console.log('%s the %s!', name, title)
// => Tim the Enchanter!

console.log(user.attr('occupation'))
// => OccupationResource({ id: 654, title: 'Enchanter' })
```

### Related Attribute Lookups with `getAttr()`
Rest Resource automatically resolves properties from related lookups, then decides what it needs to call `resource.getRelated()`

```javascript
let roger = await UserResource.detail(543)
// GET /users/543
let title = await roger.getAttr('occupation.title')
// Doesn't need send GET /occupations/<id>
console.log(title)
// => Shrubber
```

Furthermore, if an object is cached and is called upon from other related models, Rest Resource will save a request.

In the example below, notice the `equipment` ids are the same (`1`):

```javascript
let arthur = await UserResource.detail(123)
console.log(arthur.attributes)
// {
//     id: 123,
//     name: 'King Arthur',
//     weapon: 'Sword',
//     occupation: 1,
//     equipment: 1
// }
let patsy = await UserResource.detail(654)
console.log(patsy.attributes)
// {
//     id: 654,
//     name: 'Brave Sir Robin',
//     weapon: 'Sword',
//     occupation: 2,
//     equipment: 1 // Notice the equipment ID is the same
// }
let arthurTitle = arthur.getAttr('occupation.title')
let arthurEquipment = arthur.getAttr('equipment.name')
// GET /occupations/1
// GET /equipment/1
let patsyTitle = patsy.getAttr('occupation.title')
let patsyEquipment = patsy.getAttr('equipment.name')
// GET /occupations/2
// Does not need to GET /occupations/1
console.log(patsyEquipment)
// => Coconuts
```

## How to build a REST API
[Please see documentation](https://restfulapi.net/rest-api-design-tutorial-with-example/)

# Documentation

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