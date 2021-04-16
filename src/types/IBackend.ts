import { ClientRequest, IncomingMessage } from "http";
import { Request } from "express";

export type bypassCb = (res: IncomingMessage) => void;
export type renderCb = (res: IncomingMessage, body: string) => void;

export interface IBackend {
  host: string;
  port: number;
  name: string;
  proxy: (req: Request, bypass: bypassCb, render: renderCb) => ClientRequest;
  checkNeedRender: (backendMessage: IncomingMessage) => boolean;
  parse: (data) => unknown;
}

export interface IBackendOptions {
  host: string;
  port: number;
  name: string;
}
