import { expect } from 'chai'
import { GroupResource, TodoResource, PostResource, UserResource, CommentResource, CommentMetaMetaMetaMeta } from '..'

describe('Related', () => {
    it('managers next() all() and resolve() work correctly', async () => {
        const group = await GroupResource.detail('2')
        const todosManager = group.managers.todos
        const originalBatchSize = todosManager.batchSize
        const thisBatchSize = 20
        const expectedTodosInGroup = 90
        const compareIDOfTodoOnFirstPage = String(thisBatchSize + 1)
        const compareIDOfTodoOnLastPage = String(expectedTodosInGroup)
        todosManager.batchSize = thisBatchSize
        expect(todosManager.length).to.equal(expectedTodosInGroup) // If this returns false, make sure the group ID 2 listed in fixtures.json has exactly 90 IDs in it!
        expect(GroupResource.client.requestTracker[TodoResource.getDetailRoutePath(compareIDOfTodoOnFirstPage)]).to.be.undefined
        // Calling resolve() should only get the first page
        await todosManager.resolve()
        expect(GroupResource.client.requestTracker[TodoResource.getDetailRoutePath(compareIDOfTodoOnFirstPage)]).to.equal(1)
        expect(GroupResource.client.requestTracker[TodoResource.getDetailRoutePath(compareIDOfTodoOnLastPage)]).to.be.undefined
        await todosManager.next()
        expect(GroupResource.client.requestTracker[TodoResource.getDetailRoutePath(compareIDOfTodoOnLastPage)]).to.be.undefined
        await todosManager.next()
        expect(GroupResource.client.requestTracker[TodoResource.getDetailRoutePath(compareIDOfTodoOnLastPage)]).to.be.undefined
        // Now that we've retrieved a few pages, compareIDOfTodoOnLastPage should still not've been retrieved. Now we'll use all() to get the rest
        await todosManager.all()
        // ...and assert that compareIDOfTodoOnLastPage is now loaded
        expect(GroupResource.client.requestTracker[TodoResource.getDetailRoutePath(compareIDOfTodoOnLastPage)]).to.equal(1)
        // Reset batch size for later tests
        todosManager.batchSize = originalBatchSize
    })

    it('related object lookup has correct progression', async () => {
        let post = await PostResource.detail('40')
        expect(post.get('user')).to.be.string
        let samePost = await PostResource.detail('40', { resolveRelated: true })
        expect(samePost.get('user')).to.be.instanceOf(UserResource)
    })

    it('correctly gets related objects and managers', async () => {
        let post = await PostResource.detail('1')
        let group = await GroupResource.detail('1')
        expect(post.get('user')).to.be.instanceOf(PostResource.RelatedManagerClass)
        await post.resolveRelated()
        await group.resolveRelated()
        expect(post.get('user')).to.be.instanceOf(UserResource)
        expect(post.managers.user).to.be.instanceOf(PostResource.RelatedManagerClass)
        expect(group.managers.users).to.be.instanceOf(GroupResource.RelatedManagerClass)
        expect(group.get('users')).to.be.instanceOf(GroupResource.RelatedManagerClass)
        expect(group.managers.users.many).to.be.true
        expect(group.managers.users.resolved).to.be.true
        expect(group.managers.users.primaryKeys.length).to.equal(3)
        expect(group.get('name')).to.equal('Test group')
        expect(group.get('users.name')).to.be.instanceOf(Array)
        expect(group.get('users').resources[0]).to.be.instanceOf(UserResource)
    })

    it('can get related objects recursively', async () => {
        const requestTracker = CommentResource.client.requestTracker
        // No requests to /comments yet -- so let's ensure request count is undefined
        expect(requestTracker[CommentResource.getDetailRoutePath('250')]).to.be.undefined
        // GET comment, but recursively get related objects too -- Comment #250 should be post #50 which should be user #5 (all of which shouldn't have been retrieved yet)
        let comment = await CommentResource.detail('250', { resolveRelatedDeep: true })
        let post = comment.get('post')
        let user = post.get('user')
        expect(post).to.be.instanceOf(PostResource)
        expect(user).to.be.instanceOf(UserResource)
    })

    it('can define Resource.related with a function', async () => {
        let relatedFuncRan = false
        const CustomTodoResource = TodoResource.extend({
            _cache: {},
            related() {
                relatedFuncRan = true
                return {
                    user: UserResource,
                }
            },
        })

        const todo = await CustomTodoResource.detail(55)
        expect(relatedFuncRan).to.be.true
        expect(await todo.resolveAttribute('user.username')).to.equal('Samantha')
    })

    it('auto-resolves nested objects (single)', async () => {
        // Copy the GroupResource and redefine related.owner
        const CustomGroupResource = GroupResource.extend({
            related: Object.assign(GroupResource.related, {
                owner: {
                    to: UserResource,
                    nested: true, // This is what we're testing
                },
            }),
        })

        let group = await CustomGroupResource.detail(1)
        expect(group.get('owner.username')).to.equal('Bret')
        expect(group.managers.owner).to.exist
        expect(group.managers.owner.resolved).to.be.true

        try {
            new CustomGroupResource({
                id: 1,
                name: 'Test group',
                owner: {
                    // No ID here
                    name: 'Leanne Graham',
                },
            })
        } catch (e: any) {
            // Make sure error is thrown
            expect(e.name).to.contain('AssertionError')
        }
    })

    it('auto-resolves nested objects (many)', async () => {
        const CustomGroupResource = GroupResource.extend({
            _cache: {},
            related: Object.assign(GroupResource.related, {
                todos: {
                    to: TodoResource,
                    nested: true,
                },
            }),
        })

        let group = await CustomGroupResource.detail(1)
        expect(group.get('todos.id')).to.eql([1, 2])
    })

    it('can resolve really really deeply nested attributes', async () => {
        let meta = await CommentMetaMetaMetaMeta.detail(1)
        expect('Leanne Graham' === await meta.resolveAttribute('commentmetametameta.commentmetameta.commentmeta.comment.post.user.name'))
    })
})
