import JSONClient from './index';
export default class BearerClient extends JSONClient {
    constructor(hostname: string, token: string);
    apiCall(path: string, options?: any): Promise<any>;
}
