import express, { NextFunction, Request, Response } from "express";
import config from "./cfg";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import errorsHandler from "./utils/errors-handler";
import { calcRenderTime } from "./utils/render-time";
import {
  backendData,
  backendProxy,
  calcBackendTime,
} from "./middlewares/backendProxy";
import { patch } from "./middlewares/patch";
import { Renderer } from "./renderers";

export class BemRenderProxy {
  readonly app = express();
  public config = config;
  public renderEngines: Record<string, Renderer> = {};
  private defaultEngine: Renderer;
  private static engineSymbol = Symbol("engine");
  static logFormat =
    ":method :url :status - :response-time ms (backend :backend ms) (render :render-time ms)";

  constructor() {
    this.initLogger();
    this.initEngines();
    this.app
      .disable("x-powered-by")
      .disable("E-tag")
      .use(cookieParser())
      .use(
        backendProxy({
          host: this.config.BACKEND_HOST,
          port: this.config.BACKEND_PORT,
        })
      );
    if (this.config.APP_ENV === "local") {
      this.app.use(patch(true));
    }
    this.app.use(this.selectEngine.bind(this));
    this.app.all("*", this.handleRequest.bind(this));
  }

  /**
   * Start server
   * @param port
   */
  public start(port = this.config.APP_PORT): void {
    this.showInfo();
    this.app.listen(port, () => {
      console.log("bem-render-proxy ready on", port);
    });
  }

  public addEngine(name: string, engine: Renderer, isDefault = false): void {
    this.renderEngines[name] = engine;
    if (isDefault) this.setDefaultEngine(name);
  }

  public setDefaultEngine(name: string): void {
    if (!this.renderEngines[name])
      throw new Error(`Render engine ${name} not found`);
    this.defaultEngine = this.renderEngines[name];
  }

  private initEngines() {
    /*
    this.addEngine(
      "classic",
      new ClassicRenderer({
        debug: config.APP_DEBUG,
        appEnv: config.APP_ENV,
        freezeMap: config.FREEZE_MAP,
        useMerges: config.USE_MERGES,
        useCache: config.USE_CACHE,
        cacheTTL: config.CACHE_TTL,
        cacheSize: config.CACHE_SIZE,
        bundleFormat: config.BUNDLE_FORMAT,
        pageFormat: config.PAGE_FORMAT,
        staticRoot: config.STATIC_ROOT,
      })
    );
     */
  }

  private selectEngine(req: Request, _res, next: NextFunction) {
    req[BemRenderProxy.engineSymbol] = this.defaultEngine;
    next();
  }

  private showInfo() {
    console.log("Run in", this.config.APP_ENV, "mode");
    console.log("USE_CACHE:", this.config.USE_CACHE);
    console.log("DEBUG:", this.config.APP_DEBUG);
  }

  private initLogger() {
    morgan.token("render-time", calcRenderTime);
    morgan.token("backend", calcBackendTime);
    this.app.use(morgan(BemRenderProxy.logFormat));
  }

  private handleRequest(req: Request, res: Response) {
    const renderer = req[BemRenderProxy.engineSymbol] as Renderer;
    renderer.render(req, res, res[backendData]).catch((errData) => {
      errorsHandler(req, res, errData);
    });
  }
}
