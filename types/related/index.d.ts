import Resource from '../index';
export declare type RelatedValues<T> = T | T[] | string | string[] | number | number[] | Record<string, any> | Record<string, any>[];
export declare type CollectionValue = Record<string, any>[];
export default class RelatedManager<T extends typeof Resource> {
    to: T;
    value: RelatedValues<T>;
    many: boolean;
    primaryKeys: string[];
    constructor(to: T, value: RelatedValues<T>);
    getNodeContentType(): any;
    getPrimaryKeys(): string[];
    getIdFromObject(object: any): string;
    getIdFromResource(resource: InstanceType<T>): string;
    getOne(id: string): Promise<InstanceType<T>>;
    all(): Promise<InstanceType<T>[]>;
    first(): Promise<InstanceType<T>>;
}
