import Resource from './index'
import axios, { AxiosPromise, AxiosRequestConfig, AxiosResponse, AxiosError, AxiosInstance } from 'axios'

export * from 'axios'

export interface RequestConfig extends AxiosRequestConfig {
    useCache?: boolean
    query?: any
}

export interface ResourceResponse<T extends Resource = Resource> {
    response: AxiosResponse
    resources: T[]
    count?: () => number
    pages?: () => number
    currentPage?: () => number
    perPage?: () => number
}

export type ExtractorFunction<T extends Resource = Resource> = (result: ResourceResponse['response']) => ResourceResponse<T>

export class BaseClient {
    axios: AxiosInstance
    hostname: string

    constructor(baseURL: string, config: AxiosRequestConfig = {}) {
        let opts = Object.assign({ baseURL }, config)
        this.hostname = opts.baseURL
        this.axios = axios.create(opts)
    }

    static extend<T, U>(this: U, classProps: T): U & T {
        // @todo Figure out typings here -- this works perfectly but typings are not happy
        // @ts-ignore
        return Object.assign(class extends this {}, classProps)
    }

    negotiateContent<T extends typeof Resource = typeof Resource>(ResourceClass: T): ExtractorFunction<InstanceType<T>> {
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

    list<T extends typeof Resource = typeof Resource>(ResourceClass: T, options: RequestConfig = {}): Promise<ResourceResponse<InstanceType<T>>> {
        return this.get(ResourceClass.getListRoutePath(options.query)).then(this.negotiateContent(ResourceClass))
    }

    detail<T extends typeof Resource = typeof Resource>(ResourceClass: T, id: string, options: RequestConfig = {}) {
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
        // @ts-ignore -- Axios forgot to add options to AxiosInstance interface
        return this.axios.options(path, options).catch((e: Error) => this.onError(e))
    }

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
            let payloadBuffer = new Buffer(payloadBase64, 'base64')
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
