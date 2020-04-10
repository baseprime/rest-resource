import Resource, { ListResponse } from './index';
import { AxiosPromise, AxiosRequestConfig, AxiosResponse, AxiosError, AxiosInstance } from 'axios';
export * from 'axios';
export interface RequestConfig extends AxiosRequestConfig {
    useCache?: boolean;
    query?: any;
}
export interface ResourceResponse<T extends Resource, U extends any = any> extends Record<string, any> {
    response: AxiosResponse<U>;
    resources: T[];
    count?: () => number;
    pages?: () => number;
    currentPage?: () => number;
    perPage?: () => number;
    next?: () => Promise<ResourceResponse<T, U>>;
    previous?: () => Promise<ResourceResponse<T, U>>;
}
export declare type ExtractorFunction<T extends Resource, U extends any = any> = (result: ResourceResponse<T, U>['response']) => ResourceResponse<T, U>;
export declare class BaseClient {
    axios: AxiosInstance;
    config: AxiosRequestConfig;
    constructor(baseURL: string, config?: AxiosRequestConfig);
    hostname: string;
    static extend<T, U>(this: U, classProps: T): U & T;
    negotiateContent<T extends typeof Resource>(ResourceClass: T): ExtractorFunction<InstanceType<T>>;
    /**
     * Client.prototype.list() and Client.prototype.detail() are the primary purpose of defining these here. Simply runs a GET on the list route path (eg. /users) and negotiates the content
     * @param ResourceClass
     * @param options
     */
    list<T extends typeof Resource, U = any>(ResourceClass: T, options?: RequestConfig): ListResponse<T>;
    /**
     * Client.prototype.detail() and Client.prototype.list() are the primary purpose of defining these here. Simply runs a GET on the detail route path (eg. /users/123) and negotiates the content
     * @param ResourceClass
     * @param options
     */
    detail<T extends typeof Resource, U = any>(ResourceClass: T, id: string, options?: RequestConfig): Promise<ResourceResponse<InstanceType<T>, any>>;
    get<T = any>(path: string, options?: AxiosRequestConfig): AxiosPromise<T>;
    put<T = any>(path: string, body?: any, options?: AxiosRequestConfig): AxiosPromise<T>;
    post<T = any>(path: string, body?: any, options?: AxiosRequestConfig): AxiosPromise<T>;
    patch<T = any>(path: string, body?: any, options?: AxiosRequestConfig): AxiosPromise<T>;
    delete<T = any>(path: string, options?: AxiosRequestConfig): AxiosPromise<T>;
    head<T = any>(path: string, options?: AxiosRequestConfig): AxiosPromise<T>;
    options<T = any>(path: string, options?: AxiosRequestConfig): AxiosPromise<T>;
    bindMethodsToPath(relativePath: string): {
        get: (options?: AxiosRequestConfig) => AxiosPromise<{}>;
        post: (body?: any, options?: AxiosRequestConfig) => AxiosPromise<{}>;
        put: (body?: any, options?: AxiosRequestConfig) => AxiosPromise<{}>;
        patch: (body?: any, options?: AxiosRequestConfig) => AxiosPromise<{}>;
        head: (options?: AxiosRequestConfig) => AxiosPromise<{}>;
        options: (options?: AxiosRequestConfig) => AxiosPromise<{}>;
        delete: (options?: AxiosRequestConfig) => AxiosPromise<{}>;
    };
    onError(exception: Error | AxiosError): any;
}
export declare class DefaultClient extends BaseClient {
}
export declare class JWTBearerClient extends BaseClient {
    token: string;
    constructor(baseURL: string, token?: string, options?: RequestConfig);
    getTokenPayload(): any;
    tokenIsExpired(): boolean;
    tokenIsValid(): boolean;
}
