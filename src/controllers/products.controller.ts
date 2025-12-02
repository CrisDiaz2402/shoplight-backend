import { Request, Response } from "express";
import { prisma } from "../utils/prisma";

export const getProducts = async (req: Request, res: Response) => {
  // incluir category si existe y mantener un orden fijo: los más recientes primero (por createdAt)
  // casteamos resultado a any para evitar errores de tipos hasta regenerar Prisma Client
  const products = (await prisma.product.findMany({ include: { /* @ts-ignore */ category: true } as any, orderBy: { createdAt: 'desc' } })) as any;
  res.json(products);
};

export const getProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const product = (await prisma.product.findUnique({ where: { id: Number(id) }, include: { /* @ts-ignore */ category: true } as any })) as any;
  if (!product) return res.status(404).json({ error: "Producto no encontrado" });
  res.json(product);
};

export const createProduct = async (req: Request, res: Response) => {
  try {
  const { name, description, price, imageUrl, stock, categoryId } = req.body;
    if (!name || price == null) {
      return res.status(400).json({ error: "Faltan campos: name y price son requeridos" });
    }
    const stockValue = Number.isInteger(stock) ? stock : 0;
    // casteamos a 'any' el objeto de datos para evitar errores de tipos hasta que se regenere Prisma Client
    // incluimos categoryId si fue mandado
    const data: any = { name, description, price: Number(price), imageUrl, stock: stockValue };
    if (categoryId != null) data.categoryId = Number(categoryId);
    const product = await prisma.product.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: data as any,
    });
    res.status(201).json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear producto" });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, price, imageUrl, stock, categoryId } = req.body;
    
    const updateData: any = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price != null) updateData.price = Number(price);
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (stock != null) updateData.stock = Number(stock);
    if (categoryId !== undefined) updateData.categoryId = categoryId ? Number(categoryId) : null;
    
    const product = await prisma.product.update({
      where: { id: Number(id) },
      data: updateData,
      include: { category: true } as any,
    }) as any;
    
    res.json(product);
  } catch (err: any) {
    console.error(err);
    if (err?.code === "P2025") {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.status(500).json({ error: "Error al actualizar producto", details: err?.message });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.product.delete({
      where: { id: Number(id) },
    });
    
    res.json({ success: true, message: "Producto eliminado correctamente" });
  } catch (err: any) {
    console.error(err);
    if (err?.code === "P2025") {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.status(500).json({ error: "Error al eliminar producto", details: err?.message });
  }
};
