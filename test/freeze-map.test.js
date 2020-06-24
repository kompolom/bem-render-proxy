const FreezeMapper = require('../src/utils/freeze-map'),
    WIN_MAP = {
        "bundles\\admin\\admin.css": "static\\KgEh9r54CSl.css",
        "bundles\\admin\\admin.js": "static\\dfuVYKVTKZF.js",
    },
    UNIX_MAP = {
        "bundles/admin/admin.css": "static/KgEh9r54CSl.css",
        "bundles/admin/admin.js": "static/dfuVYKVTKZF.js",
    };

describe('Freeze map', () => {
    let mapperUnix, mapperWin;

    beforeEach(() => {
        mapperUnix = new FreezeMapper(UNIX_MAP);
        mapperWin = new FreezeMapper(WIN_MAP, true);
    });

    it('Should return mapped url', () => {
       expect(mapperUnix.linkTo("bundles/admin/admin.css")).toBe("static/KgEh9r54CSl.css")
    });

    it('Should convert windows path to unix', () => {
        expect(mapperWin.linkTo("bundles/admin/admin.css")).toBe("static/KgEh9r54CSl.css")
    });

    it('Should return input path if not match', () => {
        expect(mapperUnix.linkTo('wrong/path')).toBe('wrong/path');
        expect(mapperWin.linkTo('wrong/path')).toBe('wrong/path');

    });

    describe('Win', function() {});
});
