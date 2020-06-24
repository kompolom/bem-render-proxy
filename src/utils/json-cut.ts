export function jsonCut(data: Record<string, unknown>, path?: string): unknown {
  if (!path || path === "1") return data;

  const steps = path.split(/[\[\]\.]/);

  let result: unknown = data;
  steps.forEach((step) => {
    if (step === "") return;

    result = result[step];
  });

  return result;
}
