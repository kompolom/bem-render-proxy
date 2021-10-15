import { Response, NextFunction, RequestHandler } from "express";
import { backendData } from "./backendProxy";
import { applyPatches } from "../utils/apply-patches";
import { IRequest } from "../types/IRequest";

export const patch = (enabled: boolean): RequestHandler => (
  req: IRequest,
  res: Response,
  next: NextFunction
): void => {
  if (enabled) {
    applyPatches(req, res, res[backendData]);
  }
  next();
};
