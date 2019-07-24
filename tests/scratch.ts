import Resource from '../src/index'

class BaseResource extends Resource {
    static endpoint = '/'
}

class ExtendedResource extends BaseResource {
    static endpoint = '/foo'
}

(async function() {
    
})()
