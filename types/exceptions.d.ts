export declare class ImproperlyConfiguredError extends Error {
}
export declare class CacheError extends Error {
}
export declare class AttributeError extends TypeError {
}
export declare class ValidationError extends Error {
    field: string;
    constructor(fieldOrArray: string | Error[], message?: string);
}
export interface ValidationError {
    [index: string]: any;
}
