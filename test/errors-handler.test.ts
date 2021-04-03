import { Request, Response } from "express";
import {
  ErrorChannel,
  ErrorHandler,
  IErrorsHandlerOpts,
} from "../dist/utils/errors-handler";

class MockChannel implements ErrorChannel {
  send(req: Request, res: Response, opts: IErrorsHandlerOpts): void {
    console.log();
  }
}

class MockResponse {
  status(code: number): this {
    return this;
  }
  end() {
    jest.fn();
  }
}

describe("errors-handler", () => {
  let req, res, opts;
  beforeEach(() => {
    req = {} as Request;
    res = new MockResponse() as Response;
    opts = { error: new Error("Test") };
  });

  it("should has handle method", () => {
    const eh = new ErrorHandler([new MockChannel()]);
    expect(typeof eh.handle).toBe("function");
  });

  it("should terminate request", () => {
    const terminateSpy = jest
      .spyOn(ErrorHandler, "terminateRequest")
      .mockImplementation(jest.fn());

    const eh = new ErrorHandler([new MockChannel()]);
    eh.handle(req, res, opts);
    terminateSpy.mockRestore();
  });

  it("should call each error channel", () => {
    const channel1 = new MockChannel();
    const channel2 = new MockChannel();
    const spy1 = jest.spyOn(channel1, "send");
    const spy2 = jest.spyOn(channel2, "send");
    const eh = new ErrorHandler([channel1, channel2]);
    eh.handle(req, res, opts);
    expect(spy1).toBeCalled();
    expect(spy2).toBeCalled();
  });

  it("add channel should modify channels", () => {
    const channel1 = new MockChannel();
    const channel2 = new MockChannel();
    const spy1 = jest.spyOn(channel1, "send");
    const spy2 = jest.spyOn(channel2, "send");
    const eh = new ErrorHandler([channel1]);
    eh.handle(req, res, opts);
    expect(spy1).toBeCalledTimes(1);
    expect(spy2).not.toBeCalled();
    eh.addChannel(channel2);
    eh.handle(req, res, opts);
    expect(spy1).toBeCalledTimes(2);
    expect(spy2).toBeCalledTimes(1);
  });
});
