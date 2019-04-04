export declare class ImproperlyConfiguredError extends Error {
    name: string;
}
export declare class CacheError extends Error {
    name: string;
}
export declare class AttributeError extends TypeError {
    name: string;
}
export declare class ValidationError extends Error {
    name: string;
    field: string;
    constructor(fieldOrArray: string | Error[], message?: string);
    /**
     * This exists because Webpack creates a whole new copy of this class, except when you're
     *   comparing types in memory (eg. exception instanceof ValidationError) where exception is
     *   a transpiled instance of this class, and ValidationError is imported via non-transpiled
     *   methods (TypeScript). We need a way to check if either are instanceof ValidationError
     * @param exception
     */
    static isValidationError(exception: Error): boolean;
}
export interface ValidationError {
    [index: string]: any;
}
