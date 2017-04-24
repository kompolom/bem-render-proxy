const should = require('should'),
    path = require('path'),
    BundleScheme = require('../bundle-scheme');

describe('bundle-scheme', function() {
    var bundleScheme;

    describe('{platform}.pages/page_{scope}_{view}', function() {
        var scheme = '{platform}.pages',
            page = 'page_{scope}_{view}';
        before(function(){
            bundleScheme = new BundleScheme(scheme, page);
        });

        it('should return bundle url', function() {
            bundleScheme.platform = 'desktop';
            bundleScheme.scope = 'shop';
            bundleScheme.view = 'index';
            bundleScheme.bundle.should.be.equal('desktop.pages/page_shop_index');
        });

        it('should return bundle path', function() {
            bundleScheme.platform = 'desktop';
            bundleScheme.scope = 'shop';
            bundleScheme.view = 'index';
            bundleScheme.path.should.be.equal(path.resolve('desktop.pages', 'page_shop_index'));
        });

        it('should return bundle name', function() {
            bundleScheme.platform = 'desktop';
            bundleScheme.scope = 'shop';
            bundleScheme.view = 'index';
            bundleScheme.name.should.be.equal('page_shop_index');
        });

        it('should change name', function() {
            bundleScheme.platform = 'desktop';
            bundleScheme.scope = 'shop';
            bundleScheme.view = 'index';
            bundleScheme.scope = 'admin';
            bundleScheme.view = 'documents';
            bundleScheme.name.should.be.equal('page_admin_documents');
        });

        it('should return file url', function() {
            bundleScheme.platform = 'desktop';
            bundleScheme.scope = 'shop';
            bundleScheme.view = 'index';
            bundleScheme.getFileUrl('js', 'ru').should.be.equal('desktop.pages/page_shop_index/page_shop_index.ru.js');
        });

        it('static Root should have value', function() {
            let bs = new BundleScheme(scheme, page, 'http://abc.com/');
            bs.staticRoot.should.be.equal('http://abc.com/')
        });
    });

    describe('pages/{platform}/page_{scope}_{view}', function() {
        var scheme = 'pages/{platform}',
            page = 'page_{scope}_{view}';
        before(function(){
            bundleScheme = new BundleScheme(scheme, page);
        });

        it('should return bundle url', function() {
            bundleScheme.platform = 'desktop';
            bundleScheme.scope = 'shop';
            bundleScheme.view = 'index';
            bundleScheme.baseUrl.should.be.equal('pages/desktop/page_shop_index/page_shop_index');
        });
    });
});
