import { ILogger } from "./ILogger";
import { ErrorHandler } from "../utils/errors-handler";
import { StatsCollector, StatsManager } from "../middlewares/StatsCollector";

export type servicesContainer = {
  logger: ILogger;
  errorHandler: ErrorHandler;
  statsCollector: StatsCollector;
  statsManager: StatsManager;
};
