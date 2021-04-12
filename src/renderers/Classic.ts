import path from "path";
import { readFileSync } from "fs";
import { IRendererSettings, Renderer } from "./Renderer";
import { Request, Response } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import { IBackendData } from "../types/IBackendData";
import { FreezeMapper } from "../utils/freeze-map";
import { ICacheEntry } from "../types/ICacheEntry";
import { BundleScheme } from "../utils/bundle-scheme";
import { jsonCut } from "../utils/json-cut";
import { JsonRenderer } from "./Json";
import { iBEMHTML, iBEMTREE, iBEMXJST } from "../types/BEMXJST";

interface IClassicSettings extends IRendererSettings {
  lang?: string;
  appEnv?: string;
  freezeMap?: string;
  normalizeFreezeMap?: boolean;
  useMerges?: boolean;
  useCache?: boolean;
  cacheTTL?: number;
  cacheSize?: number;
  bundleFormat: string;
  pageFormat: string;
  mergeFormat?: string;
  staticRoot?: string;
  basePath?: string;
}

const defaultSettings: Partial<IClassicSettings> = { lang: "ru" };

export class ClassicRenderer extends Renderer {
  protected readonly settings: IClassicSettings;
  private readonly freezeMap: FreezeMapper;
  private readonly cache: Map<string, ICacheEntry>;

  constructor(settings?: IClassicSettings) {
    super(settings, defaultSettings);
    this.cache = new Map();
    this.freezeMap = this.settings.freezeMap
      ? ClassicRenderer.loadFreezeMap(
          this.settings.freezeMap,
          this.settings.normalizeFreezeMap
        )
      : new FreezeMapper();

    if (this.settings.useCache && this.settings.cacheTTL) {
      setInterval(() => this.clearOldCacheEntries(), this.settings.cacheTTL);
    }
  }

  async render(req: Request, res: Response, data: IBackendData): Promise<void> {
    this.fixStart(req);
    return new Promise((resolve, reject) => {
      if (
        this.settings.debug &&
        res.statusCode >= 500 &&
        this.settings.appEnv === "local"
      ) {
        return new JsonRenderer().render(req, res, data);
      }
      const query = req.query,
        cookies = req.cookies,
        // @ts-ignore
        user = data.data.user,
        cacheKey = ClassicRenderer.buildCacheKey(req.url, user),
        cached = this.cache.get(cacheKey),
        bundle = new BundleScheme({
          bundleFormat: this.settings.bundleFormat,
          pageFormat: this.settings.pageFormat,
          mergeFormat: this.settings.mergeFormat,
          baseUrl: this.settings.staticRoot,
          basePath: this.settings.basePath,
        });

      // @ts-ignore
      if (cached && new Date() - cached.timestamp < this.settings.cacheTTL) {
        res.send(cached.html);
        resolve(this.fixEnd(res));
      }

      // Выбор бандла и платформы
      bundle.platform = data.platform || "desktop";
      bundle.scope = data.bundle || "";
      bundle.view = data.page || "index";

      // Устанавливает url для статики
      data.platform = bundle.platform;
      data.bundleUrl = bundle.bundleUrl;
      data.lang || (data.lang = this.settings.lang);

      // Окружение и дополнительная информация
      data.env = this.getEnv();
      data.query = query as ParamsDictionary;
      data.cookies = cookies;
      // @ts-ignore
      data.freezeMap = this.freezeMap || {};

      if (this.settings.debug && query.json) {
        const json = jsonCut(data, query.json as string);
        return new JsonRenderer().render(req, res, json as IBackendData);
      }

      let BEMTREE: iBEMTREE,
        BEMHTML: iBEMHTML,
        bemjson: Record<string, unknown> | undefined,
        html: string | undefined;

      try {
        BEMTREE = this.loadBEMTREE(bundle, data.lang);
        BEMHTML = this.loadBEMHTML(bundle, data.lang);
      } catch (err) {
        reject({
          code: 424,
          type: data.bundleUrl + " error",
          error: err,
        });
      }

      const bemtreeCtx = {
        block: "root",
        bundleScheme: bundle,
        data,
      };

      try {
        this.injectFuncToBEMXJST(BEMTREE);
        bemjson = BEMTREE.apply(bemtreeCtx);
      } catch (err) {
        reject({
          code: 500,
          type: "BEMTREE error",
          error: err,
          data: data,
        });
      }

      if (this.settings.debug && query.bemjson) {
        const partialBemjson = jsonCut(bemjson, query.bemjson as string);
        return new JsonRenderer().render(
          req,
          res,
          partialBemjson as IBackendData
        );
      }

      try {
        html = BEMHTML.apply(bemjson);
      } catch (err) {
        reject({
          code: 500,
          type: "BEMHTML error",
          error: err,
          data: data,
        });
      }

      if (this.settings.useCache && this.cache.size < this.settings.cacheSize) {
        this.cache.set(cacheKey, {
          timestamp: new Date(),
          html,
        });
      }
      res.send(html);
      resolve(this.fixEnd(res));
    });
  }

  public dropCache(): void {
    return this.cache.clear();
  }

  private loadBEMTREE(bundle: BundleScheme, lang?: string): iBEMTREE {
    return this.loadTemplate(bundle, "bemtree.js", lang).BEMTREE;
  }

  private loadBEMHTML(bundle: BundleScheme, lang?: string): iBEMHTML {
    return this.loadTemplate(bundle, "bemhtml.js", lang).BEMHTML;
  }

  private loadTemplate(bundle: BundleScheme, ext: string, lang?: string) {
    const path = bundle.getFile(ext, lang);

    if (this.settings.appEnv === "local") {
      delete require.cache[require.resolve(path)];
    }

    return require(path);
  }

  private injectFuncToBEMXJST(instance: iBEMXJST) {
    instance.BEMContext.prototype.getFreezed = (url) =>
      this.freezeMap.linkTo(url);
    // noinspection JSUnusedGlobalSymbols
    instance.BEMContext.prototype.useMerges = this.settings.useMerges;
  }

  private static buildCacheKey(url, user): string {
    return JSON.stringify({ url, user });
  }

  private static loadFreezeMap(
    mapPath: string,
    NORMALIZE_FREEZE_URLS?: boolean
  ): FreezeMapper {
    const file = path.resolve(mapPath);
    try {
      const map = JSON.parse(readFileSync(file, "utf8"));
      console.log("Use freeze map", file);
      return new FreezeMapper(map, NORMALIZE_FREEZE_URLS);
    } catch (e) {
      console.error("Unable to load", file, "\n", e.message);
      return new FreezeMapper();
    }
  }

  private clearOldCacheEntries() {
    const now = new Date();
    for (const entry of this.cache.entries()) {
      // @ts-ignore
      if (now - entry[1].timestamp < this.settings.cacheTTL) {
        continue;
      }
      this.cache.delete(entry[0]);
    }
  }
}
