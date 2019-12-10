import { DefaultClient } from '../src/client'
import Resource from '../src/index'
export const TEST_PORT = process.env.TEST_PORT || 8099

export class TestingClient extends DefaultClient {
    requestTracker: any = {}
    logging: boolean = false

    get() {
        if(this.logging) {
            console.log('GET', arguments[0])
        }
        this.requestTracker[arguments[0]] = (this.requestTracker[arguments[0]] || 0) + 1
        // @ts-ignore
        return DefaultClient.prototype.get.apply(this, arguments)
    }
}

export const BaseTestingResource = Resource.extend({
    client: new TestingClient(`http://localhost:${TEST_PORT}`)
})

export const UserResource = BaseTestingResource.extend({
    endpoint: '/users'
})

export const TodoResource = BaseTestingResource.extend({
    endpoint: '/todos',
    related: {
        user: UserResource
    }
})

export const PostResource = BaseTestingResource.extend({
    endpoint: '/posts',
    related: {
        user: UserResource
    }
})

export const GroupResource = BaseTestingResource.extend({
    endpoint: '/groups',
    related: {
        owner: UserResource,
        users: UserResource,
        todos: TodoResource
    }
})

export const CommentResource = BaseTestingResource.extend({
    endpoint: '/comments',
    related: {
        post: PostResource,
        user: UserResource
    }
})
