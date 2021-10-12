import { NextFunction, RequestHandler } from "express";
import { bypassHeaders } from "../utils/bypassHeaders";
import { IBackend } from "../types/IBackend";
import { IRequest, IResponse } from "../types/IRequest";

export const backendData = Symbol("backendData");
export const backendSymbol = Symbol("backend");

export const backendProxy = (): RequestHandler => (
  req: IRequest,
  res: IResponse,
  next: NextFunction
): void => {
  req._brp.statsCollector.fixTime("backend");

  const backend: IBackend = req[backendSymbol];
  const backendRequest = backend.proxy(
    req,
    (backendMsg) => {
      req._brp.statsCollector.fixTime("backend");
      res.writeHead(backendMsg.statusCode, backendMsg.headers);
      backendMsg.pipe(res);
    },
    (backendResponse, body) => {
      req._brp.statsCollector.fixTime("backend");
      res.status(backendResponse.statusCode);
      bypassHeaders(backendResponse, res);
      try {
        res[backendData] = backend.parse(body);
      } catch (error) {
        req._brp.errorHandler.handle(req, res, {
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
    req._brp.errorHandler.handle(req, res, {
      code: 502,
      type: "Backend request error",
      error,
    });
  });
};
