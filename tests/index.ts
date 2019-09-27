import { DefaultClient } from '../src/client'
import Resource from '../src/index'
export const TEST_PORT = process.env.TEST_PORT || 8099

export class TestingClient extends DefaultClient {
    requestTracker: any = {}

    get() {
        this.requestTracker[arguments[0]] = (this.requestTracker[arguments[0]] || 0) + 1
        // @ts-ignore
        return DefaultClient.prototype.get.apply(this, arguments)
    }
}

export const BaseTestingResource = Resource.extend({
    client: new TestingClient(`http://localhost:${TEST_PORT}`)
})
