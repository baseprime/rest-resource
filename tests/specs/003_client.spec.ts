import { expect } from 'chai'
import { TestingClient, BaseTestingResource, PostResource, UserResource, CommentResource } from '..'


describe('Client', () => {

    it('resource client classes/subclasses updates axios baseURL', async () => {
        class CustomClient extends TestingClient {}
        class CustomResource extends BaseTestingResource {
            static client: CustomClient = new CustomClient('/')
        }
        expect(CustomResource.client).to.be.instanceOf(CustomClient)
        CustomResource.client.hostname = 'http://some-nonexistend-domain'
        expect(CustomResource.client.config.baseURL).to.equal('http://some-nonexistend-domain')
        expect(CustomResource.client.axios.defaults.baseURL).to.equal('http://some-nonexistend-domain')
        class SomeExtendedResource extends CustomResource {}
        expect(SomeExtendedResource.client).to.be.instanceOf(CustomClient)
        expect(SomeExtendedResource.client.config.baseURL).to.equal('http://some-nonexistend-domain')
        expect(SomeExtendedResource.client.axios.defaults.baseURL).to.equal('http://some-nonexistend-domain')
        CustomResource.client.hostname = 'http://localhost'
        expect(SomeExtendedResource.client.hostname).to.equal('http://localhost')
        expect(SomeExtendedResource.client.config.baseURL).to.equal('http://localhost')
        expect(SomeExtendedResource.client.axios.defaults.baseURL).to.equal('http://localhost')
    })

})
