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
    }),
    request = require('request'),
    zlib = require('zlib');


function sendToSlack(data) {
    request.post(env.LOGMAIL_SLACK_WEBHOOK, { json : {
        username : env.LOGMAIL_FROM_NAME,
        channel : env.LOGMAIL_SLACK_CHANNEL,
        icon_emoji : ':scream_cat:',
        attachments : [
            {
                color : "#f00",
                fields : [
                    {
                        title : "Code:",
                        value : data.code,
                    },
                    {
                        title : "Type:",
                        value : data.type,
                    },
                    {
                        title : "Message:",
                        value : data.error.message,
                    },
                    {
                        title : "Path:",
                        value : data.path
                    },
                    {
                        title: "Server:",
                        value: env.SERVER_BUILD_VERSION
                    },
                    {
                        title : "Front:",
                        value : env.FRONT_BUILD_VERSION
                    },
                ],
                footer: "BEM RENDER PROXY"
            },
            {
                color : "#0B0",
                fields : [
                    {
                        title : "More info sent to:",
                        value : env.LOGMAIL_TO_ADDRESS
                            .split(',')
                            .map((email) => email.trim())
                            .join(', ')
                    }
                ]
            }
        ]
    } }, (err) => console.error(err));
}

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

    if(!mailer) return;

    const mailOptions = {
        from : `${env.LOGMAIL_FROM_NAME} <${env.LOGMAIL_FROM_ADDRESS}>`,
        to : env.LOGMAIL_TO_ADDRESS,
        subject : opts.code + ' | ' + opts.type + ' - ' + opts.error.message,

        // TODO: Отвязать версии сервера и фронта
        text : [
            'server: ' + env.SERVER_BUILD_VERSION,
            'front: ' + env.FRONT_BUILD_VERSION,
            'path: ' + opts.path,
            'error stack: ' + opts.error.stack
        ].join('\n')
    };

    if(opts.data) {
        // Для безопасности
        delete opts.data.env;

        let buf = new Buffer(JSON.stringify(opts.data, null, 4), 'utf8');

        zlib.gzip(buf, (error, result) => {
            if(error) {
                console.log(error, error.stack);
            }

            mailOptions.attachments = [
                {
                    filename : 'data.json.gz',
                    content : result
                }
            ];

            sendMail(mailOptions);
        });
    } else {
        sendMail(mailOptions);
    }

    if(env.LOGMAIL_SLACK_WEBHOOK) {
        sendToSlack(opts)
    }
}

function sendMail(opts) {
    mailer.sendMail(opts, (error, info) => {
        if(error) {
            return console.log(error);
        }
        console.log('Message %s sent: %s', info.messageId, info.response);
    });
}

module.exports = errorsHandler;
