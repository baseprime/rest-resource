import Resource from '../index';
export declare type RelatedValues<T> = T | T[] | string | string[] | number | number[] | Record<string, any> | Record<string, any>[];
export declare type CollectionValue = Record<string, any>[];
export default class RelatedManager<T extends typeof Resource = typeof Resource> {
    to: T;
    value: RelatedValues<T>;
    many: boolean;
    inflated: boolean;
    primaryKeys: string[];
    _objects: Record<string, InstanceType<T>>;
    constructor(to: T, value: RelatedValues<T>);
    getNodeContentType(): any;
    getPrimaryKeys(): string[];
    getIdFromObject(object: any): string;
    getIdFromResource(resource: InstanceType<T>): string;
    getOne(id: string): Promise<InstanceType<T>>;
    resolve(): Promise<InstanceType<T>[]>;
    readonly objects: InstanceType<T>[];
    toJSON(): RelatedValues<T>;
}
