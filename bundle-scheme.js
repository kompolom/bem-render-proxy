const path = require('path');

class BundleScheme {
    constructor(bundleFormat, pageFormat, staticRoot = '/'){
        this.bundleFormat = bundleFormat;
        this.pageFormat = pageFormat;
        this.staticRoot = staticRoot;
    }

    set platform(name) { this._platform = name; }
    set scope(name) { this._scope = name; }
    set view(name) { this._view = name; }

    get platform() { return this._platform; }
    get scope() { return this._scope; }
    get view() { return this._view; }
    get baseUrl() { return [this.bundle, this.name].join('/'); }

    /**
     * Относительный путь до бандла
     * @return {string}
     */
    get bundle(){
        return [this.base, this.name].join('/');
    }

    /**
     * Путь к бандлам
     */
    get base(){
        return this.bundleFormat.replace('{platform}', this._platform);
    }

    /**
     * Имя бандла
     */
    get name() {
        return this.pageFormat.replace('{scope}', this._scope).replace('{view}', this._view);
    }

    /**
     * Абсолютный путь к бандлу
     */
    get path() {
        return path.resolve(this.bundle);
    }


    /**
     * Абсолютный путь к файлу
     * @param ext
     * @param lang
     */
    getFile(ext, lang) {
        lang = lang? `.${lang}` : '';
        return path.resolve(`${this.baseUrl}${lang}.${ext}`);
    }

    /**
     * Получает url к файлу
     * @param ext - расширение
     * @param lang - локаль
     * @return {string}
     */
    getFileUrl(ext, lang) {
        lang = lang? `.${lang}` : '';
        return `${this.baseUrl}${lang}.${ext}`;
    }
}

module.exports = BundleScheme;
