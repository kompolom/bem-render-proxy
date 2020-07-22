import { ParamsDictionary } from "express-serve-static-core";

export interface IBackendData {
  title: string;
  page: string;
  bundle: string;
  lang: string;
  platform: string;
  description: string;
  data: unknown;
  bundleUrl?: string;
  env?: ParamsDictionary;
  cookies?: ParamsDictionary;
  freezeMap?: ParamsDictionary;
  query?: ParamsDictionary;
  [key: string]: string | unknown;
}
