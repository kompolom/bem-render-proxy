import { Response, Request } from "express";
import { JsonRenderer, ClassicRenderer, IRequest, IResponse } from "../src";
import { IBackendData } from "../src/types/IBackendData";
import { StatsCollector } from "../src/middlewares/StatsCollector";
jest.mock("../src/middlewares/StatsCollector");

describe("ClassicRenderer", () => {
  let renderer, mockReq, mockRes, loadTemplateSpy, renderData: IBackendData, sc;
  beforeEach(() => {
    renderer = new ClassicRenderer({
      bundleFormat: "{platform}",
      pageFormat: "page_{scope}_{view}",
    });
    renderData = {
      page: "index",
      bundle: "shop",
      platform: "desktop",
      title: "title",
      lang: "ru",
      description: "",
      data: {},
    };
    mockReq = {} as IRequest;
    mockRes = ({
      send: jest.fn(),
      json: jest.fn(),
    } as unknown) as IResponse;
    sc = {
      statsCollector: new StatsCollector(mockReq, mockRes),
    };
    mockReq._brp = mockRes._brp = sc;

    loadTemplateSpy = jest
      .spyOn(renderer, "loadTemplate")
      .mockImplementation(() => {
        return {
          BEMTREE: {
            apply: jest.fn(),
            BEMContext: jest.fn(),
          },
          BEMHTML: {
            apply: jest.fn(),
          },
        };
      });
  });

  afterEach(() => {
    loadTemplateSpy.mockRestore();
  });

  it("should have render method", () => {
    expect(renderer.render).toBeDefined();
  });

  it("render method should return Promise", () => {
    expect(renderer.render(mockReq, mockRes, renderData)).toBeInstanceOf(
      Promise
    );
  });

  it("should fix render time", async () => {
    const startSpy = jest.spyOn(renderer, "fixStart");
    const endSpy = jest.spyOn(renderer, "fixEnd");
    await renderer.render(mockReq, mockRes, renderData);
    expect(startSpy).toBeCalledTimes(1);
    expect(endSpy).toBeCalledTimes(1);
    startSpy.mockRestore();
    endSpy.mockRestore();
  });
});

describe("JsonRenderer", () => {
  let renderer, mockReq, mockRes, sc;
  beforeEach(() => {
    renderer = new JsonRenderer();
    mockReq = {} as Request;
    mockRes = ({
      json: jest.fn(),
      send: jest.fn(),
    } as unknown) as Response;
    sc = {
      statsCollector: new StatsCollector(mockReq, mockRes),
    };
    mockReq._brp = mockRes._brp = sc;
  });

  it("should have render method", () => {
    expect(renderer.render).toBeDefined();
  });

  it("render method should return Promise", () => {
    expect(renderer.render(mockReq, mockRes, {})).toBeInstanceOf(Promise);
  });

  it("should call res.json", async () => {
    await renderer.render(mockReq, mockRes, { a: 1 });
    expect(mockRes.json).toBeCalledWith({ a: 1 });
  });

  it("should wrap json with pre tag", async () => {
    const renderer = new JsonRenderer({ wrap: true });
    await renderer.render(mockReq, mockRes, ({
      a: 1,
    } as unknown) as IBackendData);
    expect(mockRes.send).toBeCalledWith('<pre>{\n  "a": 1\n}</pre>');
  });

  it("should fix render time", async () => {
    const startSpy = jest.spyOn(renderer, "fixStart");
    const endSpy = jest.spyOn(renderer, "fixEnd");
    await renderer.render(mockReq, mockRes, {});
    expect(startSpy).toBeCalledTimes(1);
    expect(endSpy).toBeCalledTimes(1);
    startSpy.mockRestore();
    endSpy.mockRestore();
  });
});
