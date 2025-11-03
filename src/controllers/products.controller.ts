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
