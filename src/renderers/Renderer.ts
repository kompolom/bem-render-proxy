import { Request, Response } from "express";
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

  public abstract async render(
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

  protected getEnv(): Record<string, string> {
    // FIXME: filter variables
    return process.env;
  }
}
