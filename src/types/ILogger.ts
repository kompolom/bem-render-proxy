export type ILogger = Pick<
  Console,
  "debug" | "info" | "log" | "warn" | "error"
>;
