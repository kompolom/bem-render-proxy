import express from "express";
import routesData from "./routes";

export const mockBackend = express();

mockBackend.get("/", (req, res) => {
  res.status(200).json(routesData["/"]);
});

mockBackend.get("/render", (req, res) => {
  res
    .status(200)
    .setHeader("Content-Type", "application/bem+json; charset=utf-8");
  res.send(routesData["/"]);
});
