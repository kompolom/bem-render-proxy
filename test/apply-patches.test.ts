import * as path from "path";
import { applyPatches } from "../src/utils/apply-patches";
import { Request, Response } from "express";

const patchRoot = path.resolve(__dirname, "patch");
const mockRes = {} as Response;

describe("apply-patches", () => {
  let DATA, spyError, spyLog;

  beforeEach(() => {
    DATA = {
      a: 1,
      b: 2,
      c: 3,
    };
    spyError = jest.spyOn(console, "error").mockImplementation();
    spyLog = jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    spyError.mockRestore();
    spyLog.mockRestore();
  });

  it("Should not change if request not contain patch", () => {
    const mockReq = { query: {} } as Request;
    const dataCopy = Object.assign({}, DATA);
    applyPatches(mockReq, mockRes, dataCopy);
    expect(dataCopy).toEqual(DATA);
  });

  it("Patch should modify data", () => {
    const mockReq = ({ query: { patch: "p1" } } as unknown) as Request;
    applyPatches(mockReq, mockRes, DATA, patchRoot);
    expect(DATA).toEqual({ a: 4, b: 5, c: 6 });
  });

  it("Should apply multiple patches", () => {
    const mockReq = ({ query: { patch: "p1;p2" } } as unknown) as Request;
    applyPatches(mockReq, mockRes, DATA, patchRoot);
    expect(DATA).toEqual({ a: 4, b: 5, c: 6, d: 7 });
  });

  it("Should not throw if patch not found", () => {
    const mockReq = { query: { patch: "wrongPath" } };
    expect(applyPatches.bind(this, mockReq, {})).not.toThrow();
  });

  it("Should try require data/patch by default", () => {
    const mockReq = ({ query: { patch: "wrongPath" } } as unknown) as Request;
    applyPatches(mockReq, mockRes, DATA);
    expect(
      spyError.mock.calls[spyError.mock.calls.length - 1][0].message
    ).toMatch(path.join("data", "patch", "wrongPath"));
  });

  it("Should try require specific path", () => {
    const mockReq = ({ query: { patch: "wrongPath" } } as unknown) as Request;
    applyPatches(mockReq, mockRes, DATA, patchRoot);
    expect(
      spyError.mock.calls[spyError.mock.calls.length - 1][0].message
    ).toMatch(patchRoot);
  });
});
