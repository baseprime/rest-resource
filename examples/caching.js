const Resource = require('../dist').default
const Client = require('../dist/client').DefaultClient

class LoggingClient extends Client {
    get(...args) {
        return super.get(...args).then((result) => {
            console.log(`GET ${args[0]}`)
            return result
        })
    }
}

class BaseResource extends Resource {
    static get client() {
        return new LoggingClient('https://jsonplaceholder.typicode.com')
    }
}

class UserResource extends BaseResource {
    static get endpoint() {
        return '/users'
    }
}

class TodoResource extends BaseResource {
    static get endpoint() {
        return '/todos'
    }

    static get related() {
        return {
            userId: UserResource
        }
    }
}

TodoResource.list()
    .then(async (response) => {
        let promises = response.resources.map((resource) => resource.getRelatedDeep())
        await Promise.all(promises)
        return response.resources
    }).then(async (resources) => {
        let firstTodo = resources[0]
        let user = firstTodo.get('userId')
        await UserResource.detail(user.id)
        console.log(`Didn't need to GET /users/${user.id} twice!`)
    })
