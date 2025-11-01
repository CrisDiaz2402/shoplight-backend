import { Router } from "express";
import { getProducts, getProduct, createProduct } from "../controllers/products.controller";
import { authMiddleware } from "../middlewares/authMiddleware";

export const productsRouter = Router();

productsRouter.get("/", getProducts);
productsRouter.get("/:id", getProduct);
productsRouter.post("/", authMiddleware, createProduct);
