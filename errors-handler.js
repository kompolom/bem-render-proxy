const
    env = process.env,
    mailer = env.LOGMAIL_ENABLED === 'true' && require('nodemailer').createTransport({
        host: env.LOGMAIL_HOST,
        port: env.LOGMAIL_PORT,
        secure: env.LOGMAIL_SECURE, // true | false
        auth: {
            user: env.LOGMAIL_USERNAME,
            pass: env.LOGMAIL_PASSWORD
        }
    });

function errorsHandler(req, res, opts) {
    console.log(opts.error, opts.error.stack);

    opts = Object.assign({
        code : 500,
        type : 'Error'
    }, opts);

    res
        .status(opts.code || 500)
        .end(opts.type + ' ' + opts.error.message);

    if(!mailer) return;

    const mailOptions = {
        from : `${env.LOGMAIL_FROM_NAME} <${env.LOGMAIL_FROM_ADDRESS}>`,
        to : env.LOGMAIL_TO_ADDRESS,
        subject : opts.code + ' | ' + opts.type + ' - ' + opts.error.message,

        // TODO: Отвязать версии сервера и фронта
        text : [
            'server: ' + env.SERVER_BUILD_VERSION,
            'front: ' + env.FRONT_BUILD_VERSION,
            'path: ' + req.originalUrl,
            'error stack: ' + opts.error.stack
        ].join('\n')
    };

    if(opts.data) {
        // Для безопасности
        delete opts.data.env;

        mailOptions.attachments = [
            {
                filename: 'data.json',
                content: new Buffer(JSON.stringify(opts.data), 'utf8')
            }
        ]
    }

    mailer.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Message %s sent: %s', info.messageId, info.response);
    });
}

module.exports = errorsHandler;
