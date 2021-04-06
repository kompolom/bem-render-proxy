import request from "supertest";
import { config } from "../src/cfg";
import { BemRenderProxy } from "../src";
import { mockBackend } from "./mockServer/server";
import { ClassicBackend } from "../src";

class MockBackend extends ClassicBackend {}

const app = new BemRenderProxy({
  config: config,
  backends: [
    new MockBackend({
      name: "mock",
      port: config.BACKEND_PORT,
      host: config.BACKEND_HOST,
    }),
  ],
}).app;

describe("app", () => {
  let server;
  beforeAll(() => {
    server = mockBackend.listen(config.BACKEND_PORT);
  });
  afterAll(() => {
    server.close();
  });

  it("Should handle request", (done) => {
    request(app).get("/").expect(200, done);
  });

  it("Should proxy request without render", (done) => {
    request(app)
      .get("/")
      .expect("Content-Type", /application\/json/)
      .expect(200, done);
  });

  it("Should pass data to render", (done) => {
    request(app)
      .get("/render")
      .expect("Content-Type", "text/html; charset=utf-8")
      .end(() => {
        done();
      });
  });
});
