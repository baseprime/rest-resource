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
}

export interface ValidationError {
    [index:string]: any
}
