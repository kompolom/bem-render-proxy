import request from "supertest";
import conf from "../src/cfg";
import { BemRenderProxy } from "../src/bemRenderProxy";
import { mockBackend } from "./mockServer/server";

const app = new BemRenderProxy().app;

describe("app", () => {
  let server;
  beforeAll(() => {
    server = mockBackend.listen(conf.BACKEND_PORT);
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
      .end((err, res) => {
        done();
      });
  });
});
