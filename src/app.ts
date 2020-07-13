import http from "http";
import express from "express";
import config from "./cfg";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import setCookieParser from "set-cookie-parser";
import RFS from "rotating-file-stream";
import morgan from "morgan";
import { applyPatches } from "./utils/apply-patches";
import { bypassHeaders } from "./utils/bypassHeaders";
import errorsHandler from "./utils/errors-handler";
import { ClassicRenderer } from "./renderers/Classic";
import { calcRenderTime } from "./utils/render-time";

const renderer = new ClassicRenderer({
  debug: config.APP_DEBUG,
  appEnv: config.APP_ENV,
  freezeMap: config.FREEZE_MAP,
  useMerges: config.USE_MERGES,
  useCache: config.USE_CACHE,
  cacheTTL: config.CACHE_TTL,
  cacheSize: config.CACHE_SIZE,
  bundleFormat: config.BUNDLE_FORMAT,
  pageFormat: config.PAGE_FORMAT,
  staticRoot: config.STATIC_ROOT,
});

const app = express(),
  backendHost = config.BACKEND_HOST,
  backendPort = config.BACKEND_PORT,
  DEBUG = config.APP_DEBUG,
  APP_ENV = config.APP_ENV,
  renderContentType = "application/bem+json";

morgan.token("render-time", calcRenderTime);

app
  .disable("x-powered-by")
  .disable("E-tag")
  .use(cookieParser())
  .use(bodyParser.json());

if (config.FILE_LOGS_ENABLED) {
  // create a rotating write stream
  const accessLogStream = RFS.createStream("access.log", {
    teeToStdout: DEBUG,
    path: config.LOGS_DIR,
    size: "10M",
    interval: "1d",
    compress: "gzip",
  });
  app.use(
    morgan(
      ":method :url :status - :response-time ms (render :render-time ms)",
      { stream: accessLogStream }
    )
  );
} else {
  app.use(
    morgan(":method :url :status - :response-time ms (render :render-time ms)")
  );
}

app.all("*", function (req, res) {
  req.headers.accept = renderContentType + ";" + req.headers.accept;
  req.headers["X-Forwarded-Host"] = req.headers.host;
  delete req.headers.host; // Удаляем оригинальный заголовок Host, чтобы web-server мог правильно определить vhost
  const opts = {
      method: req.method,
      hostname: backendHost,
      port: backendPort,
      path: req.url,
      headers: req.headers,
    },
    clientReq = http.request(opts, function (backendMessage) {
      const SET_COOKIE_HEADER = "set-cookie";
      const needRender =
        !!backendMessage.headers["x-render"] ||
        backendMessage.headers["content-type"] === renderContentType;
      let body = "";

      // Для правильного разбиения чанков
      backendMessage.setEncoding("utf8");

      if (!needRender) {
        res.writeHead(backendMessage.statusCode, backendMessage.headers);
        backendMessage.on("data", (chunk) => {
          res.write(chunk);
        });
        backendMessage.on("end", () => {
          res.end();
        });
        return;
      }

      backendMessage.on("data", function (chunk) {
        body += chunk;
      });
      backendMessage.on("end", function () {
        res.status(backendMessage.statusCode);
        bypassHeaders(backendMessage, res);

        if (this.headers[SET_COOKIE_HEADER]) {
          // Актуализация req.cookies
          setCookieParser(backendMessage).forEach((cookie) => {
            const expires = new Date(cookie.expires),
              now = new Date();

            if (expires < now) {
              delete req.cookies[cookie.name];
              return;
            }

            req.cookies[cookie.name] = cookie.value;
          });
        }

        let data;

        try {
          data = JSON.parse(body);
        } catch (err) {
          return errorsHandler(req, res, {
            code: 502,
            type: "SERVER JSON error",
            body: body,
            error: err,
          });
        }

        if (APP_ENV === "local") {
          applyPatches(req, res, data);
        }

        renderer.render(req, res, data).catch((errData) => {
          errorsHandler(req, res, errData);
        });
      });
    });

  clientReq.on("error", function (e) {
    errorsHandler(req, res, {
      code: 502,
      type: "SERVER error",
      error: e,
    });
  });

  req.on("data", (chunk) => {
    clientReq.write(chunk);
  });
  req.on("end", () => {
    clientReq.end();
  });
});

export default app;
