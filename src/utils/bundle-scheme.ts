import path from "path";

export class BundleScheme {
  public readonly bundleFormat: string;
  public readonly pageFormat: string;
  public readonly mergeFormat: string;
  public readonly baseUrl: string = "";
  public readonly basePath: string = "";
  /**
   * Device platform
   * @protected
   */
  protected _platform: string;
  protected _scope: string;
  protected _view: string;

  constructor({
    bundleFormat,
    pageFormat,
    mergeFormat,
    basePath = "",
    baseUrl = "",
  }: {
    bundleFormat: string;
    pageFormat: string;
    mergeFormat?: string;
    basePath?: string;
    baseUrl?: string;
  }) {
    this.bundleFormat = bundleFormat;
    this.pageFormat = pageFormat;
    this.mergeFormat = mergeFormat;
    this.baseUrl = baseUrl;
    this.basePath = basePath;
  }

  get platform(): string {
    return this._platform;
  }

  set platform(name: string) {
    this._platform = name;
  }

  get scope(): string {
    return this._scope;
  }

  set scope(name: string) {
    this._scope = name;
  }

  set view(name: string) {
    this._view = name;
  }

  get view(): string {
    return this._view;
  }

  /**
   * Базовый url merged-банлда
   * @example http://example.com/deskop/auth
   */
  get mergedUrl(): string {
    return this.baseUrl ? `${this.baseUrl}/${this.merge}` : this.merge;
  }

  /**
   * Базовый url бандла
   * @example http://example.com/desktop.pages/page_auth_login
   */
  get bundleUrl(): string {
    return this.baseUrl ? `${this.baseUrl}/${this.bundle}` : this.bundle;
  }

  /**
   * Относительный путь до бандла
   * @example desktop.pages/page_auth_login
   * @return {string}
   */
  get bundle(): string {
    return [this.bundleName, this.name].join("/");
  }

  /**
   * Имя бандла
   * @example desktop.pages
   */
  get bundleName(): string {
    return this.bundleFormat.replace("{platform}", this._platform);
  }

  /**
   * Имя страницы
   * @example page_auth_login
   */
  get name(): string {
    return this.pageFormat
      .replace("{scope}", this._scope)
      .replace("{view}", this._view);
  }

  get merge(): string {
    return this.mergeFormat
      .replace("{platform}", this._platform)
      .replace(/\{scope\}/g, this._scope)
      .replace(/\{view\}/g, this._view);
  }

  /**
   * Абсолютный путь к бандлу
   */
  get path(): string {
    return path.resolve(this.basePath, this.bundle);
  }

  /**
   * Абсолютный путь к файлу
   * @param ext
   * @param lang
   */
  getFile(ext: string, lang: string): string {
    lang = lang ? `.${lang}` : "";
    return path.resolve(this.path, `${this.name}${lang}.${ext}`);
  }

  /**
   * Получает url к файлу
   * @param ext - расширение
   * @param lang - локаль
   * @param merged - использовать merged bundle
   */
  getFileUrl(ext: string, lang?: string, merged?: boolean): string {
    lang = lang ? `.${lang}` : "";
    if (merged) {
      return `${this.mergedUrl}${lang}.${ext}`;
    }
    return `${this.bundleUrl}/${this.name}${lang}.${ext}`;
  }
}
