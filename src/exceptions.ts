export class BaseError extends Error {
    name: string
    /**
     * This exists because Webpack creates a whole new copy of this class, except when you're
     *   comparing types in memory (eg. exception instanceof ValidationError) where exception is
     *   a transpiled instance of this class, and ValidationError is imported via non-transpiled
     *   methods (TypeScript). We need a way to check if either are instanceof ValidationError
     * @param exception
     */
    static isInstance(exception: Error) {
        return (exception.name && exception.name === this.name) || exception instanceof this
    }
}

export class ImproperlyConfiguredError extends BaseError {
    name: string = 'ImproperlyConfiguredError'
}

export class CacheError extends BaseError {
    name: string = 'CacheError'
}

export class AttributeError extends BaseError {
    name: string = 'AttributeError'
}

export class ValidationError extends BaseError {
    name: string = 'ValidationError'
    field: string
    constructor(fieldOrArray: string | Error[], message: string = '') {
        super(message)
        if (Array.isArray(fieldOrArray)) {
            this.message = fieldOrArray.join('\n')
        } else if (!this.message && fieldOrArray) {
            this.message = `${fieldOrArray}: This field is not valid`
            this.field = fieldOrArray
        } else if (this.message && 'string' === typeof fieldOrArray) {
            this.message = `${fieldOrArray}: ${this.message}`
            this.field = fieldOrArray
        }
    }
}

export interface ValidationError {
    [index: string]: any
}
