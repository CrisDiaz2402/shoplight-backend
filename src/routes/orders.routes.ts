import { Router } from "express";
import { createOrder, getOrders } from "../controllers/orders.controller";
import { authMiddleware } from "../middlewares/authMiddleware";

export const ordersRouter = Router();

ordersRouter.post("/", authMiddleware, createOrder);
ordersRouter.get("/", authMiddleware, getOrders);
