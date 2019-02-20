import { ResourceLike, ResourceClassLike } from './index'
import axios, { AxiosPromise, AxiosRequestConfig, AxiosResponse } from 'axios'

export interface RequestConfig extends AxiosRequestConfig {
    useCache?: boolean
    query?: any
}

export interface ResourceResponse<T extends ResourceLike = ResourceLike> {
    response: AxiosResponse
    resources: T[],
    count?: () => number
    pages?: () => number
    currentPage?: () => number
    perPage?: () => number
}

export type ExtractorFunction<T extends ResourceLike = ResourceLike> = (result: ResourceResponse['response']) => ResourceResponse<T>

export class DefaultClient {
    axios: any

    constructor(baseURL: string, config: AxiosRequestConfig = {}) {
        let opts = Object.assign({ baseURL }, config)
        this.axios = axios.create(opts)
    }

    negotiateContent(ResourceClass: ResourceClassLike): ExtractorFunction {
        // Should always return a function
        return (response: ResourceResponse['response']) => {
            let objects: ResourceLike[] = []
            if(Array.isArray(response.data)) {
                response.data.forEach((attributes) => objects.push(new ResourceClass(attributes)))
            } else {
                objects.push(new ResourceClass(response.data))
            }

            return {
                response,
                resources: objects,
                count: () => response.headers['Pagination-Count'],
                pages: () => Math.ceil(response.headers['Pagination-Count'] / response.headers['Pagination-Limit']),
                currentPage: () => response.headers['Pagination-Page'],
                perPage: () => response.headers['Pagination-Limit'],
            } as ResourceResponse<ResourceLike>
        }
    }

    list(ResourceClass: ResourceClassLike, options: RequestConfig = {}): Promise<ResourceResponse<ResourceLike>> {
        return this.get(ResourceClass.getListRoutePath(options.query)).then(this.negotiateContent(ResourceClass))
    }

    detail(ResourceClass: ResourceClassLike, id: string, options: RequestConfig = {}) {
        return this.get(ResourceClass.getDetailRoutePath(id, options.query)).then(this.negotiateContent(ResourceClass))
    }

    get(path: string, options: any = {}): AxiosPromise<any> {
        return this.axios.get(path, options).catch((e: Error) => this.onError(e))
    }

    put(path: string, body: any = {}, options: AxiosRequestConfig = {}) {
        return this.axios.put(path, body, options).catch((e: Error) => this.onError(e))
    }
    post(path: string, body: any = {}, options: AxiosRequestConfig = {}) {
        return this.axios.post(path, body, options).catch((e: Error) => this.onError(e))
    }

    patch(path: string, body: any = {}, options: AxiosRequestConfig = {}) {
        return this.axios.patch(path, body, options).catch((e: Error) => this.onError(e))
    }

    delete(path: string, options: AxiosRequestConfig = {}) {
        return this.axios.delete(path, options).catch((e: Error) => this.onError(e))
    }

    head(path: string, options: AxiosRequestConfig = {}) {
        return this.axios.head(path, options).catch((e: Error) => this.onError(e))
    }

    options(path: string, options: AxiosRequestConfig = {}) {
        return this.axios.options(path, options).catch((e: Error) => this.onError(e))
    }

    onError(exception: Error) {
        throw exception
    }
}

export class JWTBearerClient extends DefaultClient {
    // This is just a basic client except we're including a token in the requests
    constructor(baseURL: string, token: string = '', options: RequestConfig = {}) {
        let headers = Object.assign({
            'Authorization': `Bearer ${token}`
        }, options.headers)
        options.headers = headers
        super(baseURL, options)
    }
}
