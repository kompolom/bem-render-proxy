import http from "http";
import { bypassHeaders } from "../src/utils/bypassHeaders";

describe("bypassHeaders", () => {
  const from = ({
    headers: {
      "content-type": "text/html",
      status: 200,
    },
  } as unknown) as http.IncomingMessage;
  let to = new http.OutgoingMessage();
  let BLACKLISTED_HEADERS;

  beforeEach(() => {
    BLACKLISTED_HEADERS = {
      "content-type": true,
    };
    to = new http.OutgoingMessage();
  });

  it("Should pass `status` header", () => {
    bypassHeaders(from, to);
    expect(to.getHeader("status")).toBe(200);
  });

  it("Should not pass `content-type` header", () => {
    bypassHeaders(from, to);
    expect(to.getHeader("content-type")).toBeUndefined();
  });
});
