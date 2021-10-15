import * as path from "path";
import { applyPatches } from "../src/utils/apply-patches";
import { Response } from "express";
import { IRequest } from "../src";

const patchRoot = path.resolve(__dirname, "patch");
const mockRes = {} as Response;

describe("apply-patches", () => {
  let DATA, spyError, spyLog, _brp;

  beforeEach(() => {
    DATA = {
      a: 1,
      b: 2,
      c: 3,
    };
    _brp = {
      logger: {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
    };
    spyError = jest.spyOn(_brp.logger, "error").mockImplementation();
    spyLog = jest.spyOn(_brp.logger, "log").mockImplementation();
  });

  afterEach(() => {
    spyError.mockRestore();
    spyLog.mockRestore();
  });

  it("Should not change if request not contain patch", () => {
    const mockReq = { query: {}, _brp } as IRequest;
    const dataCopy = Object.assign({}, DATA);
    applyPatches(mockReq, mockRes, dataCopy);
    expect(dataCopy).toEqual(DATA);
  });

  it("Patch should modify data", () => {
    const mockReq = ({ query: { patch: "p1" }, _brp } as unknown) as IRequest;
    applyPatches(mockReq, mockRes, DATA, patchRoot);
    expect(DATA).toEqual({ a: 4, b: 5, c: 6 });
  });

  it("Should apply multiple patches", () => {
    const mockReq = ({
      query: { patch: "p1;p2" },
      _brp,
    } as unknown) as IRequest;
    applyPatches(mockReq, mockRes, DATA, patchRoot);
    expect(DATA).toEqual({ a: 4, b: 5, c: 6, d: 7 });
  });

  it("Should not throw if patch not found", () => {
    const mockReq = { query: { patch: "wrongPath" }, _brp };
    expect(applyPatches.bind(this, mockReq, {})).not.toThrow();
  });

  it("Should try require data/patch by default", () => {
    const mockReq = ({
      query: { patch: "wrongPath" },
      _brp,
    } as unknown) as IRequest;
    applyPatches(mockReq, mockRes, DATA);
    expect(
      spyError.mock.calls[spyError.mock.calls.length - 1][0].message
    ).toMatch(path.join("data", "patch", "wrongPath"));
  });

  it("Should try require specific path", () => {
    const mockReq = ({
      query: { patch: "wrongPath" },
      _brp,
    } as unknown) as IRequest;
    applyPatches(mockReq, mockRes, DATA, patchRoot);
    expect(
      spyError.mock.calls[spyError.mock.calls.length - 1][0].message
    ).toMatch(patchRoot);
  });
});
