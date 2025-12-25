import { Router } from "express";
import { 
  register, 
  login, 
  updateUser, 
  deleteUser, 
  getUsers, 
  getAuditLogs // <--- Nueva función importada
} from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/authMiddleware";
import { adminMiddleware } from "../middlewares/adminMiddleware";

export const authRouter = Router();

// Rutas de Autenticación Básicas
authRouter.post("/register", register);
authRouter.post("/login", login);

// Rutas de Gestión de Usuarios (Solo Admin)
authRouter.put("/users/:id", authMiddleware, adminMiddleware, updateUser);
authRouter.delete("/users/:id", authMiddleware, adminMiddleware, deleteUser);
authRouter.get("/users", authMiddleware, adminMiddleware, getUsers);

// Ruta de Auditoría - DynamoDB (Solo Admin)
// Endpoint final: GET /auth/audit
authRouter.get("/audit", authMiddleware, adminMiddleware, getAuditLogs);