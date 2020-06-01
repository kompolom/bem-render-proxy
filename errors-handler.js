const
    env = process.env,
    config = require('./cfg');

let sendMessage = function() {};

function errorsHandler(req, res, opts) {
    console.log(opts.error, opts.error.stack);

    opts = Object.assign({
        code : 500,
        type : 'Error',
        path : req.originalUrl
    }, opts);

    res
        .status(opts.code || 500)
        .end(opts.type + ' ' + opts.error.message);

    sendMessage(req, res, opts);
}

if(config.USE_TELEGRAM_BOT) {
    const zlib = require('zlib'),
        TelegramBot = require('node-telegram-bot-api'),
        token = env.TELEGRAM_BOT_TOKEN,
        chatId = env.TELEGRAM_CHAT_ID,
        bot = new TelegramBot(token, { polling : false });

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
        sendMessage = function(req, res, opts) {
            if(!bot) return;

            const text = [
                `${opts.code} | ${opts.type} - ${opts.error.message}`,
                '',
                `${req.headers['X-Forwarded-Host']} ${(opts.data? opts.data.platform : '---')}`,
                `${req.method} ${opts.path}`,
            ].join('\n');

            if(opts.data) {
                // Для безопасности
                try {
                    delete opts.data.env;
                } catch(e) {}

                let buf = new Buffer(JSON.stringify(opts.data, null, 2), 'utf8');

                zlib.gzip(buf, (error, result) => {
                    if(error) { reject(error); }

                    bot.sendDocument(chatId, result, {
                        caption : text,
                    }, {
                        filename : 'data.json'
                    });
                });
            } else {
                bot.sendMessage(chatId, text);
            }
        }
}


module.exports = errorsHandler;
