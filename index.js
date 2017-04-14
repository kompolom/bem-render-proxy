'use strict';

const express = require('express'),
    fs = require('fs'),
    path = require('path'),
    app = express(),
    bodyParser = require('body-parser'),
    port = process.env.APP_PORT,
    backendHost = process.env.BACKEND_HOST,
    backendPort = process.env.BACKEND_PORT,
    isSocket = isNaN(port),
    http = require('http'),
    FileStreamRotator = require('file-stream-rotator'),
    morgan = require('morgan'),
    logDir = process.env.LOGS_DIR || path.resolve(process.cwd(), 'logs'),
    Render = require('./render.js'),
    applyPatches = require('./apply-patches'),
    DEBUG = process.env.APP_DEBUG,
    APP_ENV = process.env.APP_ENV,
    renderContentType = 'application/bem+json',
    render = Render.render;

// ensure log directory exists
fs.existsSync(logDir) || fs.mkdirSync(logDir);

// create a rotating write stream
var accessLogStream = FileStreamRotator.getStream({
  date_format : 'YYYYMMDD',
  filename : logDir + '/access-%DATE%.log',
  frequency : 'daily',
  verbose : false
});

morgan.token('render-time', function(req, res, digits){
    if(!req._renderAt || !res._renderAt){
    // missing request and/or response start time
    return;
  }

  // calculate diff
  var ms = (res._renderAt[0] - req._renderAt[0]) * 1e3 +
    (res._renderAt[1] - req._renderAt[1]) * 1e-6;

  // return truncated value
  return ms.toFixed(digits === undefined? 3 : digits)
});

app
    .disable('x-powered-by')
    .disable('E-tag')
    .use(morgan(':method :url :status - :response-time ms (render :render-time ms)', { stream : accessLogStream }))
    .use(bodyParser.json());

if(DEBUG){
    app.use(morgan(':method :url :status - :response-time ms (render :render-time ms)'));
}

app.all('*', function(req, res) {
    req.headers.accept = renderContentType + ';' + req.headers.accept;
    delete req.headers.host; // Удаляем оригинальный заголовок Host, чтобы web-server мог правильно определить vhost
    var opts = {
        method : req.method,
        hostname : backendHost,
        port : backendPort,
        path : req.url,
        headers : req.headers
    },
    clientReq = http.request(opts, function (backendMessage) {
        const COOKIE_HEADER = 'set-cookie';
        var needRender = !!backendMessage.headers['x-render'] || backendMessage.headers['content-type'] === renderContentType,
            body = '';

        if(!needRender){
            res.writeHead(backendMessage.statusCode, backendMessage.headers);
            backendMessage.on('data', (chunk) => {res.write(chunk);});
            backendMessage.on('end', () => {res.end();});
            return;
        }

        backendMessage.on('data', function (chunk) { body += chunk; });
        backendMessage.on('end', function () {
            res.status(backendMessage.statusCode);
            if(this.headers[COOKIE_HEADER])
                res.setHeader(COOKIE_HEADER, backendMessage.headers[COOKIE_HEADER]);

            let data;

            try {
                data = JSON.parse(body);
            } catch (err) {
                console.error(err, err.stack);
                res.status(502).end(err.message);
            }

            if (APP_ENV === 'local') {
                applyPatches(req, res, data);
            }

            render(req, res, data);
        });
    });

    clientReq.on('error', function(e){
        res.sendStatus(502);
        res.end();
        console.log(e);
    });

    req.on('data', (chunk) => { clientReq.write(chunk); });
    req.on('end', () => { clientReq.end(); });
});
isSocket && fs.existsSync(port) && fs.unlinkSync(port);

app.listen(port, function() {
    isSocket && fs.chmod(port, '0777');
    console.log('render-proxy is listening on', this.address().port);
});
