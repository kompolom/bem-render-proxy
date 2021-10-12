import { Renderer, IRendererSettings } from "./Renderer";
import { IBackendData } from "../types/IBackendData";
import { IRequest, IResponse } from "../types/IRequest";

export interface IJsonSettings extends IRendererSettings {
  wrap?: boolean;
}

const defaultSettings: IJsonSettings = { debug: false, wrap: false };

export class JsonRenderer extends Renderer {
  protected settings: IJsonSettings;
  constructor(settings?: IJsonSettings) {
    super(settings, defaultSettings);
  }
  async render(
    req: IRequest,
    res: IResponse,
    data: IBackendData
  ): Promise<void> {
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
