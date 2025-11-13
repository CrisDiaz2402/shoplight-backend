"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_routes_1 = require("./routes/auth.routes");
const products_routes_1 = require("./routes/products.routes");
const orders_routes_1 = require("./routes/orders.routes");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Rutas
app.use("/auth", auth_routes_1.authRouter);
app.use("/products", products_routes_1.productsRouter);
app.use("/orders", orders_routes_1.ordersRouter);
exports.default = app;
