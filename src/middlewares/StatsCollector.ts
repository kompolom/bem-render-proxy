import { IRequest, IResponse } from "../types/IRequest";
import { Request, Response, NextFunction } from "express";
import { ILogger } from "../types/ILogger";

export type HRTime = [number, number];

export class StatsManager {
  constructor(
    protected readonly logger: ILogger,
    protected readonly _addTimingHeaders?: boolean
  ) {
    this.middleware = this.middleware.bind(this);
  }

  middleware(req: IRequest, res: IResponse, next: NextFunction): void {
    if (this._addTimingHeaders) {
      StatsManager.patchSend(res, () => {
        this._onHeaders(res);
      });
      StatsManager.patchWriteHead(res, () => {
        this._onHeaders(res);
      });
    }
    res.once("close", () => {
      setImmediate(() => this._onRequestEnd(res));
    });
    next();
  }

  private _onRequestEnd(res: IResponse) {
    const stats = res._brp.statsCollector.getStats();
    this.logger.log(stats);
  }

  private _onHeaders(res: IResponse): void {
    if (res.headersSent || res[StatsManager.headersSymbol]) return;
    res[StatsManager.headersSymbol] = true;

    this._setServerTimingHeaders(res);
  }

  private _setServerTimingHeaders(res: IResponse) {
    const timings = res._brp.statsCollector.getTimings();
    const headerValue = Object.entries(timings)
      .map((value) =>
        StatsManager.timing2ServerTimingHeader(value[0], value[1])
      )
      .join(", ");
    res.setHeader("Server-Timing", headerValue);
  }

  static timing2ServerTimingHeader(name: string, duration: number): string {
    return `${name};dur=${duration}`;
  }

  static patchWriteHead(res: Response, cb: () => void): void {
    const writeHead = res.writeHead;
    res.writeHead = function () {
      cb();
      // eslint-disable-next-line prefer-rest-params
      return writeHead.apply(this, arguments);
    };
  }

  static patchSend(res: Response, cb: () => void): void {
    const send = res.send;
    res.send = function () {
      cb();
      // eslint-disable-next-line prefer-rest-params
      return send.apply(this, arguments);
    };
  }

  static headersSymbol = Symbol("onHeadersCalled");
}

export class StatsCollector {
  /**
   * Temp stats container
   * @private
   */
  private _stats: Record<string, unknown> = {};
  private _timings: Record<string, [HRTime, HRTime]> = {};
  private _fixed = false;

  constructor(private readonly req: Request, private readonly res: Response) {
    this.fixTime("total");
    this.pushValue("remoteAddr", StatsCollector.ipFromReq(req));
    this.pushValue("url", req.url);
    this.pushValue("method", req.method);
    this.pushValue("date", new Date());
    this.pushValue("user-agent", req.headers["user-agent"]);
    res.once("close", () => {
      setImmediate(() => this._fixStats());
    });
    StatsCollector.patchEnd(res, () => {
      setImmediate(() => this._fixStats());
    });
  }

  fixTime(key: string): void {
    this.pushTiming(key, process.hrtime());
  }

  pushTiming(key: string, hrtime: HRTime): void {
    this._timings[key]
      ? (this._timings[key][1] = hrtime)
      : (this._timings[key] = [hrtime, [NaN, NaN]]);
  }

  pushValue(key: string, value: unknown): void {
    if (this._stats[key] === undefined) {
      this._stats[key] = value;
    } else if (Array.isArray(this._stats[key])) {
      (this._stats[key] as Array<unknown>).push(value);
    } else {
      this._stats[key] = [this._stats[key]];
      (this._stats[key] as Array<unknown>).push(value);
    }
  }

  getStats(): Record<string, unknown> {
    return Object.assign({}, this._stats, this.getTimings());
  }

  getTimings(): Record<string, number> {
    const stats = {};
    const timings = this._calcTimings();
    Object.keys(timings).forEach((key) => {
      stats[key + "Time"] = timings[key];
    });
    return stats;
  }

  getTiming(key: string): number | undefined {
    if (!this._timings[key]) return;

    return StatsCollector.hrDiff(this._timings[key][0], this._timings[key][1]);
  }

  private _fixStats() {
    if (this._fixed) return;
    this._fixed = true;

    this.pushValue("status", this.res.statusCode);
    this.fixTime("total");
  }

  private _calcTimings(): Record<string, number> {
    const timings = {};
    for (const token in this._timings) {
      const series = this._timings[token];
      const val = StatsCollector.hrDiff(series[0], series[1]);
      if (isNaN(val)) continue;
      timings[token] = val;
    }
    return timings;
  }

  static patchEnd(res: Response, cb: () => void): void {
    const end = res.end;
    res.end = function () {
      cb();
      // eslint-disable-next-line prefer-rest-params
      return end.apply(this, arguments);
    };
  }

  static ipFromReq(req: Request): string | undefined {
    return (
      req.ip ||
      // @ts-ignore
      req._remoteAddress ||
      (req.connection && req.connection.remoteAddress) ||
      undefined
    );
  }

  /**
   * Calculate diff between hrtime timestamps.
   * @param start hrtime
   * @param end hrtime
   * @return number float diff in msec.
   */
  static hrDiff(start: HRTime, end: HRTime): number {
    const ms = (end[0] - start[0]) * 1e3 + (end[1] - start[1]) * 1e-6;

    return Number.parseFloat(ms.toFixed(2));
  }
}
