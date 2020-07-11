import { Response, Request } from "express";
import { JsonRenderer } from "../src/renderers/Json";
import { ClassicRenderer } from "../src/renderers/Classic";
import { IBackendData } from "../src/types/IBackendData";

describe("ClassicRenderer", () => {
  let renderer, mockReq, mockRes, loadTemplateSpy, renderData: IBackendData;
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
    mockReq = {} as Request;
    mockRes = ({
      send: jest.fn(),
      json: jest.fn(),
    } as unknown) as Response;

    loadTemplateSpy = jest
      .spyOn(renderer, "loadTemplate")
      .mockImplementation((ext: string) => {
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

  it("should resolve render time", async () => {
    const result = await renderer.render(mockReq, mockRes, renderData);
    expect(result).toHaveLength(2);
    result.forEach((val) => expect(val).toEqual(expect.any(Number)));
  });
});

describe("JsonRenderer", () => {
  let renderer, mockReq, mockRes;
  beforeEach(() => {
    renderer = new JsonRenderer();
    mockReq = {} as Request;
    mockRes = ({
      json: jest.fn(),
    } as unknown) as Response;
  });

  it("should have render method", () => {
    expect(renderer.render).toBeDefined();
  });

  it("render method should return Promise", () => {
    expect(renderer.render(mockReq, mockRes, {})).toBeInstanceOf(Promise);
  });

  it("should resolve render time", async () => {
    const result = await renderer.render(mockReq, mockRes, {});
    expect(result).toHaveLength(2);
    result.forEach((val) => expect(val).toEqual(expect.any(Number)));
  });

  it("should pass string to res", async () => {
    await renderer.render(mockReq, mockRes, { a: 1 });
    expect(mockRes.json).toBeCalledWith('{"a":1}');
  });
});
