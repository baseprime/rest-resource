import Resource from '../index'

export function normalizerFactory<T extends string>(name: T, options: BaseNormalizerOptions = {}): BaseNormalizer {
    try {
        return new exports[name](options)
    } catch (e) {
        if (e instanceof TypeError) {
            throw new Error(`${name} is not a valid normalizer instance. Please see ${__filename} for valid choices`)
        } else {
            throw e
        }
    }
}

export class BaseNormalizer {
    normalizeTo: Function = String
    uniqueKey: string = 'id'
    nullable: boolean = true

    constructor({ uniqueKey = 'id' }: BaseNormalizerOptions = {}) {
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

        if (!Ctor && !this.nullable) {
            return this.normalizeTo()
        } else if (!Ctor) {
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
            return Boolean(value) ? 'true' : ''
        } else {
            return this.normalizeTo(value)
        }
    }
}

export class StringNormalizer extends BaseNormalizer {}

export class NumberNormalizer extends BaseNormalizer {
    nullable = false
    normalizeTo = Number
}

export class BooleanNormalizer extends StringNormalizer {
    nullable = false
    normalizeTo = Boolean
}

export class CurrencyNormalizer extends NumberNormalizer {
    normalize(value: any): string | string[] {
        let superVal = super.normalize(value)
        let intermediateVal = [].concat(superVal).map((val) => Number(val).toFixed(2))
        return Array.isArray(superVal) ? intermediateVal : intermediateVal.shift()
    }
}

export interface BaseNormalizerOptions {
    uniqueKey?: string
}

export type NormalizerFunc = (value: any) => any

export type ValidNormalizer = BaseNormalizer | NormalizerFunc

export type NormalizerDict = Record<string, ValidNormalizer>
