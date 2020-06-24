import http from "http";
import express from "express";
import config from "./cfg";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import setCookieParser from "set-cookie-parser";
import RFS from "rotating-file-stream";
import morgan from "morgan";
import { render } from "./renderers/render";
import { applyPatches } from "./utils/apply-patches";
import { bypassHeaders } from "./utils/bypassHeaders";
import errorsHandler from "./utils/errors-handler";

const app = express(),
  port = config.APP_PORT,
  backendHost = config.BACKEND_HOST,
  backendPort = config.BACKEND_PORT,
  DEBUG = config.APP_DEBUG,
  APP_ENV = config.APP_ENV,
  renderContentType = "application/bem+json";

morgan.token("render-time", function (req, res, digits) {
  if (!req._renderAt || !res._renderAt) {
    // missing request and/or response start time
    return;
  }

  // calculate diff
  const ms =
    (res._renderAt[0] - req._renderAt[0]) * 1e3 +
    (res._renderAt[1] - req._renderAt[1]) * 1e-6;

  // return truncated value
  return ms.toFixed(digits === undefined ? 3 : digits);
});

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

        try {
          render(req, res, data, null, errorsHandler);
        } catch (e) {
          return errorsHandler(req, res, {
            code: 500,
            type: "RENDER error",
            error: e,
            data: data,
          });
        }
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

app.listen(port, function () {
  console.log("render-proxy is listening on", this.address().port);
});
