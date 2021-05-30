import express, {
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";
import { ParamsDictionary } from "express-serve-static-core";
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
  backendSymbol,
} from "./middlewares/backendProxy";
import { patch } from "./middlewares/patch";
import { Renderer } from "./renderers";
import { IBackend } from "./types/IBackend";

export type engineSelectFunc = (
  bundle: string,
  page: string,
  platform: string,
  req: Request
) => string | undefined;

export type backendSelectFunc = (
  req: Request,
  backends: Record<string, IBackend>
) => IBackend;

export enum Phases {
  beforeBackend,
  afterBackend,
}

export type middlewareConfig = {
  phase: Phases;
  middleware: RequestHandler;
};

export interface BrpConfig {
  config: Record<string, unknown>;
  backends: IBackend[];
  backendSelectFunc?: backendSelectFunc;
  engineSelectFunc?: engineSelectFunc;
  /**
   * Static files mapping
   */
  static?: ParamsDictionary;

  /**
   * Additional express middlewares.
   */
  middlewares?: middlewareConfig[];
}

export class BemRenderProxy {
  readonly app = express();
  public config: Record<string, unknown>;
  public errorHandler: ErrorHandler;
  private readonly engineSelect: engineSelectFunc = () => undefined;
  public renderEngines: Record<string, Renderer> = {};
  private defaultEngine: Renderer;
  private readonly backends: Record<string, IBackend> = {};
  private backendSelectFunc?: backendSelectFunc;
  private static engineSymbol = Symbol("engine");
  static logFormat =
    ":method :url :status - :response-time ms (backend :backend-time ms) (render :render-time ms) backend :backend";

  constructor(brpConf: BrpConfig) {
    this.config = brpConf.config;
    this.initLogger();
    this.errorHandler = new ErrorHandler([
      new StderrChannel({ debug: Boolean(this.config.APP_DEBUG) }),
    ]);

    if (!brpConf.backends.length) {
      throw new Error("BemRenderProxy requires at least one backend");
    }
    Object.defineProperty(this.backends, "default", {
      value: brpConf.backends[0],
    });
    brpConf.backends.forEach((backend) => {
      this.backends[backend.name] = backend;
    });
    this.backendSelectFunc = brpConf.backendSelectFunc;

    brpConf.engineSelectFunc && (this.engineSelect = brpConf.engineSelectFunc);

    this.app
      .disable("x-powered-by")
      .disable("E-tag")
      .set("trust proxy", true)
      .use(cookieParser());
    this.initStatic(brpConf.static);

    this.addMiddlewares(Phases.beforeBackend, brpConf.middlewares);

    this.app.use(this.selectBackend.bind(this)).use(
      backendProxy({
        errorHandler: this.errorHandler,
      })
    );
    if (this.config.APP_ENV === "local") {
      this.app.use(patch(true));
    }

    this.addMiddlewares(Phases.afterBackend, brpConf.middlewares);

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

  public addErrorChannel(channel: ErrorChannel): void {
    this.errorHandler.addChannel(channel);
  }

  private selectEngine(req: Request, res: Response, next: NextFunction) {
    const { bundle, page, platform } = res[backendData];
    const name = this.engineSelect(bundle, page, platform, req);
    if (name && this.renderEngines[name]) {
      req[BemRenderProxy.engineSymbol] = this.renderEngines[name];
    } else {
      req[BemRenderProxy.engineSymbol] = this.defaultEngine;
    }
    next();
  }

  /**
   * Select which backend will be used
   * @param req
   * @param res
   * @param next
   * @private
   */
  private selectBackend(req: Request, res: Response, next: NextFunction): void {
    if (this.backendSelectFunc) {
      req[backendSymbol] = this.backendSelectFunc(req, this.backends);
    } else {
      req[backendSymbol] = this.backends.default;
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
    morgan.token("backend-time", calcBackendTime);
    morgan.token("backend", (req: Request) => req[backendSymbol]?.name);
    this.app.use(morgan(BemRenderProxy.logFormat));
  }

  private initStatic(staticMap?: ParamsDictionary): void {
    if (!staticMap) return;
    Object.keys(staticMap).forEach((url) => {
      this.app.use(url, express.static(staticMap[url]));
    });
  }

  /**
   * Добавляет дополнительные middleware в express
   */
  private addMiddlewares(phase: Phases, middlewares: middlewareConfig[]): void {
    if (!middlewares?.length) return;
    middlewares
      .filter((conf) => conf.phase === phase)
      .forEach((conf) => this.app.use(conf.middleware));
  }

  private handleRequest(req: Request, res: Response) {
    const renderer = req[BemRenderProxy.engineSymbol] as Renderer;
    renderer.render(req, res, res[backendData]).catch((errData) => {
      this.errorHandler.handle(req, res, errData);
    });
  }
}
