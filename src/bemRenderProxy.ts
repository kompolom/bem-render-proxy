import express, {
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";
import { ParamsDictionary } from "express-serve-static-core";
import cookieParser from "cookie-parser";
import {
  ErrorChannel,
  ErrorHandler,
  StderrChannel,
} from "./utils/errors-handler";
import {
  backendData,
  backendProxy,
  backendSymbol,
} from "./middlewares/backendProxy";
import { patch } from "./middlewares/patch";
import { Renderer } from "./renderers";
import { IBackend } from "./types/IBackend";
import { ILogger } from "./types/ILogger";
import { servicesContainer } from "./types/servicesContainer";
import { StatsCollector, StatsManager } from "./middlewares/StatsCollector";
import { IRequest, IResponse } from "./types/IRequest";

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
  logger?: ILogger;
}

export class BemRenderProxy {
  readonly app = express();
  public config: Record<string, unknown>;
  public errorHandler: ErrorHandler;
  private readonly engineSelect: engineSelectFunc = () => undefined;
  public renderEngines: Record<string, Renderer> = {};
  private defaultEngineName: string;
  private readonly backends: Record<string, IBackend> = {};
  private readonly backendSelectFunc?: backendSelectFunc;
  private readonly _logger: ILogger;
  private readonly _statsManager: StatsManager;
  private static engineSymbol = Symbol("engine");

  constructor(brpConf: BrpConfig) {
    this.config = brpConf.config;
    this._logger = brpConf.logger || console;
    this._statsManager = new StatsManager(
      this._logger,
      this.config.APP_ENV !== "production"
    );
    this.app.use(this._statsManager.middleware);
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

    this.app.use((req, res, next) => {
      const container = this.getServicesContainer(req, res);
      Object.defineProperty(req, "_brp", { value: container });
      Object.defineProperty(res, "_brp", { value: container });
      next();
    });

    this.addMiddlewares(Phases.beforeBackend, brpConf.middlewares);

    this.app.use(this.selectBackend.bind(this)).use(backendProxy());
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
      this._logger.log("bem-render-proxy ready on", port);
    });
  }

  public addEngine(name: string, engine: Renderer, isDefault = false): void {
    this.renderEngines[name] = engine;
    if (isDefault) this.setDefaultEngine(name);
  }

  public setDefaultEngine(name: string): void {
    if (!this.renderEngines[name])
      throw new Error(`Render engine ${name} not found`);
    this.defaultEngineName = name;
  }

  public addErrorChannel(channel: ErrorChannel): void {
    this.errorHandler.addChannel(channel);
  }

  private selectEngine(req: IRequest, res: IResponse, next: NextFunction) {
    const { bundle, page, platform } = res[backendData];
    let name = this.engineSelect(bundle, page, platform, req);
    if (!this.renderEngines[name]) name = this.defaultEngineName;

    req[BemRenderProxy.engineSymbol] = this.renderEngines[name];
    req._brp.statsCollector.pushValue("renderer", name);

    next();
  }

  /**
   * Select which backend will be used
   * @param req
   * @param res
   * @param next
   * @private
   */
  private selectBackend(
    req: IRequest,
    res: IResponse,
    next: NextFunction
  ): void {
    if (this.backendSelectFunc) {
      req[backendSymbol] = this.backendSelectFunc(req, this.backends);
    } else {
      req[backendSymbol] = this.backends.default;
    }
    req._brp.statsCollector.pushValue("backend", req[backendSymbol].name);
    next();
  }

  private showInfo() {
    this._logger.log("Run in", this.config.APP_ENV, "mode");
    this._logger.log("DEBUG:", this.config.APP_DEBUG);
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

  private getServicesContainer(req: Request, res: Response): servicesContainer {
    return {
      logger: this._logger,
      errorHandler: this.errorHandler,
      statsManager: this._statsManager,
      statsCollector: new StatsCollector(req, res),
    };
  }

  private handleRequest(req: IRequest, res: IResponse) {
    const renderer = req[BemRenderProxy.engineSymbol] as Renderer;
    renderer.render(req, res, res[backendData]).catch((errData) => {
      this.errorHandler.handle(req, res, errData);
    });
  }
}
