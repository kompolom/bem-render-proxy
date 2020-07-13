import { Renderer } from "./renderer";
import { Response, Request } from "express";
import { IBackendData } from "../types/IBackendData";
import { IRendererSettings } from "./Renderer";

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
        const jsonString = JSON.stringify(data);
        if (this.settings.wrap) {
          res.send(`<pre>${jsonString}</pre>`);
        } else {
          res.json(jsonString);
        }
        this.fixEnd(res);
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }
}
