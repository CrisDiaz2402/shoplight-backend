import { Request, Response } from "express";
import { prisma } from "../utils/prisma";

// Crea un pedido, decrementa stock, crea order items y registra ventas (Sale)
export const createOrder = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    console.log('createOrder - start');
    console.log('createOrder - userId:', userId);
    if (!userId) return res.status(401).json({ error: "No autorizado" });

    const { items, paymentMethod, paymentDetails } = req.body;
    console.log('createOrder - body items:', Array.isArray(items) ? items.map((i: any) => ({ productId: i.productId, quantity: i.quantity })) : items);
    console.log('createOrder - paymentMethod:', paymentMethod);
    // items: [{ productId, quantity }]
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Items son requeridos" });
    }

    const order = await prisma.$transaction(async (tx) => {
      let subtotalTotal = 0;
      const TAX_RATE = 0.15; // 15% IVA
      const orderItemsData: Array<{ productId: number; quantity: number; subtotal: number }> = [];

      for (const it of items) {
        const productId = Number(it.productId);
        const quantity = Number(it.quantity);
        if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
          throw { status: 400, message: `Item inválido: productId y quantity requeridos` };
        }

        // casteamos a any porque Prisma Client aún puede no estar regenerado localmente
        const product = (await tx.product.findUnique({ where: { id: productId } })) as any;
        console.log(`createOrder - product lookup id=${productId} ->`, product ? { id: product.id, stock: product.stock, price: product.price } : null);
        if (!product) throw { status: 400, message: `Producto ${productId} no encontrado` };
        if ((product.stock ?? 0) < quantity) throw { status: 400, message: `Stock insuficiente para producto ${productId}` };

        const subtotal = product.price * quantity;
        subtotalTotal += subtotal;
        orderItemsData.push({ productId, quantity, subtotal });

        // decrementar stock (casteamos data a any hasta regenerar Prisma Client)
        const updatedProduct = await tx.product.update({ where: { id: productId }, data: { stock: (product.stock ?? 0) - quantity } as any });
        console.log(`createOrder - updated product id=${productId} stock from ${product.stock} to ${updatedProduct.stock}`);

        // registrar sale (kardex) — usamos (tx as any).sale para evitar error de tipos si no se ha regenerado el client
        const saleRec = await (tx as any).sale.create({
          data: {
            userId,
            productId,
            quantity,
            amount: subtotal,
            paymentMethod: paymentMethod ?? "unknown",
            paymentDetails: paymentDetails ?? null,
          },
        });
        console.log(`createOrder - sale created for productId=${productId} saleId=${saleRec?.id}`);
      }

      // calcular IVA y total
  const iva = Number((subtotalTotal * TAX_RATE).toFixed(2));
  const totalWithIva = Number((subtotalTotal + iva).toFixed(2));
  console.log('createOrder - subtotalTotal, iva, totalWithIva', { subtotalTotal, iva, totalWithIva });

      const created = await tx.order.create({
        // cast a any para evitar errores de tipos hasta regenerar prisma client
        data: {
          userId,
          subtotal: subtotalTotal,
          iva: iva,
          total: totalWithIva,
          status: "sales",
          items: {
            create: orderItemsData.map((oi) => ({ productId: oi.productId, quantity: oi.quantity, subtotal: oi.subtotal })),
          },
        } as any,
        include: { items: true },
      });

      return created;
    });

    res.status(201).json({ success: true, message: "Pedido creado correctamente", order });
  } catch (err: any) {
    if (err?.status && err?.message) return res.status(err.status).json({ success: false, message: err.message });
    console.error(err);
    res.status(500).json({ success: false, message: "Error al crear pedido" });
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
