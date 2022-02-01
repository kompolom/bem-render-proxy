import { Request, Response } from "express";
import { IRequest } from "../types/IRequest";

export interface IErrorsHandlerOpts {
  code?: number;
  error?: Error;
  type?: string;
  data?: Record<string, unknown>;
  body?: string;
}

export interface ErrorChannel {
  send: (req: Request, res: Response, opts: IErrorsHandlerOpts) => void;
}

export class StderrChannel implements ErrorChannel {
  private readonly debug: boolean;

  constructor(config: { debug: boolean }) {
    this.debug = Boolean(config.debug);
  }

  send(req: IRequest, res: Response, opts: IErrorsHandlerOpts): void {
    if (this.debug && opts.error) {
      throw opts.error;
    } else {
      req._brp.logger.error(opts);
    }
  }
}

export class ErrorHandler {
  protected channels: ErrorChannel[] = [];
  readonly defaultOpts = {
    code: 500,
    type: "Error",
  };

  constructor(channels?: ErrorChannel[]) {
    channels.length && (this.channels = channels);
  }

  public addChannel(channel: ErrorChannel): void {
    this.channels.push(channel);
  }

  public handle(req: Request, res: Response, opts: IErrorsHandlerOpts): void {
    const computedOpts = Object.assign(
      { path: req.originalUrl },
      this.defaultOpts,
      opts
    );

    ErrorHandler.terminateRequest(res, opts);
    this.channels.forEach((channel) => channel.send(req, res, computedOpts));
  }

  static terminateRequest(res: Response, opts: IErrorsHandlerOpts): void {
    res.headersSent || res.status(opts.code || 500);
    res.writableEnded || res.end(`${opts.type}  ${opts.error.message}`);
  }
}
