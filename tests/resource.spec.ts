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
        users: UserResource
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
    
    it('related key is a string', async () => {
        let post = await PostResource.detail('1')
        expect(post.get('user')).to.be.string
    })

    it('correctly gets related', async () => {
        let post = await PostResource.detail('1')
        let group = await GroupResource.detail('1')
        expect(post.get('user')).to.be.instanceOf(PostResource.relatedManager)
        await post.getRelated()
        await group.getRelated()
        expect(post.get('user')).to.be.instanceOf(PostResource.relatedManager)
        expect(post.managers.user).to.be.instanceOf(PostResource.relatedManager)
        expect(group.managers.users).to.be.instanceOf(GroupResource.relatedManager)
        expect(group.managers.users.many).to.be.true
        expect(group.managers.users.inflated).to.be.true
        expect(group.managers.users.primaryKeys.length).to.equal(3)
        expect(group.get('name')).to.equal('Test group')
        expect(group.get('users.name')).to.be.instanceOf(Array)
        expect(group.get('users').objects[0]).to.be.instanceOf(UserResource)
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
})
