import { expect } from 'chai'
import { BaseTestingResource } from '.'

const UserResource = BaseTestingResource.extend({
    endpoint: '/users'
})

const PostResource = BaseTestingResource.extend({
    endpoint: '/posts',
    related: {
        user: UserResource
    }
})

const GroupResource = BaseTestingResource.extend({
    endpoint: '/groups',
    related: {
        owner: UserResource,
        users: UserResource
    }
})

const CommentResource = BaseTestingResource.extend({
    endpoint: '/comments',
    related: {
        post: PostResource
    }
})

describe('', () => {

    it('correctly gets remote resource', async () => {
        let post = await PostResource.detail('1')
        expect(post.get('user')).to.exist
        let user = await UserResource.detail('1')
        expect(user.get('name')).to.exist
    })

    it('creates resources', async () => {
        let user = new UserResource({
            name: 'Test User',
            username: 'testing123321',
            email: 'testuser@dsf.com'
        })
        
        await user.save()
        expect(user).to.have.property('id')
        expect(user.id).to.exist
        expect(user._attributes.id).to.exist
    })

    it('gets/sets properties correctly (static)', async () => {
        let changingUser = new UserResource({
            name: 'Test User',
            username: 'testing123321',
            email: 'testuser@dsf.com'
        })

        expect(changingUser.get('name')).to.equal('Test User')
        changingUser.set('name', 'Test User (Changed)')
        expect(changingUser.get('name')).to.equal('Test User (Changed)')
        expect(changingUser.changes.name).to.exist
        expect(changingUser.changes.name).to.equal('Test User (Changed)')
        expect(changingUser.attributes.name).to.equal('Test User (Changed)')
        expect(typeof changingUser.get()).to.equal('object')
    })
    
    it('related object lookup has right progression', async () => {
        let post = await PostResource.detail('40')
        expect(post.get('user')).to.be.string
        let samePost = await PostResource.detail('40', { getRelated: true })
        expect(samePost.get('user')).to.be.instanceOf(UserResource)
    })

    it('correctly gets related objects and managers', async () => {
        let post = await PostResource.detail('1')
        let group = await GroupResource.detail('1')
        expect(post.get('user')).to.be.instanceOf(PostResource.relatedManager)
        await post.getRelated()
        await group.getRelated()
        expect(post.get('user')).to.be.instanceOf(UserResource)
        expect(post.managers.user).to.be.instanceOf(PostResource.relatedManager)
        expect(group.managers.users).to.be.instanceOf(GroupResource.relatedManager)
        expect(group.get('users')).to.be.instanceOf(GroupResource.relatedManager)
        expect(group.managers.users.many).to.be.true
        expect(group.managers.users.resolved).to.be.true
        expect(group.managers.users.primaryKeys.length).to.equal(3)
        expect(group.get('name')).to.equal('Test group')
        expect(group.get('users.name')).to.be.instanceOf(Array)
        expect(group.get('users').objects[0]).to.be.instanceOf(UserResource)
    })

    it('can get related objects recursively', async () => {
        const requestTracker = CommentResource.client.requestTracker
        // No requests to /comments yet -- so let's ensure request count is undefined
        expect(requestTracker[CommentResource.getDetailRoutePath('250')]).to.be.undefined
        // GET comment, but recursively get related objects too -- Comment #250 should be post #50 which should be user #5 (all of which shouldn't have been retrieved yet)
        let comment = await CommentResource.detail('250', { getRelated: true })
        let post = comment.get('post')
        let user = post.get('user')
        expect(post).to.be.instanceOf(PostResource)
        expect(user).to.be.instanceOf(UserResource)
    })

    it('correctly gets a cached related item', async () => {
        let post = await PostResource.detail('1')
        let cachedUser = UserResource.getCached(post.get('user.id'))
        expect(cachedUser).to.be.string
        expect(cachedUser.resource).to.be.instanceOf(UserResource)
        // Repeatedly GET /posts/1 ...
        await PostResource.detail('1')
        await PostResource.detail('1')
        await PostResource.detail('1')
        // Then check how many requests it sent to it (should be only 1)
        expect(PostResource.client.requestTracker[PostResource.getDetailRoutePath('1')]).to.equal(1)
    })

    it('gets properties correctly (async)', async () => {
        // This post should already be cached by this point
        let post = await PostResource.detail('1')
        let userName = await post.getAsync('user.name')
        expect(userName).to.equal('Leanne Graham')
        expect(await post.getAsync('user.propDoesNotExist')).to.be.undefined
        try {
            await post.getAsync('user.nested.propDoesNotExist')
        } catch(e) {
            expect(e.name).to.equal('ImproperlyConfiguredError')
        }
    })

    it('caching can be turned off and on again', async () => {
        PostResource.cacheMaxAge = -1
        PostResource.clearCache()
        await PostResource.detail('1')
        expect(PostResource.client.requestTracker[PostResource.getDetailRoutePath('1')]).to.equal(2)
        await PostResource.detail('1')
        expect(PostResource.client.requestTracker[PostResource.getDetailRoutePath('1')]).to.equal(3)
        await PostResource.detail('1')
        expect(PostResource.client.requestTracker[PostResource.getDetailRoutePath('1')]).to.equal(4)
        // Turn cache back on
        PostResource.cacheMaxAge = Infinity
        // At this point, the above resources aren't being cached, so one more request to the server (5 so far)
        await PostResource.detail('1')
        expect(PostResource.client.requestTracker[PostResource.getDetailRoutePath('1')]).to.equal(5)
        // Now the resource should be cached (still 5)
        await PostResource.detail('1')
        expect(PostResource.client.requestTracker[PostResource.getDetailRoutePath('1')]).to.equal(5)
    })

    it('cross-relating resources reference single resource by cache key', async () => {
        let group = await GroupResource.detail('1', { getRelated: true })
        // ...At this point, group has a cached user (ID 1)
        let user = await UserResource.detail('1', { getRelated: true })
        // And getting the user again will yield the same exact user in memory stored at cache[cacheKey] address
        expect(group.managers.users.objects[0] === user).to.be.true
    })

    it('correctly gets paged results', async() => {
        
    })
})
