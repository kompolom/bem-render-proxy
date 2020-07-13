import express from "express";
import config from "./cfg";
import cookieParser from "cookie-parser";
import RFS from "rotating-file-stream";
import morgan from "morgan";
import errorsHandler from "./utils/errors-handler";
import { ClassicRenderer } from "./renderers/Classic";
import { calcRenderTime } from "./utils/render-time";
import {
  backendData,
  backendProxy,
  calcBackendTime,
} from "./middlewares/backendProxy";
import { patch } from "./middlewares/patch";

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
  DEBUG = config.APP_DEBUG,
  APP_ENV = config.APP_ENV;

morgan.token("render-time", calcRenderTime);
morgan.token("backend", calcBackendTime);
const logFormat =
  ":method :url :status - :response-time ms (backend :backend ms) (render :render-time ms)";
if (config.FILE_LOGS_ENABLED) {
  // create a rotating write stream
  const accessLogStream = RFS.createStream("access.log", {
    teeToStdout: DEBUG,
    path: config.LOGS_DIR,
    size: "10M",
    interval: "1d",
    compress: "gzip",
  });
  app.use(morgan(logFormat, { stream: accessLogStream }));
} else {
  app.use(morgan(logFormat));
}

app
  .disable("x-powered-by")
  .disable("E-tag")
  .use(cookieParser())
  .use(backendProxy({ host: config.BACKEND_HOST, port: config.BACKEND_PORT }))
  .use(patch(APP_ENV === "local"));

app.all("*", function (req, res) {
  renderer.render(req, res, res[backendData]).catch((errData) => {
    errorsHandler(req, res, errData);
  });
});

console.log("Run in", APP_ENV.toUpperCase(), "mode");
console.log("USE_CACHE:", config.USE_CACHE);
console.log("DEBUG:", DEBUG);

export default app;
