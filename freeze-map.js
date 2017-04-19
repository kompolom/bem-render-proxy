class FreezeMapper {
    get winRegexp() { return new RegExp('\\\\', 'g')}
    get unixRegexp() { return new RegExp('/', 'g')}

    constructor(path2map = {}, normalize = false){
        this._isNeedNormalize = normalize;
        this._map = path2map;
    }

    /**
     * Ищет соответствие в карте фризов для переданного url
     * @public
     * @param {String} url - ссылка на ресурс
     * @return {String} ссылка на замороженый ресурс
     */
    linkTo(url){
        if(this._isNeedNormalize) {
            let key = this._unix2win(url);
            if(this._map[key]) {
                return this._win2unix(this._map[key]);
            }
            return url;
        }

        return this._map[url] || unfreezed;
    }

    _unix2win(url) {
        return url.replace(this.unixRegexp, '\\');
    }

    _win2unix(url) {
        return url.replace(this.winRegexp, '/');
    }
};

module.exports = FreezeMapper;
