import { Request, Response } from "express";
import { prisma } from "../utils/prisma";

export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(categories);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener categorías", details: err?.message });
  }
};

export const getCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const category = await prisma.category.findUnique({
      where: { id: Number(id) },
      include: { products: true },
    });
    
    if (!category) {
      return res.status(404).json({ error: "Categoría no encontrada" });
    }
    
    res.json(category);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener categoría", details: err?.message });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: "El campo 'name' es requerido" });
    }
    
    const category = await prisma.category.create({
      data: { name, description },
    });
    
    res.status(201).json(category);
  } catch (err: any) {
    console.error(err);
    if (err?.code === "P2002") {
      return res.status(400).json({ error: "Ya existe una categoría con ese nombre" });
    }
    res.status(500).json({ error: "Error al crear categoría", details: err?.message });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    const updateData: any = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    
    const category = await prisma.category.update({
      where: { id: Number(id) },
      data: updateData,
    });
    
    res.json(category);
  } catch (err: any) {
    console.error(err);
    if (err?.code === "P2002") {
      return res.status(400).json({ error: "Ya existe una categoría con ese nombre" });
    }
    if (err?.code === "P2025") {
      return res.status(404).json({ error: "Categoría no encontrada" });
    }
    res.status(500).json({ error: "Error al actualizar categoría", details: err?.message });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Verificar si hay productos asociados a esta categoría
    const productsCount = await prisma.product.count({
      where: { categoryId: Number(id) },
    });
    
    if (productsCount > 0) {
      return res.status(400).json({ 
        error: `No se puede eliminar la categoría porque tiene ${productsCount} producto(s) asociado(s). Primero reasigna o elimina los productos.` 
      });
    }
    
    await prisma.category.delete({
      where: { id: Number(id) },
    });
    
    res.json({ success: true, message: "Categoría eliminada correctamente" });
  } catch (err: any) {
    console.error(err);
    if (err?.code === "P2025") {
      return res.status(404).json({ error: "Categoría no encontrada" });
    }
    res.status(500).json({ error: "Error al eliminar categoría", details: err?.message });
  }
};