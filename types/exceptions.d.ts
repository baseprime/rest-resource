export declare class BaseError extends Error {
    name: string;
    /**
     * This exists because Webpack creates a whole new copy of this class, except when you're
     *   comparing types in memory (eg. exception instanceof ValidationError) where exception is
     *   a transpiled instance of this class, and ValidationError is imported via non-transpiled
     *   methods (TypeScript). We need a way to check if either are instanceof ValidationError
     * @param exception
     */
    static isInstance(exception: Error): boolean;
}
export declare class ImproperlyConfiguredError extends BaseError {
    name: string;
}
export declare class CacheError extends BaseError {
    name: string;
}
export declare class AttributeError extends BaseError {
    name: string;
}
export declare class ValidationError extends BaseError {
    name: string;
    field: string;
    constructor(fieldOrArray: string | Error[], message?: string);
}
export interface ValidationError {
    [index: string]: any;
}
