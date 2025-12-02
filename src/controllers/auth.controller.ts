import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Faltan campos: email, password y name son requeridos" });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashed, name },
    });
    // No devolver el password al cliente
    const safeUser = { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt, updatedAt: user.updatedAt };
    return res.status(201).json({ success: true, message: "Usuario registrado correctamente", user: safeUser });
  } catch (err: any) {
    console.error(err);
    if (err?.code === "P2002") {
      return res.status(400).json({ success: false, message: "El email ya está registrado" });
    }
    res.status(500).json({ success: false, message: "Error al registrar usuario" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ success: false, message: "Usuario no encontrado" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ success: false, message: "Contraseña incorrecta" });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET!, {
      expiresIn: "2h",
    });

    // No devolver el password al cliente
    const safeUser = { id: user.id, email: user.email, name: user.name, role: user.role };
    res.json({ success: true, message: "Inicio de sesión exitoso", token, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error al iniciar sesión" });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, password, role } = req.body;
    
    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (password) updateData.password = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: updateData,
    });
    
    // No devolver el password al cliente
    const safeUser = { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt, updatedAt: user.updatedAt };
    res.json({ success: true, message: "Usuario actualizado correctamente", user: safeUser });
  } catch (err: any) {
    console.error(err);
    if (err?.code === "P2002") {
      return res.status(400).json({ success: false, message: "El email ya está registrado" });
    }
    if (err?.code === "P2025") {
      return res.status(404).json({ success: false, message: "Usuario no encontrado" });
    }
    res.status(500).json({ success: false, message: "Error al actualizar usuario" });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.user.delete({
      where: { id: Number(id) },
    });
    
    res.json({ success: true, message: "Usuario eliminado correctamente" });
  } catch (err: any) {
    console.error(err);
    if (err?.code === "P2025") {
      return res.status(404).json({ success: false, message: "Usuario no encontrado" });
    }
    res.status(500).json({ success: false, message: "Error al eliminar usuario" });
  }
};
