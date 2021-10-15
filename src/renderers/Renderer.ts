import { ParamsDictionary } from "express-serve-static-core";
import { IBackendData } from "../types/IBackendData";
import { ILogger } from "../types/ILogger";
import { IRequest, IResponse } from "../types/IRequest";

export interface IRendererSettings {
  debug?: boolean;
  logger?: ILogger;
}

export abstract class Renderer {
  protected settings: IRendererSettings;
  protected logger: ILogger;

  constructor(
    settings: Partial<IRendererSettings>,
    defaults: Partial<IRendererSettings>
  ) {
    this.settings = { ...defaults, ...settings };
    this.logger = this.settings.logger || console;
  }

  public abstract render(
    req: IRequest,
    res: IResponse,
    data: IBackendData
  ): Promise<void>;

  protected fixStart(req: IRequest): void {
    req._brp.statsCollector.fixTime("render");
  }

  protected fixEnd(res: IResponse): void {
    res._brp.statsCollector.fixTime("render");
  }

  protected getEnv(): ParamsDictionary {
    return this.filterEnv(process.env);
  }

  /**
   * Filter some sensitive environment variables
   * @param env
   */
  protected filterEnv(env: ParamsDictionary): ParamsDictionary {
    const filtered: ParamsDictionary = {},
      re = /^(?!npm_*|PWD|HOME|HOSTNAME|NODE_VERSION|PATH)/;
    Object.keys(env)
      .filter((key) => re.test(key))
      .forEach((key) => {
        filtered[key] = env[key];
      });

    return filtered;
  }
}
