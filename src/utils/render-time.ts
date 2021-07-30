import { Request, Response } from "express";

export const timeSymbol = "__BRP_TIME__";

export function fixTime(r: Request | Response): void {
  r[timeSymbol] || (r[timeSymbol] = process.hrtime());
}

export function calcRenderTime(
  req: Request,
  res: Response,
  digits = 3
): string | undefined {
  if (!req[timeSymbol] || !res[timeSymbol]) {
    // missing request and/or response start time
    return;
  }

  // calculate diff
  const ms =
    (res[timeSymbol][0] - req[timeSymbol][0]) * 1e3 +
    (res[timeSymbol][1] - req[timeSymbol][1]) * 1e-6;

  // return truncated value
  return ms.toFixed(digits);
}
