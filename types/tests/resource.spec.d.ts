import Resource from '../index';
import { DefaultClient } from '../client';
export declare class BaseTestingResource extends Resource {
    static getClient(): DefaultClient;
}
export declare class UserResource extends BaseTestingResource {
    static endpoint: string;
}
export declare class PostResource extends BaseTestingResource {
    static endpoint: string;
    static related: {
        userId: typeof UserResource;
    };
}
