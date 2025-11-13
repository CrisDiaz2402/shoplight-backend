"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ordersRouter = void 0;
const express_1 = require("express");
const orders_controller_1 = require("../controllers/orders.controller");
const authMiddleware_1 = require("../middlewares/authMiddleware");
exports.ordersRouter = (0, express_1.Router)();
exports.ordersRouter.post("/", authMiddleware_1.authMiddleware, orders_controller_1.createOrder);
exports.ordersRouter.get("/", authMiddleware_1.authMiddleware, orders_controller_1.getOrders);
