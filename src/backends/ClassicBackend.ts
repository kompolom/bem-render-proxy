import { IncomingHttpHeaders, IncomingMessage } from "http";
import { Request } from "express";
import { Backend } from "./Backend";

export class ClassicBackend extends Backend {
  static readonly RENDER_CONTENT_TYPE = "application/bem+json";
  static readonly RENDER_HEADER = "x-render";

  public checkNeedRender(backendMessage: IncomingMessage): boolean {
    return (
      backendMessage.headers[Backend.CONTENT_TYPE_HEADER] ===
        ClassicBackend.RENDER_CONTENT_TYPE ||
      Boolean(backendMessage.headers[ClassicBackend.RENDER_HEADER])
    );
  }

  protected getRequestHeaders(req: Request): IncomingHttpHeaders {
    return Object.assign(super.getRequestHeaders(req), {
      accept: ClassicBackend.RENDER_CONTENT_TYPE + ";" + req.headers.accept,
    });
  }
}
