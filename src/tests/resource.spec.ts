import { expect } from 'chai'
import Resource from '../index'
import { DefaultClient } from '../client'

export class BaseTestingResource extends Resource {
    static getClient() {
        return new DefaultClient('https://jsonplaceholder.typicode.com')
    }
}

export class UserResource extends BaseTestingResource {
    static endpoint = '/users'
}

export class PostResource extends BaseTestingResource {
    static endpoint = '/posts'
    static related = {
        userId: UserResource
    }
}

describe('Resource', () => {
    var post: PostResource | undefined = undefined
    it('correctly gets remote resource', async () => {
        post = await PostResource.detail('1')
        expect(post.get('userId')).to.exist
    })

    it('related key is a string', async () => {
        post = await PostResource.detail('1')
        expect(post.get('userId')).to.be.string
    })

    it('correctly gets related', async() => {
        await post.getRelated()
        expect(post.get('userId')).to.be.instanceOf(UserResource)
    })

    it('correctly gets a cached related item', async() => {
        let cachedUser = UserResource.getCached(post.get('userId.id'))
        expect(cachedUser).to.exist
        expect(cachedUser.resource).to.be.instanceOf(UserResource)
    })

    it('creates resources', async() => {
        let newUser = new UserResource({
            name: 'Test User',
            username: 'testing123321',
            email: 'testuser@dsf.com'
        })
        
        await newUser.save()
        expect(newUser).to.have.property('id')
        expect(newUser.id).to.exist
        expect(newUser._attributes.id).to.exist
    })
})
