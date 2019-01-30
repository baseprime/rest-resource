export function serializeToQueryString(obj) {
    const str = [];
    for (const p in obj) {
        if (obj.hasOwnProperty(p)) {
            str.push(`${encodeURIComponent(p)}=${encodeURIComponent(obj[p])}`);
        }
    }
    return str.join('&');
}
export function camelize(str) {
    return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) => {
        if (+match === 0)
            return '';
        return index == 0 ? match.toLowerCase() : match.toUpperCase();
    });
}
//# sourceMappingURL=util.js.map