import { DefaultClient, AxiosRequestConfig, RequestConfig } from '../src/client'
import Resource from '../src/index'
export const TEST_PORT = process.env.TEST_PORT || 8099

export function axiosRequestLogger(request: AxiosRequestConfig) {
    return new Promise((resolve) => {
        console.log(`${request.method.toUpperCase()} ${request.url}`)
        if (request.data) {
            console.log(`${JSON.stringify(request.data, null, '    ')}`)
        }
        resolve(request)
    })
}

export function createRequestTracker(client: TestingClient) {
    return function(request: AxiosRequestConfig) {
        return new Promise((resolve) => {
            client.requestTracker[request.url] = (client.requestTracker[request.url] || 0) + 1
            resolve(request)
        })
    }
}

export class TestingClient extends DefaultClient {
    requestTracker: any = {}
    logging: boolean = false

    constructor(baseURL: string, options?: RequestConfig) {
        super(baseURL, options)
        this.axios.interceptors.request.use(createRequestTracker(this))
        if(this.logging) {
            this.axios.interceptors.request.use(axiosRequestLogger)
        }
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

export const CommentMeta = BaseTestingResource.extend({
    endpoint: '/commentmeta',
    related: {
        comment: CommentResource
    }
})

export const CommentMetaMeta = BaseTestingResource.extend({
    endpoint: '/commentmetameta',
    related: {
        commentmeta: CommentMeta
    }
})

export const CommentMetaMetaMeta = BaseTestingResource.extend({
    endpoint: '/commentmetametameta',
    related: {
        commentmetameta: CommentMetaMeta
    }
})

export const CommentMetaMetaMetaMeta = BaseTestingResource.extend({
    endpoint: '/commentmetametametameta',
    related: {
        commentmetametameta: CommentMetaMetaMeta
    }
})
