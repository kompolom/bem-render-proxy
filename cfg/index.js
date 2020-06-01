// Provide resolved config
const defaults = require('./default.conf'),
    yn = require('yn'),
    env = process.env,
    OPT_NAMES = Object.keys(defaults);

const envOpts = OPT_NAMES.reduce(function(opts, optName) {

    if(env[optName]) {
        const isBoolOpt = typeof defaults[optName] === 'boolean',
            envVal = env[optName];
        opts[optName] = isBoolOpt? yn(envVal) : envVal;
    }

    return opts;
}, {});

module.exports = Object.assign({}, defaults, envOpts);
