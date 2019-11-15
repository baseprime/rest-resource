export interface BaseFormatterOptions {
    uniqueKey?: string;
}
export declare function formatFactory<T extends string>(name: T, options?: BaseFormatterOptions): BaseFormatter;
export declare class BaseFormatter {
    normalizeTo: Function;
    uniqueKey: string;
    constructor({ uniqueKey }?: BaseFormatterOptions);
    getType(value: any): any;
    normalize(value: any): any;
}
export declare class StringFormatter extends BaseFormatter {
}
export declare class NumberFormatter extends BaseFormatter {
    normalizeTo: NumberConstructor;
}
export declare class BooleanFormatter extends StringFormatter {
    normalizeTo: BooleanConstructor;
}
export declare class CurrencyFormatter extends NumberFormatter {
    normalize(value: any): string | string[];
}
