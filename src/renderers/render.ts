import path from "path";
import fs from "fs";
import { FreezeMapper } from "../utils/freeze-map";
import config from "../cfg";
import { BundleScheme } from "../utils/bundle-scheme";
import { jsonCut } from "../utils/json-cut";
import { Request, Response } from "express";
import { IErrorsHandlerOpts } from "../utils/errors-handler";
import { IBackendData } from "../types/IBackendData";

interface ICacheEntry {
  timestamp: Date;
  html: string;
}

const cacheTTL = config.CACHE_TTL,
  CACHE_SIZE = config.CACHE_SIZE,
  USE_CACHE = config.USE_CACHE,
  APP_ENV = config.APP_ENV,
  DEBUG = config.APP_DEBUG,
  DEFAULT_LANG = config.DEFAULT_LANG,
  STATIC_ROOT = config.STATIC_ROOT,
  NORMALIZE_FREEZE_URLS = config.NORMALIZE_FREEZE_URLS,
  freezeMapFile = path.resolve(config.FREEZE_MAP),
  BUNDLE_FORMAT = config.BUNDLE_FORMAT,
  PAGE_FORMAT = config.PAGE_FORMAT,
  bundle = new BundleScheme(BUNDLE_FORMAT, PAGE_FORMAT, STATIC_ROOT);

const cache: Map<string, ICacheEntry> = new Map();
let freezeMap = new FreezeMapper();
let map;

USE_CACHE && setInterval(clearOldCacheEntries, cacheTTL);

console.log("Run in", APP_ENV.toUpperCase(), "mode");
console.log("USE_CACHE:", USE_CACHE);
console.log("DEBUG:", DEBUG);

export function render(
  req: Request,
  res: Response,
  data: IBackendData,
  context: unknown,
  errorsHandler: (req: Request, res: Response, opts: IErrorsHandlerOpts) => void
): unknown {
  if (DEBUG && res.statusCode === 500 && APP_ENV === "local")
    return res.send(`<pre>${JSON.stringify(data, null, 4)}</pre>`);

  if (config.FREEZE_MAP && (!map || APP_ENV === "local")) {
    console.log("Try to read freeze map", freezeMapFile);
    try {
      map = JSON.parse(fs.readFileSync(freezeMapFile, "utf-8"));
      freezeMap = new FreezeMapper(map, NORMALIZE_FREEZE_URLS);
    } catch (e) {
      console.log("Unable to load", freezeMapFile, "\n", e.message);
    }
  }

  const query = req.query,
    cookies = req.cookies,
    // @ts-ignore
    user = data.data.user,
    cacheKey = JSON.stringify({ url: req.url, user }),
    cached = cache.get(cacheKey);

  // Выбор бандла и платформы
  bundle.platform = data.platform || "desktop";
  bundle.scope = data.bundle || "";
  bundle.view = data.page || "index";

  // Устанавливает url для статики
  data.platform = bundle.platform;
  data.bundleUrl = bundle.baseUrl;
  data.lang || (data.lang = DEFAULT_LANG || "ru");

  // Окружение и дополнительная информация
  data.env = process.env;
  data.query = query;
  data.cookies = cookies;
  data.freezeMap = map || {};

  recordRenderTime.call(req);

  if (DEBUG && query.json) {
    const json = jsonCut(data, query.json as string);

    return res.send(`<pre>${JSON.stringify(json, null, 4)}</pre>`);
  }
  // eslint-disable-next-line @typescript-eslint/ban-types
  let BEMTREE, BEMHTML, bemjson: object | undefined, html: string | undefined;

  try {
    const bemtreePath = bundle.getFile("bemtree.js", data.lang),
      bemhtmlPath = bundle.getFile("bemhtml.js", data.lang);

    if (APP_ENV === "local") {
      delete require.cache[require.resolve(bemtreePath)];
      delete require.cache[require.resolve(bemhtmlPath)];
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    BEMHTML = require(bemhtmlPath).BEMHTML;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    BEMTREE = require(bemtreePath).BEMTREE;
  } catch (err) {
    return errorsHandler(req, res, {
      code: 424,
      type: data.bundleUrl + " error",
      error: err,
    });
  }

  // @ts-ignore
  if (cached && new Date() - cached.timestamp < cacheTTL) {
    return res.send(cached.html);
  }

  const bemtreeCtx = {
    block: "root",
    bundleScheme: bundle,
    context,
    data,
  };

  try {
    BEMTREE.BEMContext.prototype.getFreezed = (url) => freezeMap.linkTo(url);
    BEMTREE.BEMContext.prototype.useMerges = config.USE_MERGES;
    bemjson = BEMTREE.apply(bemtreeCtx);
  } catch (err) {
    return errorsHandler(req, res, {
      code: 500,
      type: "BEMTREE error",
      error: err,
      data: data,
    });
  }

  if (DEBUG && query.bemjson) {
    const partialBemjson = jsonCut(data, query.bemjson as string);
    return res.send(`<pre>${JSON.stringify(partialBemjson, null, 4)}</pre>`);
  }

  try {
    html = BEMHTML.apply(bemjson);
  } catch (err) {
    return errorsHandler(req, res, {
      code: 500,
      type: "BEMHTML error",
      error: err,
      data: data,
    });
  }

  if (USE_CACHE && cache.size < CACHE_SIZE) {
    cache.set(cacheKey, {
      timestamp: new Date(),
      html,
    });
  }

  recordRenderTime.call(res);
  res.send(html);
}

function clearOldCacheEntries() {
  const now = new Date();
  for (const entry of cache.entries()) {
    // @ts-ignore
    if (now - entry[1].timestamp < cacheTTL) {
      continue;
    }
    cache.delete(entry[0]);
  }
}

export function dropCache() {
  return cache.clear();
}

function recordRenderTime() {
  this._renderAt = process.hrtime();
}
