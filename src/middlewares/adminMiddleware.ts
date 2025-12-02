import { Request, Response, NextFunction } from "express";

export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  
  if (!user) {
    return res.status(401).json({ error: "No autorizado" });
  }
  
  if (user.role !== "admin") {
    return res.status(403).json({ error: "Se requieren permisos de administrador" });
  }
  
  next();
};