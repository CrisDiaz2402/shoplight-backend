import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.routes";
import { productsRouter } from "./routes/products.routes";
//import { ordersRouter } from "./routes/orders.routes";

const app = express();

app.use(cors());
app.use(express.json());

// Rutas
app.use("/auth", authRouter);
app.use("/products", productsRouter);
//app.use("/orders", ordersRouter);

export default app;
