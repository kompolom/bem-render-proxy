import express, { NextFunction, Request, Response } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import config from "./cfg";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import {
  ErrorChannel,
  ErrorHandler,
  StderrChannel,
} from "./utils/errors-handler";
import { calcRenderTime } from "./utils/render-time";
import {
  backendData,
  backendProxy,
  calcBackendTime,
} from "./middlewares/backendProxy";
import { patch } from "./middlewares/patch";
import { Renderer } from "./renderers";

export type engineSelectFunc = (
  bundle: string,
  page: string,
  platform: string
) => string | undefined;

export interface BrpConfig {
  static?: ParamsDictionary;
}

export class BemRenderProxy {
  readonly app = express();
  public config = config;
  public errorHandler: ErrorHandler;
  private engineSelect: engineSelectFunc = () => undefined;
  public renderEngines: Record<string, Renderer> = {};
  private defaultEngine: Renderer;
  private static engineSymbol = Symbol("engine");
  static logFormat =
    ":method :url :status - :response-time ms (backend :backend ms) (render :render-time ms)";

  constructor(brpConf: BrpConfig = {}) {
    this.initLogger();
    this.app
      .disable("x-powered-by")
      .disable("E-tag")
      .set("trust proxy", true)
      .use(cookieParser());
    this.initStatic(brpConf.static);
    this.app.use(
      backendProxy({
        host: this.config.BACKEND_HOST,
        port: this.config.BACKEND_PORT,
        errorHandler: this.errorHandler,
      })
    );
    if (this.config.APP_ENV === "local") {
      this.app.use(patch(true));
    }
    this.app.use(this.selectEngine.bind(this));
    this.app.all("*", this.handleRequest.bind(this));
    this.errorHandler = new ErrorHandler([
      new StderrChannel({ debug: this.config.APP_DEBUG }),
    ]);
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

  public setEngineSelectFunc(func: engineSelectFunc): void {
    this.engineSelect = func;
  }

  public addErrorChannel(channel: ErrorChannel): void {
    this.errorHandler.addChannel(channel);
  }

  private selectEngine(req: Request, res: Response, next: NextFunction) {
    const { bundle, page, platform } = res[backendData];
    const name = this.engineSelect(bundle, page, platform);
    if (name && this.renderEngines[name]) {
      req[BemRenderProxy.engineSymbol] = this.renderEngines[name];
    } else {
      req[BemRenderProxy.engineSymbol] = this.defaultEngine;
    }
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

  private initStatic(staticMap?: ParamsDictionary): void {
    if (!staticMap) return;
    Object.keys(staticMap).forEach((url) => {
      this.app.use(url, express.static(staticMap[url]));
    });
  }

  private handleRequest(req: Request, res: Response) {
    const renderer = req[BemRenderProxy.engineSymbol] as Renderer;
    renderer.render(req, res, res[backendData]).catch((errData) => {
      this.errorHandler.handle(req, res, errData);
    });
  }
}
