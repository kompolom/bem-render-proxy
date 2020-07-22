import { Request, Response, NextFunction, RequestHandler } from "express";
import { IncomingMessage, request, RequestOptions } from "http";
import { bypassHeaders } from "../utils/bypassHeaders";
import errorsHandler from "../utils/errors-handler";

export interface BackendProxyOptions {
  host: string;
  port: number;
}
export const backendData = Symbol("backendData");
export const backendTime = Symbol("backendTime");
export const RENDER_CONTENT_TYPE = "application/bem+json";
export const RENDER_HEADER = "x-render";

const CONTENT_TYPE_HEADER = "content-type";
const FORWARDED_HOST_HEADER = "X-Forwarded-Host";

export const backendProxy = (conf: BackendProxyOptions): RequestHandler => (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  req[backendTime] = new Date();
  const backendRequest = request(
    getBackendRequestOptions(req, conf),
    (backendResponse) => {
      if (!checkNeedRender(backendResponse)) {
        return proxyBackendResponse(backendResponse, res);
      }
      let dataArray: Buffer[] = [];

      backendResponse.on("readable", () => {
        const chunk = backendResponse.read();
        if (chunk) {
          dataArray.push(chunk);
        }
      });

      backendResponse.on("end", () => {
        res[backendTime] = new Date();
        res.status(backendResponse.statusCode);
        bypassHeaders(backendResponse, res);
        const body = Buffer.concat(dataArray).toString("utf8");
        dataArray = []; // clear data
        try {
          res[backendData] = JSON.parse(body);
        } catch (error) {
          errorsHandler(req, res, {
            code: 502,
            type: "SERVER JSON error",
            error,
            body,
          });
        }
        next();
      });

      backendResponse.on("error", (e) => {
        throw e;
      });
    }
  );

  backendRequest.on("error", (error) => {
    errorsHandler(req, res, {
      code: 502,
      type: "Backend reques error",
      error,
    });
  });
  req.pipe(backendRequest);
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

function checkNeedRender(backendResponse: IncomingMessage): boolean {
  return (
    backendResponse.headers[CONTENT_TYPE_HEADER] === RENDER_CONTENT_TYPE ||
    Boolean(backendResponse.headers[RENDER_HEADER])
  );
}

function getBackendRequestOptions(
  req: Request,
  conf: BackendProxyOptions
): RequestOptions {
  const headers = Object.assign({}, req.headers, {
    accept: RENDER_CONTENT_TYPE + ";" + req.headers.accept,
    [FORWARDED_HOST_HEADER]: req.headers.host,
  });
  delete headers.host;

  return {
    method: req.method,
    hostname: conf.host,
    port: conf.port,
    path: req.url,
    headers,
  };
}

function proxyBackendResponse(
  backendResponse: IncomingMessage,
  res: Response
): void {
  res.writeHead(backendResponse.statusCode, backendResponse.headers);
  backendResponse.pipe(res);
}
