/**
 * Takes an input and camelizes it
 * @param str
 */
export declare function camelize(str: string): string;
/**
 * This is a very quick and primitive implementation of RFC 4122 UUID
 * Creates a basic variant UUID
 * Warning: Shouldn't be used of N >> 1e9
 */
export declare function uuidWeak(): string;
export declare function getContentTypeWeak(value: any): any;
export declare function urlStringify(object: any): string;
