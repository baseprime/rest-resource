import BaseClient from './index'
const httpErrors = require('http-errors')
export default class BearerClient extends BaseClient {
    apiCall(path, options) {
        const opts = options || {}
        opts.headers = Object.assign({}, opts.headers, {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': opts['content-type'] || 'application/json',
        })
        return fetch(`${this.hostname}${path}`, opts)
            .then((response) => {
                if (!response.ok) {
                    const err = httpErrors(response.status, response.statusText, {
                        response,
                    })
                    return this.onError(err)
                }
                return response.json().then((json) => ({
                    json,
                    response,
                }))
            })
            .catch((e) => {
                this.onError(e)
            })
    }
}
//# sourceMappingURL=bearer.js.map
