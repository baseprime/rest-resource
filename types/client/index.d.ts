export interface RequestOptions {
    query?: any;
    method?: string;
    useCache?: boolean;
    [x: string]: any;
}
export default class JSONClient {
    hostname: string;
    token: string;
    constructor(hostname: string);
    apiCall(path: string, options?: any): Promise<any>;
    post(path: string, json?: any, options?: any): Promise<any>;
    put(path: string, json?: any, options?: any): Promise<any>;
    patch(path: string, json?: any, options?: any): Promise<any>;
    del(path: string, options?: any): Promise<any>;
    onError(exception: any): any;
}
