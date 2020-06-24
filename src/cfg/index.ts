// Provide resolved config
import defaults from "./default.conf";
import yn from "yn";

const env = process.env,
  BOOL_OPTS = ["USE_TELEGRAM_BOT", "USE_MERGES"],
  OPT_NAMES = Object.keys(defaults).concat(BOOL_OPTS);

const envOpts = OPT_NAMES.reduce(function (opts, optName) {
  if (env[optName]) {
    const isBoolOpt =
        typeof defaults[optName] === "boolean" || BOOL_OPTS.includes(optName),
      envVal = env[optName];
    opts[optName] = isBoolOpt ? yn(envVal) : envVal;
  }

  return opts;
}, {});

const resolvedOpts = Object.assign({}, defaults, envOpts);

export default Object.assign(
  {
    USE_TELEGRAM_BOT: resolvedOpts.APP_ENV !== "local",
    USE_MERGES:
      resolvedOpts.APP_ENV === "production" || resolvedOpts.APP_ENV === "stage",
  },
  resolvedOpts
);
