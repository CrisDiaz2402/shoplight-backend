import { Router } from "express";
import { getCategories, getCategory, createCategory, updateCategory, deleteCategory } from "../controllers/categories.controller";
import { authMiddleware } from "../middlewares/authMiddleware";
import { adminMiddleware } from "../middlewares/adminMiddleware";

export const categoriesRouter = Router();

categoriesRouter.get("/", getCategories);
categoriesRouter.get("/:id", getCategory);
categoriesRouter.post("/", authMiddleware, adminMiddleware, createCategory);
categoriesRouter.put("/:id", authMiddleware, adminMiddleware, updateCategory);
categoriesRouter.delete("/:id", authMiddleware, adminMiddleware, deleteCategory);