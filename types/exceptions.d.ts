export declare class ImproperlyConfiguredError extends Error {
}
export declare class CacheError extends Error {
}
export declare class AttributeError extends TypeError {
}
export declare class ValidationError extends Error {
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
