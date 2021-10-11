import { Request } from "express";
import { servicesContainer } from "./servicesContainer";

export interface IRequest extends Request {
  _brp: servicesContainer;
}
