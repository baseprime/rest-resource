import Resource, { ListResponse } from './index'
import axios, { AxiosPromise, AxiosRequestConfig, AxiosResponse, AxiosError, AxiosInstance } from 'axios'

export * from 'axios'

export interface RequestConfig extends AxiosRequestConfig {
    useCache?: boolean
    query?: any
}

export interface ResourceResponse<T extends Resource, U extends any = any> extends Record<string, any> {
    response: AxiosResponse<U>
    resources: T[]
    count?: () => number
    pages?: () => number
    currentPage?: () => number
    perPage?: () => number
    next?: () => Promise<ResourceResponse<T, U>>
    previous?: () => Promise<ResourceResponse<T, U>>
}

export type ExtractorFunction<T extends Resource, U extends any = any> = (result: ResourceResponse<T, U>['response']) => ResourceResponse<T, U>

export class BaseClient {
    axios: AxiosInstance
    config: AxiosRequestConfig = {}

    constructor(baseURL: string, config: AxiosRequestConfig = {}) {
        this.config = Object.assign({ baseURL }, config)
        this.axios = axios.create(this.config)
    }

    get hostname() {
        return this.config.baseURL
    }

    set hostname(value: string) {
        this.config.baseURL = value
        this.axios = axios.create(this.config)
    }

    static extend<T, U>(this: U, classProps: T): U & T {
        // @todo Figure out typings here -- this works perfectly but typings are not happy
        // @ts-ignore
        return Object.assign(class extends this {}, classProps)
    }

    negotiateContent<T extends typeof Resource>(ResourceClass: T): ExtractorFunction<InstanceType<T>> {
        // Should always return a function
        return (response: ResourceResponse<InstanceType<T>>['response']) => {
            let objects: InstanceType<T>[] = []
            if (Array.isArray(response.data)) {
                response.data.forEach((attributes) => objects.push(new ResourceClass(attributes) as InstanceType<T>))
            } else {
                objects.push(new ResourceClass(response.data) as InstanceType<T>)
            }

            return {
                response,
                resources: objects,
                count: () => response.headers['Pagination-Count'],
                pages: () => Math.ceil(response.headers['Pagination-Count'] / response.headers['Pagination-Limit']),
                currentPage: () => response.headers['Pagination-Page'],
                perPage: () => response.headers['Pagination-Limit'],
            } as ResourceResponse<InstanceType<T>>
        }
    }

    /**
     * Client.prototype.list() and Client.prototype.detail() are the primary purpose of defining these here. Simply runs a GET on the list route path (eg. /users) and negotiates the content
     * @param ResourceClass 
     * @param options 
     */
    list<T extends typeof Resource, U = any>(ResourceClass: T, options: RequestConfig = {}): ListResponse<T> {
        return this.get<U>(ResourceClass.getListRoutePath(options.query), options).then(this.negotiateContent(ResourceClass))
    }

    /**
     * Client.prototype.detail() and Client.prototype.list() are the primary purpose of defining these here. Simply runs a GET on the detail route path (eg. /users/123) and negotiates the content
     * @param ResourceClass 
     * @param options 
     */
    detail<T extends typeof Resource, U = any>(ResourceClass: T, id: string, options: RequestConfig = {}) {
        return this.get<U>(ResourceClass.getDetailRoutePath(id, options.query), options).then(this.negotiateContent(ResourceClass))
    }

    get<T = any>(path: string, options: AxiosRequestConfig = {}): AxiosPromise<T> {
        return this.axios.get<T>(path, options).catch((e: Error) => this.onError(e))
    }

    put<T = any>(path: string, body: any = {}, options: AxiosRequestConfig = {}): AxiosPromise<T> {
        return this.axios.put<T>(path, body, options).catch((e: Error) => this.onError(e))
    }
    post<T = any>(path: string, body: any = {}, options: AxiosRequestConfig = {}): AxiosPromise<T> {
        return this.axios.post<T>(path, body, options).catch((e: Error) => this.onError(e))
    }

    patch<T = any>(path: string, body: any = {}, options: AxiosRequestConfig = {}): AxiosPromise<T> {
        return this.axios.patch<T>(path, body, options).catch((e: Error) => this.onError(e))
    }

    delete<T = any>(path: string, options: AxiosRequestConfig = {}): AxiosPromise<T> {
        return this.axios.delete(path, options).catch((e: Error) => this.onError(e))
    }

    head<T = any>(path: string, options: AxiosRequestConfig = {}): AxiosPromise<T> {
        return this.axios.head(path, options).catch((e: Error) => this.onError(e))
    }

    options<T = any>(path: string, options: AxiosRequestConfig = {}): AxiosPromise<T> {
        // @ts-ignore -- Axios forgot to add options to AxiosInstance interface
        return this.axios.options(path, options).catch((e: Error) => this.onError(e))
    }

    // Optionally catch all errors in client class (default: rethrow)
    onError(exception: Error | AxiosError): any {
        throw exception
    }
}

export class DefaultClient extends BaseClient {}

export class JWTBearerClient extends BaseClient {
    token: string
    // This is just a basic client except we're including a token in the requests
    constructor(baseURL: string, token: string = '', options: RequestConfig = {}) {
        let headers = Object.assign(
            {
                Authorization: `Bearer ${token}`,
            },
            options.headers
        )
        options.headers = headers
        super(baseURL, options)
        this.token = token
    }

    getTokenPayload(): any {
        try {
            let jwtPieces = this.token.split('.')
            let payloadBase64 = jwtPieces[1]
            let payloadBuffer = Buffer.from(payloadBase64, 'base64').toString()
            return JSON.parse(payloadBuffer.toString())
        } catch (e) {
            return undefined
        }
    }

    tokenIsExpired(): boolean {
        try {
            let payload = this.getTokenPayload()
            let nowInSeconds = Math.floor(Date.now() / 1000)
            return payload.exp < nowInSeconds
        } catch (e) {
            return true
        }
    }

    tokenIsValid(): boolean {
        return this.token && !this.tokenIsExpired()
    }
}
