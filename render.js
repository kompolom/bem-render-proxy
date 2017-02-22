'use strict';

const path = require('path'),
    isDev = process.env.NODE_ENV === 'development',
    useCache = !isDev,
    APP_ENV = process.env.APP_ENV,
    DEBUG = process.env.APP_DEBUG,
    DEFAULT_LANG = process.env.DEFAULT_LANG,
    cacheTTL = process.env.CACHE_TTL,
    staticRoot = process.env.STATIC_ROOT;

var cache = {};

function render(req, res, data, context) {
    if(DEBUG && res.statusCode === 500 && APP_ENV === 'local') // FIXME remove this
        return res.send('<pre>' + JSON.stringify(data, null, 4) + '</pre>');

    var query = req.query,
        user = req.user,
        cacheKey = req.url + (context? JSON.stringify(context) : '') + (user? JSON.stringify(user) : ''),
        cached = cache[cacheKey],

        // Выбор бандла и платформы
        platform = data.platform || 'desktop',
        scope = data.bundle || 'shop',
        view = data.page || 'home',
        pathToBundle = path.resolve(platform + '.pages'),
        bundleName = `page_${scope}_${view}`;

        // Утанавливает url для статики
        data.bundleUrl = path.join(`${staticRoot}${platform}.pages`, bundleName, bundleName);
        data.lang  || (data.lang =  DEFAULT_LANG || 'ru');

    recordRenderTime.call(req);

    if(DEBUG && query.json) return res.send('<pre>' + JSON.stringify(data, null, 4) + '</pre>');

    try {
        var bemtreePath = path.join(pathToBundle, bundleName, `${bundleName}.${data.lang}.bemtree.js`),
            bemhtmlPath = path.join(pathToBundle, bundleName, `${bundleName}.${data.lang}.bemhtml.js`),
            BEMTREE, BEMHTML;

        if(APP_ENV == 'local' && query.rebuild) {
            var exec = require('child_process').execSync;
            exec('./node_modules/.bin/enb make ' + path.join(platform + '.pages', bundleName), { stdio : [0,1,2] });
            console.log('Drop templates cache');
            delete require.cache[require.resolve(bemtreePath)];
            delete require.cache[require.resolve(bemhtmlPath)];
        }

        BEMTREE = require(bemtreePath).BEMTREE,
        BEMHTML = require(bemhtmlPath).BEMHTML;
    } catch (err) {
        console.error(err, err.stack);
        return res.status(424).end(data.bundleUrl + ' error'); // Попытка подключить несуществующий бандл
    }

    if(useCache && cached && (new Date() - cached.timestamp < cacheTTL)) {
        return res.send(cached.html);
    }

    var bemtreeCtx = {
        block : 'root',
        context : context,
        // extend with data needed for all routes
        data : Object.assign({}, {
            url : req._parsedUrl
        }, data)
    };

    try {
        var bemjson = BEMTREE.apply(bemtreeCtx);
    } catch(err) {
        console.error('BEMTREE error', err.stack);
        console.trace('server stack');
        return res.status(500).send(err);
    }

    if(DEBUG && query.bemjson) return res.send('<pre>' + JSON.stringify(bemjson, null, 4) + '</pre>');

    try {
        var html = BEMHTML.apply(bemjson);
    } catch(err) {
        console.error('BEMHTML error', err.stack);
        return res.status(500).send(err);
    }

    useCache && (cache[cacheKey] = {
        timestamp : new Date(),
        html : html
    });

    recordRenderTime.call(res);
    res.send(html);
}

function dropCache() {
    cache = {};
}

function recordRenderTime() {
    this._renderAt = process.hrtime();
}

module.exports = {
    render : render,
    dropCache : dropCache
};
