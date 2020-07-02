import request from "supertest";
import app from "../src/app";

describe("app", () => {
  it("Should return 502 without backend", (done) => {
    request(app).get("/").expect(502, done);
  });
});
