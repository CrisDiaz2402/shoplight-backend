import { Router } from "express";
import { getProducts, getProduct, createProduct, updateProduct, deleteProduct } from "../controllers/products.controller";
import { upload, uploadProductImage } from "../controllers/storage.controller"; // <--- IMPORTACIÓN NUEVA
import { authMiddleware } from "../middlewares/authMiddleware";
import { adminMiddleware } from "../middlewares/adminMiddleware";

export const productsRouter = Router();

// Rutas Públicas
productsRouter.get("/", getProducts);
productsRouter.get("/:id", getProduct);

// Rutas Protegidas (Solo Admin)

// 1. Ruta para subir la imagen a S3 (Se llama ANTES de crear el producto)
// Usa 'upload.single' para procesar el archivo que viene en el campo "imagen"
productsRouter.post(
  "/upload-image", 
  authMiddleware, 
  adminMiddleware, 
  upload.single("imagen"), 
  uploadProductImage
);

// 2. Rutas CRUD normales
productsRouter.post("/", authMiddleware, adminMiddleware, createProduct);
productsRouter.put("/:id", authMiddleware, adminMiddleware, updateProduct);
productsRouter.delete("/:id", authMiddleware, adminMiddleware, deleteProduct);