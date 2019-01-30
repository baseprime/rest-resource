const httpErrors = require('http-errors')

export interface RequestOptions {
    query?: any
    method?: string
    useCache?: boolean
    [x: string]: any
}

export default class JSONClient {
    hostname: string = ''
    token: string = ''

    constructor(hostname: string) {
        this.hostname = hostname || `${window.location.protocol}//${window.location.hostname}:${window.location.port}`
    }

    apiCall(path: string, options?: any): Promise<any> {
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

    post(path: string, json: any = {}, options?: any): Promise<any> {
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

    put(path: string, json: any = {}, options?: any): Promise<any> {
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

    patch(path: string, json: any = {}, options?: any): Promise<any> {
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

    del(path: string, options?: any): Promise<any> {
        const opts = Object.assign(
            {},
            {
                method: 'DELETE',
            },
            options
        )
        return this.apiCall(path, opts)
    }

    onError(exception: any) {
        if (exception && exception.response && exception.response.status >= 500) {
            throw exception
        } else if (exception && exception.response) {
            return exception.response
        } else {
            // Do nothing -- this is meant to be overridden
        }
    }
}
