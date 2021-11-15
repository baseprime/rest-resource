import { expect } from 'chai'
import { BaseTestingResource, PostResource, UserResource, GroupResource, TodoResource, CommentResource } from '..'

describe('Resources', () => {
    it('correctly gets remote resource', async () => {
        let post = await PostResource.detail('1')
        expect(post.get('user')).to.exist
        let user = await UserResource.detail('1')
        expect(user.get('name')).to.exist
    })

    it('creates and saves resources', async () => {
        let user = new UserResource({
            name: 'Test User',
            username: 'testing123321',
            email: 'testuser@dsf.com',
        })

        await user.save()
        expect(user).to.have.property('id')
        expect(user.id).to.exist
        expect(user._attributes.id).to.exist

        // Make sure save() only sends requested fields
        const CustomUserResource = UserResource.extend({
            fields: ['username', 'email'],
        })

        let user2 = new CustomUserResource({
            name: 'Another Test User',
            username: 'testing54321',
            email: 'anothertest@dsf.com',
        })

        let result = await user2.save()
        expect(user).to.have.property('id')
        expect(user.changes.id).to.exist
        expect(result.response.data.email).to.exist
        expect(result.response.data.username).to.exist
        expect(result.response.data.name).to.be.undefined

        // Make sure this also works with save({ fields: [...] }
        let user3 = new CustomUserResource({
            name: 'Another Another Test User',
            username: 'testing3212',
            email: 'anothertest2@dsf.com',
            address: '123 Fake St',
        })

        let result2 = await user3.save({ fields: ['address'] })
        expect(result2.response.data.address).to.equal('123 Fake St')
        expect(result2.response.data.email).to.be.undefined
        expect(result2.response.data.username).to.be.undefined
        expect(result2.response.data.name).to.be.undefined

        // Make sure changes are unset after they're sent
        user3.set('city', 'San Francisco')
        expect(user3.changes).to.have.property('city')
        await user3.save({ fields: ['city'] })
        expect(user3.changes.city).to.be.undefined
    })

    it('gets/sets properties correctly (static)', async () => {
        let changingUser = new UserResource({
            name: 'Test User',
            username: 'testing123321',
            email: 'testuser@dsf.com',
        })

        expect(changingUser.get('name')).to.equal('Test User')
        changingUser.set('name', 'Test User (Changed)')
        expect(changingUser.get('name')).to.equal('Test User (Changed)')
        expect(changingUser.changes.name).to.exist
        expect(changingUser.changes.name).to.equal('Test User (Changed)')
        expect(changingUser.attributes.name).to.equal('Test User (Changed)')
        expect(typeof changingUser.get()).to.equal('object')
        changingUser.set('name', 'Test User (Changed again)')
        expect(changingUser.get('name')).to.equal('Test User (Changed again)')
    })

    it('correctly gets a cached related item', async () => {
        let post = await PostResource.detail('1', { resolveRelated: true })
        let cached = UserResource.getCached(post.get('user.id'))
        expect(cached).to.be.string
        expect(cached.resource).to.be.instanceOf(UserResource)
        expect(await PostResource.detail('1') === post).to.be.true
        // Repeatedly GET /posts/1 ...
        await PostResource.detail('1')
        await PostResource.detail('1')
        await PostResource.detail('1')
        // Then check how many requests it sent to it (should be only 1)
        expect(PostResource.client.requestTracker[PostResource.getDetailRoutePath('1')]).to.equal(1)
    })

    it('should never allow extended classes to share the same cache', async () => {
        class A extends PostResource {}
        class B extends A {}
        class C extends B {}
        expect(C.cache === A.cache).to.be.false
        expect(C.cache === B.cache).to.be.false
        expect(C._cache === B._cache).to.be.false
        expect(C._cache === A._cache).to.be.false
        expect(C._cache === PostResource._cache).to.be.false
    })

    it('gets properties correctly (async)', async () => {
        // This post should already be cached by this point
        let comment = await CommentResource.detail('90')
        // Make sure resolveAttribute works
        let userName = await comment.resolveAttribute('post.user.name')
        // Also make sure getAsync is an alias of resolveAttribute
        let userEmail = await comment.getAsync('post.user.email')
        expect(userName).to.equal('Ervin Howell')
        expect(userEmail).to.equal('Shanna@melissa.tv')
        expect(await comment.resolveAttribute('post.user.propDoesNotExist')).to.be.undefined
        try {
            await comment.resolveAttribute('post.user.nested.propDoesNotExist')
        } catch(e: any) {
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
        let group = await GroupResource.detail('1', { resolveRelatedDeep: true })
        // ...At this point, group has a cached user (ID 1)
        let user = await UserResource.detail('1', { resolveRelatedDeep: true })
        // And getting the user again will yield the same exact user in memory stored at cache[cacheKey] address
        expect(group.managers.users.resources[0] === user).to.be.true
    })

    it('handles empty values correctly', async () => {
        // Custom group resource
        const CustomGroupResource = BaseTestingResource.extend({
            endpoint: '/groups',
            related: {
                todos: TodoResource,
                users: UserResource,
                owner: UserResource,
            },
        })
        // ...that is created with empty lists and some emptyish values on related field
        const someGroup = new CustomGroupResource({
            name: 'Test Group',
            // This is what we're testing
            users: [], // empty list
            owner: null, // null
            todos: undefined,
        })

        expect(someGroup.get('owner')).to.be.null
        expect(someGroup.get('users')).to.be.instanceOf(CustomGroupResource.RelatedManagerClass)
        expect(someGroup.get('users').resources).to.be.empty
        expect(someGroup.get('todos')).to.be.undefined
    })

    it('correctly lists remote resources', async () => {
        const PostResourceDupe = PostResource.extend({})
        let result = await PostResourceDupe.list()
        result.resources.forEach((post) => {
            expect(post instanceof PostResourceDupe).to.be.true
            expect(post.id).to.exist
        })
    })

    it('calls relative list routes correctly', async () => {
        let filteredPostResult = await PostResource.wrap('/1', { user: 1 }).get()
        expect(filteredPostResult.config.method.toLowerCase()).to.equal('get')
        expect(filteredPostResult.config.url).to.equal('/posts/1?user=1')
        let optionsResult = await PostResource.wrap('/1', { user: 1 }).get({ headers: { 'X-Taco': true } })
        expect(optionsResult.config.headers['X-Taco']).to.be.true
        try {
            await PostResource.wrap('/does_not_____exist', { user: 1 }).post({ someBody: true })
        } catch(e: any) {
            expect(String(e.response.status)).to.equal('404')
            expect(e.config.method.toLowerCase()).to.equal('post')
            expect(e.config.url).to.equal('/posts/does_not_____exist?user=1')
            expect(JSON.parse(e.config.data)).to.eql({ someBody: true })
        }

        try {
            await PostResource.wrap('does_not_start_with_a_/').post()
        } catch(e: any) {
            expect(e.name).to.contain('AssertionError')
        }
    })

    it('calls relative detail routes correctly', async () => {
        let post = await PostResource.detail(1)
        let postResult = await post.wrap('/comments').get()
        let data = postResult.data as any
        expect(data).to.exist
        expect(data[0].post).to.equal(1)
        try {
            // Remove ID and try to run
            post.attributes.id = undefined
            await post.wrap('/comments').get()
        } catch(e: any) {
            expect(e.name).to.contain('AssertionError')
        }
    })

    it('can accept resource instances as value', async () => {
        let post = await PostResource.detail(80)
        let userDoesNotEqualPostUserId = post.attributes.user + 1
        let otherUser = await UserResource.detail(userDoesNotEqualPostUserId)
        post.set('user', otherUser)
        // Normalization should be turned off for PostResource, so newly set user should be an object
        expect('object' === typeof post.attributes.user).to.be.true
        expect(post.attributes.user).to.eql(otherUser.toJSON())
        expect(post.rel('user').canAutoResolve()).to.be.false
    })
})
