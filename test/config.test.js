process.env.APP_ENV = 'stage';
process.env.APP_DEBUG = 'yes';

const config = require('../cfg');

describe('config', () => {
    it('Should return value from env', () => {
        expect(config.APP_ENV).toBe('stage');
    });

    it('Should return default value', () => {
        expect(config.APP_PORT).toBe(3030);
    });

    it('Should resolve boolean value', () => {
        expect(config.APP_DEBUG).toBe(true);
    });
});
