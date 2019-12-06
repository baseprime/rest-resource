import { expect } from 'chai'
import { BaseTestingResource } from '..'

describe('Environment', () => {

    it('testing server is running', async () => {
        let response = await BaseTestingResource.client.get('/users')
        expect(response.status, 'Testing server is not running. Run `npm run test-server`').to.equal(200)
    })
})
