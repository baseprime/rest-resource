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
    .then((response) => {
        response.resources.forEach(async (resource) => {
            await resource.getRelated()
            let title = resource.get('title')
            let author = resource.get('userId.name')
            let doneText = resource.get('completed') ? 'x' : '-'
            //console.log(`${doneText}\t${title}\n\t${author}\n\n`)
        })
    })
