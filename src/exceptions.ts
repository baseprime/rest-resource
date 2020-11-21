export class BaseError extends Error {
    name: string
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
