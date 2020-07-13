import { Request, Response } from "express";
import { fixTime, timeSymbol, calcRenderTime } from "../src/utils/render-time";

describe("render-time", () => {
  let req, res;
  beforeEach(() => {
    req = {} as Request;
    res = {} as Response;
  });

  it("fixTime should add time to req object", () => {
    fixTime(req);
    expect(req[timeSymbol]).toBeDefined();
  });

  it("fixTime should not override time", () => {
    fixTime(res);
    const time1 = res[timeSymbol];
    fixTime(res);
    const time2 = res[timeSymbol];
    expect(time1).toStrictEqual(time2);
  });

  it("calcRender time should return diff in ms", () => {
    fixTime(req);
    setTimeout(() => {
      fixTime(res);
      const result = Number.parseFloat(calcRenderTime(req, res));
      expect(result).toBeGreaterThanOrEqual(100);
    }, 100);
  });
});
