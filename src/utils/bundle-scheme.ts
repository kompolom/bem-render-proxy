import path from "path";

export class BundleScheme {
  public readonly bundleFormat: string;
  public readonly pageFormat: string;
  public readonly staticRoot: string = "/";
  protected _platform: string;
  protected _scope: string;
  protected _view: string;

  constructor(bundleFormat: string, pageFormat: string, staticRoot = "/") {
    this.bundleFormat = bundleFormat;
    this.pageFormat = pageFormat;
    this.staticRoot = staticRoot;
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
  get baseUrl(): string {
    return [this.bundle, this.name].join("/");
  }

  /**
   * Относительный путь до бандла
   * @return {string}
   */
  get bundle(): string {
    return [this.base, this.name].join("/");
  }

  /**
   * Путь к бандлам
   */
  get base(): string {
    return this.bundleFormat.replace("{platform}", this._platform);
  }

  /**
   * Имя бандла
   */
  get name(): string {
    return this.pageFormat
      .replace("{scope}", this._scope)
      .replace("{view}", this._view);
  }

  /**
   * Абсолютный путь к бандлу
   */
  get path(): string {
    return path.resolve(this.bundle);
  }

  /**
   * Абсолютный путь к файлу
   * @param ext
   * @param lang
   */
  getFile(ext: string, lang: string): string {
    lang = lang ? `.${lang}` : "";
    return path.resolve(`${this.baseUrl}${lang}.${ext}`);
  }

  /**
   * Получает url к файлу
   * @param ext - расширение
   * @param lang - локаль
   */
  getFileUrl(ext: string, lang: string): string {
    lang = lang ? `.${lang}` : "";
    return `${this.baseUrl}${lang}.${ext}`;
  }
}
