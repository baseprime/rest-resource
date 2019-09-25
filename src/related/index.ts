import Resource from '../index'
import { first as _first } from 'lodash'
import assert from 'assert'
export type RelatedValues<T> = T | T[] | string | string[] | number | number[] | Record<string, any> | Record<string, any>[]
export type CollectionValue = Record<string, any>[]

export default class RelatedManager<T extends typeof Resource> {
    to: T
    value: RelatedValues<T>
    many: boolean = false
    primaryKeys: string[]
    
    constructor(to: T, value: RelatedValues<T>) {
        this.to = to
        this.value = value
        this.many = Array.isArray(value)
        this.primaryKeys = this.getPrimaryKeys()
    }

    getNodeContentType() {
        if(this.many) {
            let iterValue = this.value as any[]
            let nodeCtor = _first(iterValue).constructor
            if(nodeCtor.prototype instanceof Resource) {
                return Resource
            } else {
                return nodeCtor
            }
        } else {
            let Ctor = this.value.constructor
            if(Ctor.prototype instanceof Resource) {
                return Resource
            } else{
                return Ctor
            }
        }
    }
    
    getPrimaryKeys(): string[] {
        let contentType = this.getNodeContentType()
        let iterValue = this.value as any[]

        if(this.many) {
            if(contentType === Resource) {
                return iterValue.map((resource: InstanceType<T>) => this.getIdFromResource(resource))
            } else if(this.many && contentType === Object) {
                return iterValue.map((record) => this.getIdFromObject(record))
            } else {
                return this.value as string[]
            }
        } else {
            if(contentType === Resource) {
                return [this.getIdFromResource(this.value as InstanceType<T>)]
            } else if(contentType === Object) {
                return [this.getIdFromObject(this.value)]
            } else {
                return [this.value as string]
            }
        }
    }

    getIdFromObject(object: any): string {
        return String(object[this.to.uniqueKey])
    }

    getIdFromResource(resource: InstanceType<T>) {
        return resource.id
    }

    getOne(id: string): Promise<InstanceType<T>> {
        return this.to.detail<T>(id).then((resource) => {
            return resource as InstanceType<T>
        })
    }

    all(): Promise<InstanceType<T>[]> {
        return Promise.all(this.primaryKeys.map((id) => this.getOne(id))) as Promise<InstanceType<T>[]>
    }

    first(): Promise<InstanceType<T>> {
        return this.getOne(_first(this.primaryKeys))
    }
}
