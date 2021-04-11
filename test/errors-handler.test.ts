import { Request, Response } from "express";
import { getMockRes } from "@jest-mock/express";
import {
  ErrorChannel,
  ErrorHandler,
  IErrorsHandlerOpts,
} from "../src/utils/errors-handler";

class MockChannel implements ErrorChannel {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  send(req: Request, res: Response, opts: IErrorsHandlerOpts): void {}
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
  let req, res, opts, eh;
  beforeEach(() => {
    req = {} as Request;
    res = new MockResponse() as Response;
    opts = { error: new Error("Test") };
    eh = new ErrorHandler([new MockChannel()]);
  });

  it("should has handle method", () => {
    expect(typeof eh.handle).toBe("function");
  });

  it("should terminate request", () => {
    const { res } = getMockRes({});
    const spyFinish = jest.spyOn(res, "end");
    const spyHeaders = jest.spyOn(res, "status");
    eh.handle(req, res, opts);

    expect(spyFinish).toBeCalledTimes(1);
    expect(spyHeaders).toBeCalledTimes(1);
  });

  it("should not to try end finished request", () => {
    const { res } = getMockRes({
      headersSent: true,
      writableEnded: true,
    });
    const spyFinish = jest.spyOn(res, "end");
    const spyHeaders = jest.spyOn(res, "status");
    eh.handle(req, res, opts);

    expect(spyFinish).not.toBeCalled();
    expect(spyHeaders).not.toBeCalled();
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
