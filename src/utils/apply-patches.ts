import path from "path";
import { Request, Response } from "express";

export function applyPatches(
  req: Request,
  res: Response,
  data: Record<string, unknown>,
  patchRoot?: string
) {
  if (!req.query.patch) {
    return;
  }

  // @ts-ignore
  const patches = req.query.patch.split(";");

  patches.forEach(function (patch) {
    console.log("APPLY-PATCH: " + patch);
    const pathToPatch = path.resolve(
      patchRoot
        ? path.join(patchRoot, patch)
        : path.join("data", "patch", patch)
    );
    applyPatch(pathToPatch, data);
  });
}

function applyPatch(pathToPatch: string, data: Record<string, unknown>) {
  try {
    delete require.cache[require.resolve(pathToPatch)];
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require(pathToPatch)(data);
  } catch (err) {
    console.error(err);
  }
}
