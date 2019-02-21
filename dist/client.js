import axios from 'axios';
export class DefaultClient {
    constructor(baseURL, config = {}) {
        let opts = Object.assign({ baseURL }, config);
        this.hostname = opts.baseURL;
        this.axios = axios.create(opts);
    }
    negotiateContent(ResourceClass) {
        // Should always return a function
        return (response) => {
            let objects = [];
            if (Array.isArray(response.data)) {
                response.data.forEach((attributes) => objects.push(new ResourceClass(attributes)));
            }
            else {
                objects.push(new ResourceClass(response.data));
            }
            return {
                response,
                resources: objects,
                count: () => response.headers['Pagination-Count'],
                pages: () => Math.ceil(response.headers['Pagination-Count'] / response.headers['Pagination-Limit']),
                currentPage: () => response.headers['Pagination-Page'],
                perPage: () => response.headers['Pagination-Limit'],
            };
        };
    }
    list(ResourceClass, options = {}) {
        return this.get(ResourceClass.getListRoutePath(options.query)).then(this.negotiateContent(ResourceClass));
    }
    detail(ResourceClass, id, options = {}) {
        return this.get(ResourceClass.getDetailRoutePath(id, options.query)).then(this.negotiateContent(ResourceClass));
    }
    get(path, options = {}) {
        return this.axios.get(path, options).catch((e) => this.onError(e));
    }
    put(path, body = {}, options = {}) {
        return this.axios.put(path, body, options).catch((e) => this.onError(e));
    }
    post(path, body = {}, options = {}) {
        return this.axios.post(path, body, options).catch((e) => this.onError(e));
    }
    patch(path, body = {}, options = {}) {
        return this.axios.patch(path, body, options).catch((e) => this.onError(e));
    }
    delete(path, options = {}) {
        return this.axios.delete(path, options).catch((e) => this.onError(e));
    }
    head(path, options = {}) {
        return this.axios.head(path, options).catch((e) => this.onError(e));
    }
    options(path, options = {}) {
        return this.axios.options(path, options).catch((e) => this.onError(e));
    }
    onError(exception) {
        throw exception;
    }
}
export class JWTBearerClient extends DefaultClient {
    // This is just a basic client except we're including a token in the requests
    constructor(baseURL, token = '', options = {}) {
        let headers = Object.assign({
            'Authorization': `Bearer ${token}`
        }, options.headers);
        options.headers = headers;
        super(baseURL, options);
        this.token = token;
    }
}
//# sourceMappingURL=client.js.map