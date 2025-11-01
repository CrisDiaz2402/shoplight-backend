import { Request, Response } from "express";
import { prisma } from "../utils/prisma";

export const getProducts = async (req: Request, res: Response) => {
  const products = await prisma.product.findMany();
  res.json(products);
};

export const getProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const product = await prisma.product.findUnique({ where: { id: Number(id) } });
  if (!product) return res.status(404).json({ error: "Producto no encontrado" });
  res.json(product);
};

export const createProduct = async (req: Request, res: Response) => {
  const { name, description, price, imageUrl } = req.body;
  const product = await prisma.product.create({
    data: { name, description, price, imageUrl },
  });
  res.json(product);
};
