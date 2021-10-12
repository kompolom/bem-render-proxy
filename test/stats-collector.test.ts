import { StatsCollector, HRTime } from "../src/middlewares/StatsCollector";
import { getMockReq, getMockRes } from "@jest-mock/express";

describe("StatsCollector", () => {
  const time1: HRTime = [18037, 800717500],
    time2: HRTime = [18038, 192331400];
  let collector: StatsCollector;
  beforeEach(() => {
    const req = getMockReq();
    const { res } = getMockRes();
    res.once = res.on = jest.fn();
    collector = new StatsCollector(req, res);
  });

  describe("values", () => {
    it("should store value", () => {
      collector.pushValue("testname", "testvalue");
      expect(collector.getStats()).toHaveProperty("testname", "testvalue");
    });

    it("should create array of values", () => {
      collector.pushValue("one", 1);
      collector.pushValue("one", 2);
      collector.pushValue("one", 3);
      expect(collector.getStats()).toHaveProperty("one", [1, 2, 3]);
    });
  });

  describe("timings", () => {
    it("should calculate timing by key", () => {
      collector.fixTime("a");
      collector.fixTime("a");
      expect(collector.getTiming("a")).toEqual(expect.any(Number));
      expect(collector.getTiming("a")).not.toBeNaN();
    });

    it("should not calculate timing by single value", () => {
      collector.pushTiming("a", time1);
      expect(collector.getTiming("a")).toBeNaN();
    });

    it("should not return NaN in timings", () => {
      collector.fixTime("a");
      expect(collector.getTimings()).not.toHaveProperty("a");
    });

    it("should return timings as object", () => {
      collector.pushTiming("a", time1);
      collector.pushTiming("a", time2);
      expect(collector.getTimings()).toHaveProperty(
        "aTime",
        expect.any(Number)
      );
    });
  });
});
