import Resource from './index'

export interface BaseFormatterOptions {
    uniqueKey?: string
}

export function formatFactory<T extends string>(name: T, options: BaseFormatterOptions = {}): BaseFormatter {
    try {
        return new exports[name](options)
    } catch (e) {
        if (e instanceof TypeError) {
            throw new Error(`${name} is not a valid formatter. Please see ${__filename} for valid choices`)
        } else {
            throw e
        }
    }
}

export class BaseFormatter {
    normalizeTo: Function = String
    uniqueKey: string = 'id'

    constructor({ uniqueKey = 'id' }: BaseFormatterOptions = {}) {
        this.uniqueKey = uniqueKey
    }

    getType(value: any) {
        if (value === null || value === undefined) {
            return false
        }

        return value.constructor
    }

    normalize(value: any): any {
        let Ctor = this.getType(value)

        if (!Ctor) {
            return value
        }

        if (Ctor === this.normalizeTo) {
            return value
        } else if (Ctor === Resource) {
            return value.id
        } else if (Ctor === Object && Ctor !== null) {
            return this.normalize(value[this.uniqueKey])
        } else if (Ctor === Array) {
            return value.map((item: any) => this.normalize(item))
        } else if (Ctor === Boolean) {
            return Boolean(value) ? 'True' : ''
        } else {
            return this.normalizeTo(value)
        }
    }
}

export class StringFormatter extends BaseFormatter {}

export class NumberFormatter extends BaseFormatter {
    normalizeTo = Number
}

export class BooleanFormatter extends StringFormatter {
    normalizeTo = Boolean
}

export class CurrencyFormatter extends NumberFormatter {
    normalize(value: any): string | string[] {
        return super.normalize(value).toFixed(2)
    }
}
