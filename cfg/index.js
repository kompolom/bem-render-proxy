// Provide resolved config
const defaults = require('./default.conf'),
    yn = require('yn'),
    env = process.env,
    BOOL_OPTS = [
        'USE_TELEGRAM_BOT',
        'USE_MERGES'
    ]
    OPT_NAMES = Object.keys(defaults).concat(BOOL_OPTS);

const envOpts = OPT_NAMES.reduce(function(opts, optName) {

    if(env[optName]) {
        const isBoolOpt = typeof defaults[optName] === 'boolean' || BOOL_OPTS.includes(optName),
            envVal = env[optName];
        opts[optName] = isBoolOpt? yn(envVal) : envVal;
    }

    return opts;
}, {});

const resolvedOpts = Object.assign({}, defaults, envOpts);

module.exports = Object.assign({
    USE_TELEGRAM_BOT: resolvedOpts.APP_ENV !== 'local',
    USE_MERGES: resolvedOpts.APP_ENV === 'production' || resolvedOpts.APP_ENV === 'stage'
}, resolvedOpts);
