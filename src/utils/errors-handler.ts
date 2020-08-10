import config from "../cfg";
import { Request, Response } from "express";

const env = process.env,
  channels = [];

export interface IErrorsHandlerOpts {
  code?: number;
  error?: Error;
  type?: string;
  data?: Record<string, unknown>;
  body?: string;
}

const stderrChannel = (
  req: Request,
  res: Response,
  opts: IErrorsHandlerOpts
) => {
  if (config.APP_DEBUG && opts.error) {
    throw opts.error;
  } else {
    console.error(JSON.stringify(opts, null, 2));
  }
};

channels.push(stderrChannel);

function errorsHandler(
  req: Request,
  res: Response,
  opts: IErrorsHandlerOpts
): void {
  opts = Object.assign(
    {
      code: 500,
      type: "Error",
      path: req.originalUrl,
    },
    opts
  );

  res.status(opts.code || 500).end(opts.type + " " + opts.error.message);

  channels.forEach((channel) => channel(req, res, opts));
}

if (config.USE_TELEGRAM_BOT) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const zlib = require("zlib"),
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    TelegramBot = require("node-telegram-bot-api"),
    token = env.TELEGRAM_BOT_TOKEN,
    chatId = env.TELEGRAM_CHAT_ID,
    bot = new TelegramBot(token, { polling: false });

  /**
   * SendMessage to external source
   *
   * @param {Request} req
   * @param {Response} res
   * @param {Object} opts
   * @param {Number} opts.code
   * @param {String} opts.type
   * @param {String} opts.path
   * @param {Error} opts.error
   * @param {Object} [opts.data]
   */
  channels.push(function (req, res, opts) {
    if (!bot) return;

    const text = [
      `${opts.code} | ${opts.type} - ${opts.error.message}`,
      "",
      `${req.headers["X-Forwarded-Host"]} ${
        opts.data ? opts.data.platform : "---"
      }`,
      `${req.method} ${opts.path}`,
    ].join("\n");

    if (opts.data) {
      // Для безопасности
      try {
        delete opts.data.env;
      } catch (e) {}

      const buf = new Buffer(JSON.stringify(opts.data, null, 2), "utf8");

      zlib.gzip(buf, (error, result) => {
        if (error) {
          console.error(error);
          return;
        }

        bot.sendDocument(
          chatId,
          result,
          {
            caption: text,
          },
          {
            filename: "data.json",
          }
        );
      });
    } else {
      bot.sendMessage(chatId, text);
    }
  });
}

export default errorsHandler;
