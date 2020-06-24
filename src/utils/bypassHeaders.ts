import { IncomingMessage, OutgoingMessage } from "http";

const BLACKLISTED_HEADERS = {
  "content-type": true,
};

export function bypassHeaders(
  from: IncomingMessage,
  to: OutgoingMessage
): void {
  for (const headerName of Object.keys(from.headers)) {
    if (BLACKLISTED_HEADERS[headerName]) continue;

    to.setHeader(headerName, from.headers[headerName]);
  }
}
