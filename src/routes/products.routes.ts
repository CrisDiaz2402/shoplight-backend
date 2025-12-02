import { Router } from "express";
import { getProducts, getProduct, createProduct, updateProduct, deleteProduct } from "../controllers/products.controller";
import { authMiddleware } from "../middlewares/authMiddleware";
import { adminMiddleware } from "../middlewares/adminMiddleware";

export const productsRouter = Router();

productsRouter.get("/", getProducts);
productsRouter.get("/:id", getProduct);
productsRouter.post("/", authMiddleware, adminMiddleware, createProduct);
productsRouter.put("/:id", authMiddleware, adminMiddleware, updateProduct);
productsRouter.delete("/:id", authMiddleware, adminMiddleware, deleteProduct);
