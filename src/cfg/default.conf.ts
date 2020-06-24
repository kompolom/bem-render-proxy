// File contains default options
import path from "path";

export default {
  APP_ENV: "production",
  APP_PORT: 3030,
  APP_DEBUG: false,
  USE_CACHE: false,
  CACHE_TTL: 0,
  CACHE_SIZE: 1000,
  STATIC_ROOT: "/",
  NORMALIZE_FREEZE_URLS: false,
  FREEZE_MAP: "",
  BUNDLE_FORMAT: "{platform}.pages",
  PAGE_FORMAT: "page_{scope}_{view}",
  DEFAULT_LANG: "ru",
  BACKEND_HOST: "localhost",
  BACKEND_PORT: 8080,
  FILE_LOGS_ENABLED: false,
  LOGS_DIR: path.resolve(process.cwd(), "logs"),
};
