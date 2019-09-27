import { start } from 'repl'
import Resource from '../src'
import { DefaultClient } from '../src/client'

class CustomClient extends DefaultClient {
    _wrapMethod(method: string, args: IArguments) {
        console.log(method.toUpperCase(), args[0], args[1] || {})
        // @ts-ignore
        return DefaultClient.prototype[method.toLowerCase()].apply(this, args)
    }
    get() {
        return this._wrapMethod('GET', arguments)
    }
    post() {
        return this._wrapMethod('POST', arguments)
    }
    patch() {
        return this._wrapMethod('PATCH', arguments)
    }
    put() {
        return this._wrapMethod('PUT', arguments)
    }
    delete() {
        return this._wrapMethod('DELETE', arguments)
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

Object.assign(start('> ').context, {
    Client: CustomClient,
    Resource: BaseResource,
    UserResource,
    TodoResource
})
