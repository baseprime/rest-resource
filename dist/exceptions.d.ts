export declare class BaseError extends Error {
    name: string;
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
