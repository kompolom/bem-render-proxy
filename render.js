'use strict';

const path = require('path'),
    fs = require('fs'),
    isDev = process.env.NODE_ENV === 'development',
    cacheTTL = process.env.CACHE_TTL,
    CACHE_SIZE = process.env.CACHE_SIZE || 1000,
    USE_CACHE = !!process.env.USE_CACHE,
    APP_ENV = process.env.APP_ENV,
    DEBUG = process.env.APP_DEBUG,
    DEFAULT_LANG = process.env.DEFAULT_LANG,
    STATIC_ROOT = process.env.STATIC_ROOT || '/',
    NORMALIZE_FREEZE_URLS = process.env.NORMALIZE_FREEZE_URLS,
    FreezeMap = require('./freeze-map'),
    freezeMapFile = path.resolve(process.env.FREEZE_MAP || ''),
    BUNDLE_FORMAT = process.env.BUNDLE_FORMAT || '{platform}.pages',
    PAGE_FORMAT = process.env.PAGE_FORMAT || 'page_{scope}_{view}',
    BundleScheme = require('./bundle-scheme'),
    bundle = new BundleScheme(BUNDLE_FORMAT, PAGE_FORMAT, STATIC_ROOT);

let cache = new Map(),
    map,
    freezeMap = new FreezeMap();

setInterval(clearOldCacheEntries, cacheTTL);


console.log('Run in', APP_ENV.toUpperCase(), 'mode');
console.log('USE_CACHE:', USE_CACHE);


function render(req, res, data, context, errorsHandler) {
    if(DEBUG && res.statusCode === 500 && APP_ENV === 'local') // FIXME remove this
        return res.send(`<pre>${JSON.stringify(data, null, 4)}</pre>`);

    if(process.env.FREEZE_MAP && (!map || APP_ENV === 'local')) {
        console.log('Try to read freeze map', freezeMapFile);
        try {
            map = JSON.parse(fs.readFileSync(freezeMapFile, 'utf-8'));
            freezeMap = new FreezeMap(map, NORMALIZE_FREEZE_URLS);
        } catch (e) {
            console.log('Unable to load', freezeMapFile, '\n', e.message);
        }
    }

    var query = req.query,
        cookies = req.cookies,
        user = data.data.user,
        cacheKey = JSON.stringify({ url : req.url, user }),
        cached = cache.get(cacheKey);

        // Выбор бандла и платформы
        bundle.platform = data.platform || 'desktop';
        bundle.scope = data.bundle || '';
        bundle.view = data.page || 'index';

        // Устанавливает url для статики
        data.platform = bundle.platform;
        data.bundleUrl = bundle.baseUrl;
        data.lang  || (data.lang =  DEFAULT_LANG || 'ru');

        // Окружение и дополнительная информация
        data.env = process.env;
        data.query = query;
        data.cookies = cookies;
        data.freezeMap = map || {};

    recordRenderTime.call(req);

    if(DEBUG && query.json) {
        let json = require('./json-cut')(data, query.json);

        return res.send(`<pre>${JSON.stringify(json, null, 4)}</pre>`);
    }

    try {
        var bemtreePath = bundle.getFile('bemtree.js', data.lang),
            bemhtmlPath = bundle.getFile('bemhtml.js', data.lang),
            BEMTREE, BEMHTML;

        if(APP_ENV === 'local' && query.rebuild) {
            var exec = require('child_process').execSync;
            exec('./node_modules/.bin/enb make ' + bundle.bundle, { stdio : [0,1,2] });
        }

        if(APP_ENV === 'local') {
            console.log('Drop templates cache');
            delete require.cache[require.resolve(bemtreePath)];
            delete require.cache[require.resolve(bemhtmlPath)];
        }

        BEMTREE = require(bemtreePath).BEMTREE,
        BEMHTML = require(bemhtmlPath).BEMHTML;
    } catch (err) {
        return errorsHandler(req, res, {
            code : 424,
            type : data.bundleUrl + ' error',
            error : err,
        });
    }

    if(cached && (new Date() - cached.timestamp < cacheTTL)) {
        return res.send(cached.html);
    }

    var bemtreeCtx = {
        block : 'root',
        context : context,
        bundleScheme : bundle,
        data : data
    };

    try {
        BEMTREE.BEMContext.prototype.getFreezed = url => freezeMap.linkTo(url);
        BEMTREE.BEMContext.prototype.useMerges = APP_ENV === 'production';
        var bemjson = BEMTREE.apply(bemtreeCtx);
    } catch(err) {
        return errorsHandler(req, res, {
            code : 500,
            type : 'BEMTREE error',
            error : err,
            data : data
        });
    }

    if(DEBUG && query.bemjson) return res.send(`<pre>${JSON.stringify(bemjson, null, 4)}</pre>`);

    try {
        var html = BEMHTML.apply(bemjson);
    } catch(err) {
        return errorsHandler(req, res, {
            code : 500,
            type : 'BEMHTML error',
            error : err,
            data : data
        });
    }

    if(USE_CACHE && cache.size < CACHE_SIZE) {
        cache.set(cacheKey, {
            timestamp : new Date(),
            html : html
        });
    }

    recordRenderTime.call(res);
    res.send(html);
}

function clearOldCacheEntries() {
    const now = new Date();
    for(let entry of cache.entries()) {
        if(now - entry[1].timestamp < cacheTTL) { continue; }
        cache.delete(entry[0]);
    }
}

function dropCache() {
    return cache.clear();
}

function recordRenderTime() {
    this._renderAt = process.hrtime();
}

module.exports = {
    render : render,
    dropCache : dropCache
};
