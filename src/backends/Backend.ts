import {
  IBackend,
  IBackendOptions,
  bypassCb,
  renderCb,
} from "../types/IBackend";
import {
  ClientRequest,
  IncomingHttpHeaders,
  IncomingMessage,
  request,
  RequestOptions,
} from "http";
import { Request } from "express";

export class Backend implements IBackend {
  readonly host: string;
  readonly port: number;
  readonly name: string;
  static readonly FORWARDED_HOST_HEADER = "X-Forwarded-Host";
  static readonly CONTENT_TYPE_HEADER = "content-type";

  constructor(conf: IBackendOptions) {
    this.host = conf.host;
    this.port = conf.port;
    if (conf.name) {
      this.name = conf.name;
    } else {
      throw new Error("Attempt to create backend instance without name");
    }
  }

  proxy(req: Request, bypass: bypassCb, render: renderCb): ClientRequest {
    const clientReq = request(this.getRequestOptions(req), (m) =>
      this.onResponse(m, bypass, render)
    );
    req.pipe(clientReq);

    return clientReq;
  }

  checkNeedRender(backendMessage: IncomingMessage): boolean {
    return false;
  }

  parse(data: unknown): unknown {
    return JSON.parse(data as string);
  }

  protected getRequestOptions(req: Request): RequestOptions {
    return {
      method: req.method,
      hostname: this.host,
      port: this.port,
      path: req.url,
      headers: this.getRequestHeaders(req),
    };
  }

  protected getRequestHeaders(req: Request): IncomingHttpHeaders {
    const headers = Object.assign({}, req.headers, {
      [Backend.FORWARDED_HOST_HEADER]: req.headers.host,
    });
    delete headers.host;

    return headers;
  }

  private onResponse(backendResponse: IncomingMessage, bypass, render): void {
    if (!this.checkNeedRender(backendResponse)) {
      bypass(backendResponse);
      return;
    }

    this.receiveBody(backendResponse, render);
  }

  protected receiveBody(res: IncomingMessage, callback: renderCb): void {
    let dataArray: Buffer[] = [];

    res.on("readable", () => {
      const chunk = res.read();
      if (chunk) {
        dataArray.push(chunk);
      }
    });

    res.on("end", () => {
      const body = Buffer.concat(dataArray).toString("utf8");
      dataArray = []; // clear data
      callback(res, body);
    });

    res.on("error", (e) => {
      throw e;
    });
  }
}
