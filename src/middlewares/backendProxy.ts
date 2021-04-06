import { Request, Response, NextFunction, RequestHandler } from "express";
import { IncomingMessage } from "http";
import { bypassHeaders } from "../utils/bypassHeaders";
import { ErrorHandler } from "../utils/errors-handler";
import { IBackend } from "../types/IBackend";

export interface BackendProxyOptions {
  errorHandler: ErrorHandler;
}
export const backendData = Symbol("backendData");
export const backendTime = Symbol("backendTime");
export const backendSymbol = Symbol("backend");

export const backendProxy = (conf: BackendProxyOptions): RequestHandler => (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  req[backendTime] = new Date();

  const backend: IBackend = req[backendSymbol];
  const backendRequest = backend.proxy(
    req,
    (backendMsg) => {
      res[backendTime] = new Date();
      res.writeHead(backendMsg.statusCode, backendMsg.headers);
      backendMsg.pipe(res);
    },
    (backendResponse, body) => {
      res[backendTime] = new Date();
      res.status(backendResponse.statusCode);
      bypassHeaders(backendResponse, res);
      try {
        res[backendData] = backend.parse(body);
      } catch (error) {
        conf.errorHandler.handle(req, res, {
          code: 502,
          type: "Backend data format error",
          error,
          body,
        });
      }
      next();
    }
  );

  backendRequest.on("error", (error) => {
    conf.errorHandler.handle(req, res, {
      code: 502,
      type: "Backend request error",
      error,
    });
  });
};

export function calcBackendTime(req: Request, res: Response): string {
  if (!req[backendTime] || !res[backendTime]) {
    // missing request and/or response start time
    return;
  }

  // calculate diff
  const ms = res[backendTime] - req[backendTime];

  // return truncated value
  return ms.toFixed(3);
}

function bypassResponse(from: IncomingMessage, to: Response): void {
  to.writeHead(from.statusCode, from.headers);
  from.pipe(to);
}
