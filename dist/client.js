import axios from 'axios';
export class DefaultClient {
    constructor(baseURL, config = {}) {
        let opts = Object.assign({ baseURL }, config);
        this._axios = axios.create(opts);
    }
    get(path, options = {}) {
        return this._axios.get(path, options).catch((e) => this.onError(e));
    }
    put(path, body = {}, options = {}) {
        return this._axios.put(path, body, options).catch((e) => this.onError(e));
    }
    post(path, body = {}, options = {}) {
        return this._axios.post(path, body, options).catch((e) => this.onError(e));
    }
    patch(path, body = {}, options = {}) {
        return this._axios.patch(path, body, options).catch((e) => this.onError(e));
    }
    delete(path, options = {}) {
        return this._axios.delete(path, options).catch((e) => this.onError(e));
    }
    onError(exception) {
        throw exception;
    }
}
export class JWTBearerClient extends DefaultClient {
    constructor(baseURL, token = '', options = {}) {
        let headers = Object.assign({
            'Authorization': `Bearer ${token}`
        }, options.headers);
        options.headers = headers;
        super(baseURL, options);
    }
}
//# sourceMappingURL=client.js.map