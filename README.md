# REST Resource - Simplify your REST API resources
REST Resource is a simple library to help make your life simpler when calling REST API Endpoints. It takes RESTful Resource/Service URIs and simplifies them into a Class that can be called with simple methods.

#### Features:
- Resource Caching
- Supports Related Resources
- Nested attribute resolution on Related Resources
- Custom clients

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
REST Resource has a caching mechanism that caches objects returned by your API.

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
REST Resource automatically resolves properties from related lookups, then decides what it needs to call `resource.getRelated()`

```javascript
let roger = await UserResource.detail(543)
// GET /users/543

let title = await roger.getAttr('occupation.title')
// Doesn't need send GET /occupations/<id>

console.log(title)
// => Shrubber
```

Furthermore, if an object is cached and is called upon from other related models, REST Resource will save a request.

In the example below, notice the `equipment` ids are the same (`1`):

```javascript
let arthur = await UserResource.detail(123)
console.log(arthur.attributes)
// => {
//        id: 123,
//        name: 'King Arthur',
//        weapon: 'Sword',
//        occupation: 1,
//        equipment: 1
//    }

let patsy = await UserResource.detail(654)
console.log(patsy.attributes)
// => {
//        id: 654,
//        name: 'Brave Sir Robin',
//        weapon: 'Sword',
//        occupation: 2,
//        equipment: 1 // Notice the equipment ID is the same
//    }

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

# The `Client` Class
The Client class is a simple request library that is meant to be customized to suit your needs. You should override the Client's `apiCall()` method and return a promise.

#### REST Resource assumes your API is rendering JSON and authenticated endpoints are using a Bearer JWT

For requests, REST Resource by default uses the `BearerClient` class in `src/client/jwt-bearer`

## Assigning a Client
You should override the Resource's `getClient()` method:

```javascript
import Resource from 'rest-resource'
import BaseClient from 'rest-resource/client'

class CustomClient extends BaseClient {
    apiCall(path, opts) {
        // Some custom stuff
        return new Promise()
    }
}

class CustomResource extends Resource {
    static getClient() {
        return new CustomClient('http://some-api.com')
    }
}

// Or you can globally override the client
Resource.getClient = () => new CustomClient('http://some-api.com')

// Or you can set the client manually
Resource.setClient(new CustomClient('http://some-api.com'))
```

### JSON Web Tokens (JWT) and Authenticated Endpoints
Whenever the user wants to access a protected route or resource, the user agent should send the JWT, typically in the Authorization header using the Bearer schema. The content of the header should look like the following:

```
Authorization: Bearer <token>
```

For more information on how JWTs work, please see [JSON Web Token Documentation](https://jwt.io/introduction/)

# Documentation
Please see [DOCUMENTATION.md](DOCUMENTATION.md)
