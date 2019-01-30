const httpErrors = require('http-errors')
export default class JSONClient {
    constructor(hostname) {
        this.hostname = ''
        this.token = ''
        this.hostname = hostname || `${window.location.protocol}//${window.location.hostname}:${window.location.port}`
    }
    apiCall(path, options) {
        return fetch(`${this.hostname}${path}`, options)
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
    post(path, json = {}, options) {
        const opts = Object.assign(
            {},
            {
                body: JSON.stringify(json),
                method: 'POST',
            },
            options
        )
        return this.apiCall(path, opts)
    }
    put(path, json = {}, options) {
        const opts = Object.assign(
            {},
            {
                body: JSON.stringify(json),
                method: 'PUT',
            },
            options
        )
        return this.apiCall(path, opts)
    }
    patch(path, json = {}, options) {
        const opts = Object.assign(
            {},
            {
                body: JSON.stringify(json),
                method: 'PATCH',
            },
            options
        )
        return this.apiCall(path, opts)
    }
    del(path, options) {
        const opts = Object.assign(
            {},
            {
                method: 'DELETE',
            },
            options
        )
        return this.apiCall(path, opts)
    }
    onError(exception) {
        if (exception && exception.response && exception.response.status >= 500) {
            throw exception
        } else if (exception && exception.response) {
            return exception.response
        } else {
            // Do nothing -- this is meant to be overridden
        }
    }
}
//# sourceMappingURL=index.js.map
