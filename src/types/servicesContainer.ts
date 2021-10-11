import { ILogger } from "./ILogger";
import { ErrorHandler } from "../utils/errors-handler";

export type servicesContainer = {
  logger: ILogger;
  errorHandler: ErrorHandler;
};
