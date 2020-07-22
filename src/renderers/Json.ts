import { Renderer, IRendererSettings } from "./Renderer";
import { Response, Request } from "express";
import { IBackendData } from "../types/IBackendData";

export interface IJsonSettings extends IRendererSettings {
  wrap?: boolean;
}

const defaultSettings: IJsonSettings = { debug: false, wrap: false };

export class JsonRenderer extends Renderer {
  protected settings: IJsonSettings;
  constructor(settings?: IJsonSettings) {
    super(settings, defaultSettings);
  }
  async render(req: Request, res: Response, data: IBackendData): Promise<void> {
    return new Promise((resolve, reject) => {
      this.fixStart(req);
      try {
        if (this.settings.wrap) {
          res.send(`<pre>${JSON.stringify(data, null, 2)}</pre>`);
        } else {
          res.json(data);
        }
        this.fixEnd(res);
        resolve();
      } catch (error) {
        reject({ error });
      }
    });
  }
}
