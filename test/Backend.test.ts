import { Backend } from "../src/backends/Backend";
import { IBackendOptions } from "../src/types/IBackend";
import { getMockReq } from "@jest-mock/express";
import http from "http";

jest.mock("http");

describe("Backend", () => {
  let backend, conf;
  beforeEach(() => {
    conf = {
      host: "127.0.0.1",
      port: 8080,
      name: "test",
    };
    backend = new Backend(conf);
  });

  it("should contain host prop", () => {
    expect(backend.host).toBe(conf.host);
  });

  it("should contain port prop", () => {
    expect(backend.port).toBe(conf.port);
  });

  it("should contain name prop", () => {
    expect(backend.name).toBe(conf.name);
  });

  it("should throw if name missed", () => {
    expect(
      () => new Backend({ host: "localhost", port: 9090 } as IBackendOptions)
    ).toThrow("Attempt to create backend instance without name");
  });

  it("should have checkNeedRender method", () => {
    expect(typeof backend.checkNeedRender).toBe("function");
  });

  it("should have proxy method", () => {
    expect(typeof backend.proxy).toBe("function");
  });

  describe("getRequestHeaders", () => {
    let req, headers;
    beforeEach(() => {
      headers = {
        host: "8.8.8.8",
        agent: "curl/7",
      };
      req = getMockReq({ headers });
    });

    it("getRequestHeaders should replace host header by x-forwarded-host", () => {
      const reqHeaders = backend.getRequestHeaders(req);
      expect(reqHeaders).not.toHaveProperty("host");
      expect(reqHeaders).toHaveProperty("X-Forwarded-Host", headers.host);
    });

    it("getRequestHeaders should contain original request headers", () => {
      expect(backend.getRequestHeaders(req)).toHaveProperty(
        "agent",
        headers.agent
      );
    });
  });

  describe("getRequestOptions", () => {
    let req, headers;
    beforeEach(() => {
      headers = {
        host: "8.8.8.8",
        agent: "curl/7",
      };
      req = getMockReq({ headers });
    });

    it("should return host from config", () => {
      expect(backend.getRequestOptions(req)).toHaveProperty(
        "hostname",
        conf.host
      );
    });

    it("should return port from config", () => {
      expect(backend.getRequestOptions(req)).toHaveProperty("port", conf.port);
    });

    it("should contain request headers", () => {
      expect(backend.getRequestOptions(req)).toHaveProperty(
        "headers.agent",
        headers.agent
      );
    });
  });

  describe("proxy", () => {
    let req;
    beforeEach(() => {
      req = getMockReq({
        method: "GET",
        path: "/login",
        headers: { agent: "curl" },
      });
      req.pipe = jest.fn();
    });
    it("should create http request", () => {
      const spy1 = jest.spyOn(http, "request");
      backend.proxy(req);
      expect(spy1).toBeCalled();
    });
  });
});
