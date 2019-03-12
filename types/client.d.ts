import { ResourceLike, ResourceClassLike } from './index';
import { AxiosPromise, AxiosRequestConfig, AxiosResponse, AxiosError, AxiosInstance } from 'axios';
export * from 'axios';
export interface RequestConfig extends AxiosRequestConfig {
    useCache?: boolean;
    query?: any;
}
export interface ResourceResponse<T extends ResourceLike = ResourceLike> {
    response: AxiosResponse;
    resources: T[];
    count?: () => number;
    pages?: () => number;
    currentPage?: () => number;
    perPage?: () => number;
}
export declare type ExtractorFunction<T extends ResourceLike = ResourceLike> = (result: ResourceResponse['response']) => ResourceResponse<T>;
export declare class DefaultClient {
    axios: AxiosInstance;
    hostname: string;
    constructor(baseURL: string, config?: AxiosRequestConfig);
    negotiateContent(ResourceClass: ResourceClassLike): ExtractorFunction;
    list(ResourceClass: ResourceClassLike, options?: RequestConfig): Promise<ResourceResponse<ResourceLike>>;
    detail(ResourceClass: ResourceClassLike, id: string, options?: RequestConfig): Promise<ResourceResponse<import(".").default>>;
    get(path: string, options?: any): AxiosPromise<any>;
    put(path: string, body?: any, options?: AxiosRequestConfig): Promise<any>;
    post(path: string, body?: any, options?: AxiosRequestConfig): Promise<any>;
    patch(path: string, body?: any, options?: AxiosRequestConfig): Promise<any>;
    delete(path: string, options?: AxiosRequestConfig): Promise<any>;
    head(path: string, options?: AxiosRequestConfig): Promise<any>;
    options(path: string, options?: AxiosRequestConfig): any;
    onError(exception: Error | AxiosError): any;
}
export declare class JWTBearerClient extends DefaultClient {
    token: string;
    constructor(baseURL: string, token?: string, options?: RequestConfig);
}
