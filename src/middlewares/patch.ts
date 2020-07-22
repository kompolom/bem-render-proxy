import { Request, Response, NextFunction, RequestHandler } from "express";
import { backendData } from "./backendProxy";
import { applyPatches } from "../utils/apply-patches";

export const patch = (enabled: boolean): RequestHandler => (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (enabled) {
    applyPatches(req, res, res[backendData]);
  }
  next();
};
