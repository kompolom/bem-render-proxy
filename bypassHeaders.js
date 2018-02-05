module.exports = function bypassHeaders(from, to) {
    for (let headerName of Object.keys(from.headers)) {
        to.setHeader(headerName, from.headers[headerName]);
    }
};
