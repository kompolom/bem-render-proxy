export class FreezeMapper {
  readonly winRegexp = new RegExp("\\\\", "g");
  readonly unixRegexp = new RegExp("/", "g");
  private readonly _map: Record<string, string>;
  private readonly _isNeedNormalize: boolean = false;

  constructor(path2map = {}, normalize = false) {
    this._isNeedNormalize = normalize;
    this._map = path2map;
  }

  /**
   * Ищет соответствие в карте фризов для переданного url
   * @public
   * @param {String} url - ссылка на ресурс
   * @return {String} ссылка на замороженый ресурс
   */
  linkTo(url: string): string {
    if (this._isNeedNormalize) {
      const key = this._unix2win(url);
      if (this._map[key]) {
        return this._win2unix(this._map[key]);
      }
      return url;
    }

    return this._map[url] || url;
  }

  _unix2win(url: string): string {
    return url.replace(this.unixRegexp, "\\");
  }

  _win2unix(url: string): string {
    return url.replace(this.winRegexp, "/");
  }
}
