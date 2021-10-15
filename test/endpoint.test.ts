import request from "supertest";
import { config } from "../src";
import { BemRenderProxy, ClassicBackend, ILogger } from "../src";
import { mockBackend } from "./mockServer/server";

class MockBackend extends ClassicBackend {}
class FakeLogger implements ILogger {
  debug() {
    jest.fn();
  }
  log() {
    jest.fn();
  }
  info() {
    jest.fn();
  }

  warn() {
    jest.fn();
  }
  error() {
    jest.fn();
  }
}

const app = new BemRenderProxy({
  config: config,
  backends: [
    new MockBackend({
      name: "mock",
      port: config.BACKEND_PORT,
      host: config.BACKEND_HOST,
    }),
  ],
  logger: new FakeLogger(),
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

  describe("backends", () => {
    let app, backendSelectFunc;
    beforeEach(() => {
      backendSelectFunc = jest.fn((req, backends) => backends.default);
      app = new BemRenderProxy({
        config: config,
        backendSelectFunc: backendSelectFunc,
        backends: [
          new MockBackend({
            name: "mock1",
            port: config.BACKEND_PORT,
            host: config.BACKEND_HOST,
          }),
          new MockBackend({
            name: "mock2",
            port: config.BACKEND_PORT,
            host: config.BACKEND_HOST,
          }),
        ],
        logger: new FakeLogger(),
      }).app;
    });

    it("should call backendSelectFunc", (done) => {
      request(app)
        .get("/")
        .end(() => {
          expect(backendSelectFunc).toBeCalled();
          done();
        });
    });
  });
});
