const BLACKLISTED_HEADERS = {
    'content-type' : true
};

module.exports = function bypassHeaders(from, to) {
    for (let headerName of Object.keys(from.headers)) {
        if (BLACKLISTED_HEADERS[headerName]) continue;

        to.setHeader(headerName, from.headers[headerName]);
    }
};
