# REST Resource
### Simplified Interface for consuming REST APIs
REST Resource is a library to make your life simpler when working with REST API Endpoints. It takes RESTful Resource/Service URIs and simplifies them into a Class that can be called with simple methods. **Think of it like a Model for REST API Endpoints.**

#### Features:
- **Caching!**
  - You'll never have to worry about making multiple calls to the same endpoint
- **Easily set up Related Resources**
  - Quickly wire up your Resources and which ones they're related to, REST Resource takes care of the rest
- **Nested attribute resolution on Related Resources**
  - Get attributes on related resources as easily as:
    ```javascript
    await resource.getAsync('otherResource.evenDeeperResource.name')
    ```
- **Class-Based/Custom clients**
  - Completely customize the way REST Resource works with your API

## What is a REST Resource?
REST is acronym for REpresentational State Transfer. It is architectural style for distributed hypermedia systems and was first presented by Roy Fielding in 2000 in his famous [dissertation](https://www.ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm).

Like any other architectural style, REST also does have it’s own [6 guiding constraints](https://restfulapi.net/rest-architectural-constraints/) which must be satisfied if an interface needs to be referred as RESTful.

[Please read further documentation](https://restfulapi.net/)

## Installation
```
npm install rest-resource
```

## Examples
[Play around with a working example using RunKit](https://runkit.com/baseprime/rest-resource-example)

(assuming `Node >= v12.0.0`)

Given the URIs:

```
/users
/users/<id>
/roles
/roles/<id>
/groups
/groups/<id>
```
Code:

```javascript
import Resource from 'rest-resource'

class UserResource extends Resource {
    static endpoint = '/users'

    greet() {
        console.log('I am %s, %s!', this.attributes.name, this.attributes.role)
    }
}

// Sends a GET to /users
UserResource.list().then((users) => {
    let user = users[0]
    user.greet()
    // => I am Arthur, King of the Britons!
    user.set('weapon', 'Sword')
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

class RoleResource extends Resource {
    static endpont = '/roles'
}

class GroupResource extends Resource {
    static endpont = '/groups'
}

class UserResource extends Resource {
    static endpoint = '/users'
    static related = {
        role: RoleResource,
        group: GroupResource
    }
}

let user = await UserResource.detail(321, { getRelated: true })
// GET /users/321
// GET /roles/<id>
// GET /groups/<id>

// Using get() gets the attribute `title `on related key `role`
let title = user.get('role.title')
let name = user.get('name')
console.log('%s the %s!', name, title)
// => Tim the Enchanter!

console.log(user.get('role'))
// => RoleResource({ id: 654, title: 'Enchanter' })
```

### Related Attribute Lookups with `getAsync()`
REST Resource automatically resolves properties from related lookups, then decides what fields it needs to call `resource.getRelated()`

```javascript
let roger = await UserResource.detail(543)
// GET /users/543

let title = await roger.getAsync('role.title')
// Doesn't need send GET /roles/<id>

console.log(title)
// => Shrubber
```

Furthermore, if an object is cached and is called upon from other related models, REST Resource will save a request.

In the example below, notice the `group` ids are the same:

```javascript
let arthur = await UserResource.detail(123)
console.log(arthur.attributes)
// => {
//        id: 123,
//        name: 'King Arthur',
//        weapon: 'Sword',
//        role: 1,
//        group: 1
//    }

let patsy = await UserResource.detail(654)
console.log(patsy.attributes)
// => {
//        id: 654,
//        name: 'Patsy',
//        weapon: 'Coconuts',
//        role: 2,
//        group: 1 // Notice this ID is the same as the one above
//    }

let arthurTitle = arthur.getAsync('role.title')
let arthurGroup = arthur.getAsync('group.name')
// GET /roles/1
// GET /groups/1

let patsyTitle = patsy.getAsync('role.title')
let patsyGroup = patsy.getAsync('group.name')
// GET /roles/2
// Does not need to GET /groups/1
```

# Acts like a Model
You can use REST Resource like a RESTful Model. REST Resource tracks changes in each Resource instance's attributes and uses RESTful HTTP Verbs like `GET`, `POST`, `PUT`, `PATCH`, and `DELETE` accordingly:

```javascript
let robin = new UserResource({
    name: 'Brave Sir Robin',
    weapon: 'Sword'
})

await robin.save()
// POST /users
let knight = new RoleResource({ title: 'Knight of the Round Table' })
await knight.save()
// POST /roles

robin.set('role', knight.id)
robin.save()
// PATCH /users/<robin-id>

robin.update()
// GET /users/<robin-id>

robin.runAway()
robin.delete()
// DELETE /users/<robin-id>
```

## Resource Instance Defaults
You can also specify the defaults that a Resource instance should have:

```javascript
class UserResource extends Resource {
    static endpoint = '/users'
    static defaults = {
        name: 'Unknown User',
        weapon: 'Hyperbolic Taunting',
        group: 1
    }
}

let unknown = new UserResource({ group: 2 })
console.log(unknown.get('name'))
// => Unknown User
```

# Working with older versions of Node
If you aren't using a newer version of Node or TypeScript, you can use `Resource.extend` to define static members. For example:
```javascript
const UserResource = Resource.extend({
    endpoint: '/users',
    defaults: {
        name: 'Unknown User'
        // ...etc
    }
})
```

# The `Client` Class
The Client class is a simple request library that is meant to be customized to suit your needs.

#### REST Resource assumes the API you are consuming is rendering JSON and authenticated endpoints are using a Bearer JWT

For requests, REST Resource uses a basic [Axios](https://www.npmjs.com/package/axios) client (`JWTBearerClient` class in `src/client`). You can override this by creating a custom client.

For more information on how Axios works, [please refer to Axios documentation](https://github.com/axios/axios)

## Creating a custom client
When creating a custom client, you can override any methods you'd like. One method in particular you'll need to focus on is `negotiateContent()` which should return a function that parses the body of the response into a list of objects.

## Assigning a Custom Client
There are a number of ways you can set the client:

```javascript
import Resource from 'rest-resource'
import { DefaultClient } from 'rest-resource/client'

class CustomClient extends DefaultClient {
    negotiateContent(ResourceClass) {
        return (response) => {
            let objects = []
            if(Array.isArray(response.data)) {
                response.data.forEach((attributes) => objects.push(new ResourceClass(attributes)))
            } else {
                objects.push(new ResourceClass(response.data))
            }

            return {
                response,
                objects,
                pages: () => response.headers['Pagination-Count'],
                currentPage: () => response.headers['Pagination-Page'],
                perPage: () => response.headers['Pagination-Limit'],
            }
        }
    }
}

class CustomResource extends Resource {
    static client = new CustomClient('http://some-api.com')
}

// Or: (this method can also be used to override client globally by replacing "CustomResource" with "Resource")
CustomResource.client = new CustomClient('http://some-api.com')
```

### JSON Web Tokens (JWT) and Authenticated Endpoints
Whenever the user wants to access a protected route or resource, the user agent should send the JWT, typically in the Authorization header using the Bearer schema. The content of the header should look like the following:

```
Authorization: Bearer <token>
```

For more information on how JWTs work, please see [JSON Web Token Documentation](https://jwt.io/introduction/)

# Documentation
```
npm run serve-docs
```

Please see [Documentation](./docs)
