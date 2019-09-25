import Resource from '../src'
import { DefaultClient } from '../src/client'
import RelatedManager from '../src/related'

class CustomClient extends DefaultClient {
    get() {
        console.log('GET', arguments[0])
        // @ts-ignore
        return DefaultClient.prototype.get.apply(this, arguments)
    }
}

class BaseResource extends Resource {
    static client = new CustomClient('https://jsonplaceholder.typicode.com')
}

class UserResource extends BaseResource {
    static endpoint = '/users'
}

class TodoResource extends BaseResource {
    static endpoint = '/todos'
    static related = {
        userId: UserResource
    }
}

TodoResource.detail('1').then(async (todo) => {
    // let rm = new RelatedManager(UserResource, 1)
    // let d = await rm.all()
    TodoResource.cacheMaxAge = -1
    TodoResource.clearCache()
    let t1 = await TodoResource.detail('1')
    let t2 = await TodoResource.detail('1')
    let t3 = await TodoResource.detail('1')
    console.log(t1.id, t2.id, t3.id)
})
