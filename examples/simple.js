const Resource = require('../dist').default
const Client = require('../dist/client').DefaultClient

class UserResource extends Resource {
    static get endpoint() {
        return '/users'
    }

    static get client() {
        return new Client('https://jsonplaceholder.typicode.com')
    }
}

UserResource.list()
    .then((response) => {
        response.resources.forEach((resource) => {
            console.log(resource.get('name'))
        })
    })
