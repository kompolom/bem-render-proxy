import { Request, Response } from "express";
import { IBackendData } from "../types/IBackendData";
import { hrtime } from "../types/hrtime";
import exp from "constants";

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
  ): Promise<hrtime>;
  protected getTime(): hrtime {
    return process.hrtime();
  }
}
