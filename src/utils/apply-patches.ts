import path from "path";
import { Response } from "express";
import { IRequest } from "../types/IRequest";
import { ILogger } from "../types/ILogger";

export function applyPatches(
  req: IRequest,
  res: Response,
  data: Record<string, unknown>,
  patchRoot?: string
): void {
  if (!req.query.patch) {
    return;
  }

  // @ts-ignore
  const patches = req.query.patch.split(";");
  const logger = req._brp.logger;

  patches.forEach(function (patch) {
    logger.log("APPLY-PATCH: " + patch);
    const pathToPatch = path.resolve(
      patchRoot
        ? path.join(patchRoot, patch)
        : path.join("data", "patch", patch)
    );
    applyPatch(pathToPatch, data, logger);
  });
}

function applyPatch(
  pathToPatch: string,
  data: Record<string, unknown>,
  console: ILogger
) {
  try {
    delete require.cache[require.resolve(pathToPatch)];
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require(pathToPatch)(data);
  } catch (err) {
    console.error(err);
  }
}
