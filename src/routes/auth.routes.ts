import { Router } from "express";
import { register, login, updateUser, deleteUser, getUsers } from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/authMiddleware";
import { adminMiddleware } from "../middlewares/adminMiddleware";

export const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.put("/users/:id", authMiddleware, adminMiddleware, updateUser);
authRouter.delete("/users/:id", authMiddleware, adminMiddleware, deleteUser);
authRouter.get("/users", authMiddleware, adminMiddleware, getUsers);
