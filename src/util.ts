import Resource from './index'
import { first as _first } from 'lodash'

/**
 * Takes an input and camelizes it
 * @param str
 */
export function camelize(str: string) {
    return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match: any, index: number) => {
        if (+match === 0) return ''
        return index == 0 ? match.toLowerCase() : match.toUpperCase()
    })
}

/**
 * This is a very quick and primitive implementation of RFC 4122 UUID
 * Creates a basic variant UUID
 * Warning: Shouldn't be used of N >> 1e9
 */
export function uuidWeak() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
        let rand = (Math.random() * 16) | 0
        let value = character === 'x' ? rand : (rand & 0x3) | 0x8
        return value.toString(16)
    })
}

export function getContentTypeWeak(value: any): any {
    let node = _first([].concat(value))
    let Ctor = node.constructor
    if (Ctor.prototype instanceof Resource) {
        return Resource
    } else {
        return Ctor
    }
}
