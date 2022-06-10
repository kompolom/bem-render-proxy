import { IncomingMessage, OutgoingMessage } from "http";

export function bypassHeaders(
  from: IncomingMessage,
  to: OutgoingMessage,
  blacklisted: string[] = []
): void {
  for (const headerName of Object.keys(from.headers)) {
    if (blacklisted.includes(headerName.toLowerCase())) continue;

    to.setHeader(headerName, from.headers[headerName]);
  }
}
