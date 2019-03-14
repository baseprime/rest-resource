export class ImproperlyConfiguredError extends Error {}
export class CacheError extends Error {}
export class AttributeError extends TypeError {}

export class ValidationError extends Error {
    field: string
    constructor(fieldOrArray: string | Error[], message: string = '') {
        super(message)
        this.name = 'ValidationError'
        if(Array.isArray(fieldOrArray)) {
            this.message = fieldOrArray.join('\n')
        } else if(!this.message && fieldOrArray) {
            this.message = `${fieldOrArray}: This field is not valid`
            this.field = fieldOrArray
        } else if(this.message && 'string' === typeof fieldOrArray) {
            this.message = `${fieldOrArray}: ${this.message}`
        }
    }

    /**
     * This exists because Webpack creates a whole new copy of this class, except when you're 
     *   comparing types in memory (eg. exception instanceof ValidationError) where exception is 
     *   a transpiled instance of this class, and ValidationError is imported via non-transpiled
     *   methods (TypeScript). We need a way to check if either are instanceof ValidationError
     * @param exception 
     */
    static isValidationError(exception: Error) {
        return (exception.name && exception.name === 'ValidationError') || exception instanceof ValidationError
    }
}

export interface ValidationError {
    [index:string]: any
}
