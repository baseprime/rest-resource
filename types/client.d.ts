import { ResourceLike } from './index';
import { AxiosPromise, AxiosRequestConfig, AxiosResponse } from 'axios';
export interface RequestConfig extends AxiosRequestConfig {
    useCache?: boolean;
    query?: any;
}
export interface ResourceResponse<T extends ResourceLike = ResourceLike> {
    response: AxiosResponse;
    objects: T[];
}
export declare class DefaultClient {
    _axios: any;
    constructor(baseURL: string, config?: AxiosRequestConfig);
    get(path: string, options?: any): AxiosPromise<any>;
    put(path: string, body?: any, options?: AxiosRequestConfig): any;
    post(path: string, body?: any, options?: AxiosRequestConfig): any;
    patch(path: string, body?: any, options?: AxiosRequestConfig): any;
    delete(path: string, options?: AxiosRequestConfig): any;
    onError(exception: Error): void;
}
export declare class JWTBearerClient extends DefaultClient {
    constructor(baseURL: string, token?: string, options?: RequestConfig);
}
