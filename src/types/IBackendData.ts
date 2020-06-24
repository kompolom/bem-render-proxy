import { IDictionary } from "./IDictionary";

export interface IBackendData {
  title: string;
  page: string;
  bundle: string;
  lang: string;
  platform: string;
  description: string;
  data: unknown;
  bundleUrl?: string;
  env?: IDictionary<string>;
  cookies?: IDictionary<string>;
  freezeMap?: IDictionary<string>;
  query?: IDictionary<unknown>;
  [key: string]: string | unknown;
}
