const Resource = require('../dist').default
const Client = require('../dist/client').DefaultClient

const BaseResource = Resource.extend({
    client: new Client('https://jsonplaceholder.typicode.com')
})

const UserResource = BaseResource.extend({
    endpoint: '/users'
})

const TodoResource = BaseResource.extend({
    endpoint: '/todos',
    related: {
        userId: UserResource
    }
})

TodoResource.list()
    .then((response) => {
        response.resources.forEach(async (resource) => {
            let title = await resource.resolveAttribute('title')
            let author = await resource.resolveAttribute('userId.name')
            let doneText = await resource.resolveAttribute('completed') ? 'x' : '-'
            console.log(`${doneText}\t${title}\n\t${author}\n\n`)
        })
    })
