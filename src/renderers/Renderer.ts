import { Request, Response } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import { IBackendData } from "../types/IBackendData";
import { fixTime } from "../utils/render-time";

export interface IRendererSettings {
  debug?: boolean;
}

export abstract class Renderer {
  protected settings: IRendererSettings;

  constructor(
    settings: Partial<IRendererSettings>,
    defaults: Partial<IRendererSettings>
  ) {
    this.settings = { ...defaults, ...settings };
  }

  public abstract render(
    req: Request,
    res: Response,
    data: IBackendData
  ): Promise<void>;

  protected fixStart(req: Request): void {
    fixTime(req);
  }

  protected fixEnd(res: Response): void {
    fixTime(res);
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
