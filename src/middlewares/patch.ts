import { Request, Response, NextFunction } from "express";
import { backendData } from "./backendProxy";
import { applyPatches } from "../utils/apply-patches";

export const patch = (enabled: boolean) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (enabled) {
    applyPatches(req, res, res[backendData]);
  }
  next();
};
