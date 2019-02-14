import { ResourceLike } from './index'
import axios, { AxiosPromise, AxiosRequestConfig } from 'axios'

export interface RequestConfig extends AxiosRequestConfig {
    useCache?: boolean
    query?: any
}

export interface ResourceResponse<T extends ResourceLike = ResourceLike> {
    response: any
    objects: T[]
}

export class DefaultClient {
    _axios: any

    constructor(baseURL: string, config: AxiosRequestConfig = {}) {
        let opts = Object.assign({ baseURL }, config)
        this._axios = axios.create(opts)
    }

    get(path: string, options: any = {}): AxiosPromise<any> {
        return this._axios.get(path, options).catch((e: Error) => this.onError(e))
    }

    put(path: string, body: any = {}, options: AxiosRequestConfig = {}) {
        return this._axios.put(path, body, options).catch((e: Error) => this.onError(e))
    }
    post(path: string, body: any = {}, options: AxiosRequestConfig = {}) {
        return this._axios.post(path, body, options).catch((e: Error) => this.onError(e))
    }

    patch(path: string, body: any = {}, options: AxiosRequestConfig = {}) {
        return this._axios.patch(path, body, options).catch((e: Error) => this.onError(e))
    }

    delete(path: string, options: AxiosRequestConfig = {}) {
        return this._axios.delete(path, options).catch((e: Error) => this.onError(e))
    }

    onError(exception: Error) {
        throw exception
    }
}

export class JWTBearerClient extends DefaultClient {
    constructor(baseURL: string, token: string = '', options: RequestConfig = {}) {
        let headers = Object.assign({
            'Authorization': `Bearer ${token}`
        }, options.headers)
        options.headers = headers
        super(baseURL, options)
    }
}
