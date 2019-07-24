import Resource from './index';
import { AxiosPromise, AxiosRequestConfig, AxiosResponse, AxiosError, AxiosInstance } from 'axios';
export * from 'axios';
export interface RequestConfig extends AxiosRequestConfig {
    useCache?: boolean;
    query?: any;
}
export interface ResourceResponse<T extends Resource = Resource> {
    response: AxiosResponse;
    resources: T[];
    count?: () => number;
    pages?: () => number;
    currentPage?: () => number;
    perPage?: () => number;
}
export declare type ExtractorFunction<T extends Resource = Resource> = (result: ResourceResponse['response']) => ResourceResponse<T>;
export declare class BaseClient {
    axios: AxiosInstance;
    hostname: string;
    constructor(baseURL: string, config?: AxiosRequestConfig);
    static extend<T, U>(this: U, classProps: T): U & T;
    negotiateContent(ResourceClass: typeof Resource): ExtractorFunction;
    list(ResourceClass: typeof Resource, options?: RequestConfig): Promise<ResourceResponse<Resource>>;
    detail(ResourceClass: typeof Resource, id: string, options?: RequestConfig): Promise<ResourceResponse<Resource>>;
    get(path: string, options?: any): AxiosPromise<any>;
    put(path: string, body?: any, options?: AxiosRequestConfig): Promise<any>;
    post(path: string, body?: any, options?: AxiosRequestConfig): Promise<any>;
    patch(path: string, body?: any, options?: AxiosRequestConfig): Promise<any>;
    delete(path: string, options?: AxiosRequestConfig): Promise<any>;
    head(path: string, options?: AxiosRequestConfig): Promise<any>;
    options(path: string, options?: AxiosRequestConfig): any;
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
