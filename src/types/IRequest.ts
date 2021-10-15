import { Request, Response } from "express";
import { servicesContainer } from "./servicesContainer";

export interface IRequest extends Request {
  _brp: servicesContainer;
}

export interface IResponse extends Response {
  _brp: servicesContainer;
}
