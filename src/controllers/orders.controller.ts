import { Request, Response } from "express";
import { prisma } from "../utils/prisma";

// Crea un pedido, decrementa stock, crea order items y registra ventas (Sale)
export const createOrder = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: "No autorizado" });

    const { items, paymentMethod, paymentDetails } = req.body;
    // items: [{ productId, quantity }]
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Items son requeridos" });
    }

    const order = await prisma.$transaction(async (tx) => {
      let total = 0;
      const orderItemsData: Array<{ productId: number; quantity: number; subtotal: number }> = [];

      for (const it of items) {
        const productId = Number(it.productId);
        const quantity = Number(it.quantity);
        if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
          throw { status: 400, message: `Item inválido: productId y quantity requeridos` };
        }

  // casteamos a any porque Prisma Client aún puede no estar regenerado localmente
  const product = (await tx.product.findUnique({ where: { id: productId } })) as any;
  if (!product) throw { status: 400, message: `Producto ${productId} no encontrado` };
  if ((product.stock ?? 0) < quantity) throw { status: 400, message: `Stock insuficiente para producto ${productId}` };

        const subtotal = product.price * quantity;
        total += subtotal;
        orderItemsData.push({ productId, quantity, subtotal });

        // decrementar stock (casteamos data a any hasta regenerar Prisma Client)
        await tx.product.update({ where: { id: productId }, data: { stock: (product.stock ?? 0) - quantity } as any });

        // registrar sale (kardex) — usamos (tx as any).sale para evitar error de tipos si no se ha regenerado el client
        await (tx as any).sale.create({
          data: {
            userId,
            productId,
            quantity,
            amount: subtotal,
            paymentMethod: paymentMethod ?? "unknown",
            paymentDetails: paymentDetails ?? null,
          },
        });
      }

      const created = await tx.order.create({
        data: {
          userId,
          total,
          status: "pending",
          items: {
            create: orderItemsData.map((oi) => ({ productId: oi.productId, quantity: oi.quantity, subtotal: oi.subtotal })),
          },
        },
        include: { items: true },
      });

      return created;
    });

    res.status(201).json(order);
  } catch (err: any) {
    if (err?.status && err?.message) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: "Error al crear pedido" });
  }
};

export const getOrders = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: "No autorizado" });

    const orders = await prisma.order.findMany({ where: { userId }, include: { items: true } });
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener pedidos" });
  }
};
