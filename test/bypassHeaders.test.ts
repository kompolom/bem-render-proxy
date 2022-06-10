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

  beforeEach(() => {
    to = new http.OutgoingMessage();
  });

  it("Should pass `status` header", () => {
    bypassHeaders(from, to);
    expect(to.getHeader("status")).toBe(200);
  });

  it("Should not pass `content-type` header", () => {
    bypassHeaders(from, to, ["content-type"]);
    expect(to.getHeader("content-type")).toBeUndefined();
  });
});
