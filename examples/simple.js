const Resource = require('../dist').default
const Client = require('../dist/client').DefaultClient

const UserResource = Resource.extend({
    endpoint: '/users',
    client: new Client('https://jsonplaceholder.typicode.com')
})

UserResource.list()
    .then((response) => {
        response.resources.forEach((resource) => {
            console.log(resource.get('name'))
        })
    })
