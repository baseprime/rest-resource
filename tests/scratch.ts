import Resource from '../src'
import { DefaultClient } from '../src/client'
import RelatedManager from '../src/related'

class CustomRelatedManager<T extends typeof Resource, U extends Resource> extends RelatedManager<T> {

}

class CustomClient extends DefaultClient {
    get() {
        console.log('GET', arguments[0], arguments[1] || {})
        // @ts-ignore
        return DefaultClient.prototype.get.apply(this, arguments)
    }

    patch() {
        console.log('PATCH', arguments[0], arguments[1] || {})
        // @ts-ignore
        return DefaultClient.prototype.patch.apply(this, arguments)
    }
}

class BaseResource extends Resource {
    static client = new CustomClient('http://localhost:8099')
}

class UserResource extends BaseResource {
    static endpoint = '/users'
}

class TodoResource extends BaseResource {
    static endpoint = '/todos'
    static relatedManager = CustomRelatedManager
    static related = {
        user: UserResource
    }
}

TodoResource.detail('1').then(async (todo) => {
    let n = await todo.getAsync('user.taco')
    console.log(n)
})

