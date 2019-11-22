export declare function normalizerFactory<T extends string>(name: T, options?: BaseNormalizerOptions): BaseNormalizer;
export declare class BaseNormalizer {
    normalizeTo: Function;
    uniqueKey: string;
    nullable: boolean;
    constructor({ uniqueKey }?: BaseNormalizerOptions);
    getType(value: any): any;
    normalize(value: any): any;
}
export declare class StringNormalizer extends BaseNormalizer {
}
export declare class NumberNormalizer extends BaseNormalizer {
    nullable: boolean;
    normalizeTo: NumberConstructor;
}
export declare class BooleanNormalizer extends StringNormalizer {
    nullable: boolean;
    normalizeTo: BooleanConstructor;
}
export declare class CurrencyNormalizer extends NumberNormalizer {
    normalize(value: any): string | string[];
}
export interface BaseNormalizerOptions {
    uniqueKey?: string;
}
export declare type NormalizerFunc = (value: any) => any;
export declare type ValidNormalizer = BaseNormalizer | NormalizerFunc;
export declare type NormalizerDict = Record<string, ValidNormalizer>;
