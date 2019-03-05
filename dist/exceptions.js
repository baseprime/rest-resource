export class ImproperlyConfiguredError extends Error {
}
export class CacheError extends Error {
}
export class AttributeError extends TypeError {
}
export class ValidationError extends Error {
    constructor(fieldOrArray, message = '') {
        super(message);
        if (Array.isArray(fieldOrArray)) {
            this.message = fieldOrArray.join('\n');
        }
        else if (!this.message && fieldOrArray) {
            this.message = `${fieldOrArray}: This field is not valid`;
            this.field = fieldOrArray;
        }
    }
}
//# sourceMappingURL=exceptions.js.map