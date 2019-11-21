# REST Resource
### Simplified Interface for consuming REST APIs
REST Resource is a library that makes your life simpler when working with REST API endpoints. It takes RESTful Resource/Service URIs and simplifies them into a Class that can be called with various built-in methods. **[Think of it like a Model for REST API Endpoints.](#acts-like-a-model)**

### Features:
- **[Cached Resource Resolution](#cached-resource-resolution)**
  - Call to your resources as if they're already loaded, REST Resource sorts out which ones to GET
- **[Related Resources](#related-resources)**
  - Quickly wire up your Resources and which ones they're related to
- **[Attribute resolution on Related Resources](#related-attribute-lookups-with-getasync)**
  - Get attributes on related resources as easily as:
    ```javascript
    await resource.getAsync('user.address.city.name')
    // GET /users/1
    // GET /addresses/1
    // GET /cities/1
    // => San Francisco, CA
    ```
- **[Validation](#validation)**
- **[Attribute Normalization](#attribute-normalization)**
- **Class-Based/Complete Customization**
  - Completely customize the way REST Resource works with your API
    - [The Client Class](#the-client-class)
    - [Customizing Related Manager](#customizing-relatedmanager)
- **TypeScript Support**

## What is a REST Resource?
REST is acronym for REpresentational State Transfer. It is architectural style for distributed hypermedia systems and was first presented by Roy Fielding in 2000 in his famous [dissertation](https://www.ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm).

Like any other architectural style, REST also does have it’s own [6 guiding constraints](https://restfulapi.net/rest-architectural-constraints/) which must be satisfied if an interface needs to be referred as RESTful.

[Please read further documentation](https://restfulapi.net/)

## Installation
```
npm install rest-resource
```

or

```html
<script src="https://unpkg.com/rest-resource"></script>
```

## Documentation
Please see [Documentation](https://htmlpreview.github.io/?https://raw.githubusercontent.com/baseprime/rest-resource/master/docs/classes/_index_.resource.html)
```
npm run serve-docs
```

## Examples
[Play around with a working example on JSFiddle](https://jsfiddle.net/ro6fj51n/)

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

// Sends a GET to /users/123
const arthur = await UserResource.detail(123)
arthur.greet()
// => I am Arthur, King of the Britons!

// Or, get many resources
// Sends a GET to /users
const users = await UserResource.list()

let robin = users.resources[0]
robin.greet()
// => I am Brave Sir Robin, Knight of the Round Table!
console.log(robin.id)
// => 456
robin.set('weapon', 'Sword')
robin.save()
// PATCH { weapon: 'Sword' } to /users/456
```

# Cached Resource Resolution
REST Resource has a caching mechanism that sorts out which resources your app needs and satisfies both requirements once that resource has been obtained, provided they're made within `n` seconds where `n` is a Resource's `cacheMaxAge`. Resource retrieval can be defined synchronously or asynchronously and REST Resource will still only need to make the initial request.

In the example below, only one request is made to `/users/123`, even though the data from that endpoint is required twice:

```javascript
let user = await UserResource.detail(123)
// GET /users/123

user.greet()
// => I am Arthur, King of the Britons!

console.log(user === await UserResource.detail(123))
// => true
```

If an object has been retrieved and is called upon from other related models, REST Resource will resolve cross-referenced lookups, provided they're made within `n` seconds where `n` is a Resource's `cacheMaxAge`. In the example below, notice the `groups` attribute contains an already-retrieved Group Resource:

```javascript
let arthur = await UserResource.detail(123)
console.log(arthur.attributes)
// => {
//        id: 123,
//        name: 'King Arthur',
//        weapon: 'Sword',
//        role: 1,
//        groups: [1]
//    }

let patsy = await UserResource.detail(654)
console.log(patsy.attributes)
// => {
//        id: 654,
//        name: 'Patsy',
//        weapon: 'Coconuts',
//        role: 2,
//        groups: [1, 2] // Notice this list contains an already retrieved group (1)
//    }

let arthurTitle = arthur.getAsync('role.title')
let arthurGroup = arthur.getAsync('groups.name')
// GET /roles/1
// GET /groups/1

let patsyTitle = patsy.getAsync('role.title')
let patsyGroup = patsy.getAsync('groups.name')
// GET /roles/2
// GET /groups/2
// Does not need to GET /groups/1
```

Changing cache lifespan:

```javascript
class CustomResource extends Resource {
    static cacheMaxAge = 60 // Defaults to 10 seconds
    // ...
}
```

Turning cache off:

```javascript
class NoCacheResource extends Resource {
    static cacheMaxAge = -1
    // ...
}
```

# Related Resources
Related Resources can be wired up very easily.

## Defining One to Many relationships

```javascript
import Resource from 'rest-resource'

class RoleResource extends Resource {
    static endpont = '/roles'
}

class UserResource extends Resource {
    static endpoint = '/users'
    static related = {
        role: RoleResource
    }
}

let user = await UserResource.detail(321, { resolveRelated: true }) // Add resolveRelated: true here and it'll automatically resolve related resources
// GET /users/321
// GET /roles/<id>

// Using get() gets the attribute `title `on related key `role`
let title = user.get('role.title')
let name = user.get('name')
console.log('%s the %s!', name, title)
// => Tim the Enchanter!

console.log(user.get('role'))
// => RoleResource({ id: 654, title: 'Enchanter' })
```

## Defining Many to Many relationships
Many to many relationships work exactly the same as One to Many relationships with one key difference: when using `resource.get(attribute)` where `attribute` is the field of a related resource, the returned value is not the related `Resource` instance, it's a `RelatedManager` instance:

```javascript
class UserResource extends Resource {
    static endpoint = '/users'
    static related = {
        role: RoleResource,
        groups: GroupResource // Many to many relationship
    }
}

let user = await UserResource.detail(654)

console.log(user.attributes)
// => {
//        id: 654,
//        name: 'Patsy',
//        weapon: 'Coconuts',
//        role: 2,
//        groups: [1, 2]
//    }

let manager = user.rel('groups') // Many to many relationship

console.log(manager.resolved)
// => false

// REST Resource doesn't automatically resolve related lookups unless instructed by using resolveRelated
await manager.resolve()
// GET /groups/1
// GET /groups/2

console.log(manager.resolved)
// => true

console.log(manager.objects)
// => [GroupResource, GroupResource]
```

## Using `resolveRelated()` and `{ resolveRelated: true }`
When using `ResourceClass.detail()` and `ResourceClass.list()`, one of the available options is `{ resolveRelated: true }`, which will automatically resolve related resources.

#### Using `{ resolveRelated: true }` with `ResourceClass.detail()`:
```javascript
let user = await UserResource.detail(654, { resolveRelated: true })
// GET /users/654
// GET /roles/2
// GET /groups/1
// GET /groups/2
console.log('groups.name')
// => ["Some Group", "Another Group"]
```

#### Using `{ resolveRelated: true }` with `ResourceClass.list()`:
```javascript
let users = await UserResource.list({ resolveRelated: true })
// GET /users
// GET /roles/1
// GET /roles/2
// GET /groups/1
// GET /groups/2
```

#### Using `resourceInstance.resolveRelated()`:

```javascript
let user = await UserResource.detail(654)
// GET /users/654
await user.resolveRelated()
// GET /roles/2
// GET /groups/1
// GET /groups/2
```

Additionally, you can also provide a list of managers that you want to resolve:
```javascript
let user = await UserResource.detail(654)
// GET /users/654
await user.resolveRelated(['role']) // Will ignore all but "role" field (notice the "groups" were not resolved)
// GET /roles/2
```

## Recursive resolving with `{ resolveRelatedDeep: true }`
To resolve all attributes recursively, you can provide `{ resolveRelatedDeep: true }` instead. This will retrieve all related resources, and any other related resources attached to those resources. Be careful when using this option as it may cause performance issues.

## Related Attribute Lookups with `getAsync()`
REST Resource automatically resolves properties from related lookups, then decides what fields it needs to call `resource.resolveRelated()`

```javascript
let roger = await UserResource.detail(543)
// GET /users/543

let title = await roger.getAsync('role.title')
// GET /roles/<id>

console.log(title)
// => Shrubber
```

#### Note: `resource.getAsync(attribute)` is one of the most useful features of REST Resource as it allows you to define the fields that are necessary to build your app, and REST Resource will intelligently request only the data it _needs_ from the API!

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
        groups: [1]
    }
}

let unknown = new UserResource({ groups: [2] })
console.log(unknown.get('name'))
// => Unknown User
```

# Working with older versions of JavaScript <= ES5
You can use `Resource.extend` to define static members. For example:
```javascript
const UserResource = Resource.extend({
    endpoint: '/users',
    related: {
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
import { DefaultClient } from 'rest-resource/dist/client'

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

# Customizing RelatedManager 
Whenever a related field is defined, a manager is created to that field. You can customize this class by extending it and assigning it when you create a class.

```javascript
import Resource from 'rest-resource'
import RelatedManager from 'rest-resource/dist/related'

class CustomRelatedManager extends RelatedManager {
    batchSize: 50 // Only GET 50 related objects at a time (default: Infinity)
    /**
     * @param options Object (resolveRelated, etc.)
     * @returns Resource[] List of Resource instances
     */
    resolve(options) {
        // etc
    }
}

class UserResource extends Resource {
    static endpoint = '/users'
    // Define custom related manager here
    static RelatedManagerClass = CustomRelatedManager
}
```

# Validation
You can specify a validation object literal as a static member of any Resource class and run validations against any attribute. Validations are ran automatically when using `resource.save()`. Note: validation functions should throw `exceptions.ValidationError(field, message)`
```javascript
import Resource from 'rest-resource'

function phoneIsValid(value, instance, ValidationError) {
    let regExp = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im
    if(!regExp.test(value)) {
        throw new ValidationError('phone')
    }
}

function isFiveChars(value, instance, ValidationError) {
    return String(value).length >= 5
}

function isAlphaNumeric(value, instance, ValidationError) {
    return /^[a-z0-9]+$/i.test(value)
}

class UserResource extends Resource {
    static endpoint = '/users'
    static validation = {
        phone: phoneIsValid,
        username: [
            isFiveChars,
            isAlphaNumeric
        ]
    }
}

let user = await UserResource.detail(1)

user.set('phone', '415-555-1234')
user.validate()
// => []
user.set('phone', '555555x1234')
user.validate()
// => [{ ValidationError: phone: This field is not valid }]
```

# Attribute Normalization 
Whenever an attribute is defined, you can normalize its value into a desired output (think of it as a unidirectional serializer). The built-in normalizers are:
- `StringNormalizer`
- `NumberNormalizer`
- `BooleanNormalizer`
- `CurrencyNormalizer`

Attribute Normalizers can ensure that the values assigned to `resource.attributes[key]` (and subsequently the data being sent to the API) is consistent.

## Normalizing Inconsistent Properties
Attribute Normalization is particularly useful when trying to normalize inconsistent data _from_ the API. The example below represents two responses from the API, one representing a `comment` object and a `post` object. Both objects are referencing a `user`. However, the value of `user` on each `comment` and `post` objects are inconsistent (one is a primary key, and one is an nested `user` object):

```javascript
// GET /comments/1
{
    "content": "Nullam vel ultrices eros. Nullam at metus venenatis, bibendum lectus sed",
    "post": 1,
    "user": 123
}

// GET /posts/1
{
    "title": "Nullam nibh enim, ultrices quis",
    "body": "Pellentesque ultrices augue eleifend augue posuere pretium. Nulla sodales turpis eget pretium efficitur.",
    "user": {
        "id": 123,
        "name": "King Arthur",
        "weapon": "Sword",
        "role": 1,
        "groups": [1]
    }
}
```

You can use attribute normalization to solve this issue

```javascript
import Resource from 'rest-resource'
import { NumberNormalizer } from 'rest-resource/dist/helpers/normalization'

class PostResource extends Resource {
    static endpoint = '/posts'

    static related = {
        user: UserResource
    }
    
    static normalization = {
        user: new NumberNormalizer()
    }
}

class CommentResource extends Resource {
    static endpoint = '/comments'
    static related = {
        user: UserResource,
        post: PostResource
    }

    static normalization = {
        user: new NumberNormalizer(),
    }
}

let post = await PostResource.detail(1)
console.log(post.attributes.user)
// => 123

let comment = await CommentResource.detail(1)
console.log(comment.attributes.user)
// => 123
```

You can also specify custom normalizer

```javascript
class PostResource extends Resource {
    static endpoint = '/posts'

    static related = {
        user: UserResource
    }
    
    static normalization = {
        user: {
            normalize: (value) => {
                // Normalize and return new value
            }
        }
    }
}
```

You can also use the `normalizerFactory(normalizerClassName)` helper instead of importing all normalizer classes:

```javascript
import { normalizerFactory } from 'rest-resource/dist/helpers/normalization'

class PostResource extends Resource {
    static endpoint = '/posts'

    static related = {
        user: UserResource
    }
    
    static normalization = {
        user: normalizerFactory('NumberNormalizer')
    }
}
```

# Further Reading
Please see [Documentation](https://htmlpreview.github.io/?https://raw.githubusercontent.com/baseprime/rest-resource/master/docs/classes/_index_.resource.html)
```
npm run serve-docs
```
