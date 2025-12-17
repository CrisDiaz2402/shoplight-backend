import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { notificarVentaAdmin } from "../services/notification.service";  // Servicio SNS (Alertas)
import { registrarAuditoriaVenta } from "../utils/dynamo"; // Servicio DynamoDB (Auditoría)
// 1. IMPORTACIÓN DE SQS
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

// 2. INICIALIZAR EL CLIENTE SQS
// Tomará las credenciales automáticamente del entorno (igual que SNS y Dynamo)
const sqsClient = new SQSClient({ region: "us-east-1" });

// Crea un pedido, decrementa stock, crea order items y registra ventas (Sale)
export const createOrder = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    console.log('createOrder - start');
    console.log('createOrder - userId:', userId);
    if (!userId) return res.status(401).json({ error: "No autorizado" });

    const { items, paymentMethod, paymentDetails } = req.body;
    
    // Validaciones
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "El campo 'items' es requerido y no puede estar vacío" 
      });
    }
    
    // Validar formato de cada item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.productId || !item.quantity) {
        return res.status(400).json({ 
          success: false, 
          message: `El item ${i + 1} debe tener productId y quantity` 
        });
      }
    }

    // --- TRANSACCIÓN DE BASE DE DATOS (PostgreSQL) ---
    const order = await prisma.$transaction(async (tx: any) => {
      let subtotalTotal = 0;
      const TAX_RATE = 0.15; // 15% IVA
      const orderItemsData: Array<{ productId: number; quantity: number; subtotal: number }> = [];

      for (const it of items) {
        const productId = Number(it.productId);
        const quantity = Number(it.quantity);
        
        if (!productId || quantity <= 0) {
          throw { status: 400, message: `Datos inválidos para el producto ID: ${it.productId}` };
        }

        // Buscamos el producto
        const product = (await tx.product.findUnique({ where: { id: productId } })) as any;
        
        if (!product) {
          throw { status: 400, message: `Producto con ID ${productId} no encontrado` };
        }
        
        if ((product.stock ?? 0) < quantity) {
          throw { status: 400, message: `Stock insuficiente para '${product.name}'. Disponible: ${product.stock}, Solicitado: ${quantity}` };
        }

        const subtotal = product.price * quantity;
        subtotalTotal += subtotal;
        orderItemsData.push({ productId, quantity, subtotal });

        // 1. Decrementar stock
        await tx.product.update({ 
            where: { id: productId }, 
            data: { stock: (product.stock ?? 0) - quantity } as any 
        });

        // 2. Registrar en Sale (Kardex)
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

      // Calcular totales
      const iva = Number((subtotalTotal * TAX_RATE).toFixed(2));
      const totalWithIva = Number((subtotalTotal + iva).toFixed(2));

      // 3. Crear la Orden con sus Items
      const orderData = {
        userId,
        subtotal: subtotalTotal,
        iva: iva,
        total: totalWithIva,
        status: "sales",
        items: {
          create: orderItemsData.map((oi) => ({ 
            productId: oi.productId, 
            quantity: oi.quantity, 
            subtotal: oi.subtotal 
          })),
        },
      };

      const created = await tx.order.create({
        data: orderData as any,
        include: { items: true },
      });

      return created;
    });

    // --- SERVICIOS AWS ADICIONALES (Se ejecutan tras el éxito de la BD) ---

    // 2. Notificar al Administrador (Amazon SNS)
    notificarVentaAdmin(order.id, Number(order.total), items.length);

    // 3. Registrar Log de Auditoría (Amazon DynamoDB)
    registrarAuditoriaVenta(userId, order.id, Number(order.total));

    // 4. DESACOPLAMIENTO DE PROCESAMIENTO (Amazon SQS) <--- IMPLEMENTACIÓN SQS
    // Enviamos un mensaje a la cola para que otros sistemas (facturación, logística) lo procesen después.
    try {
      if (process.env.SQS_QUEUE_URL) {
        await sqsClient.send(new SendMessageCommand({
          QueueUrl: process.env.SQS_QUEUE_URL,
          MessageBody: JSON.stringify({
            event: "ORDER_CREATED",
            orderId: order.id,
            userId: userId,
            total: order.total,
            timestamp: new Date().toISOString()
          })
        }));
        console.log(`[SQS] Mensaje enviado correctamente para orden #${order.id}`);
      } else {
        console.warn("[SQS] Variable SQS_QUEUE_URL no definida en .env");
      }
    } catch (sqsError) {
      // Importante: Si falla la cola, NO cancelamos la venta. Solo registramos el error.
      console.error("Error enviando mensaje a SQS:", sqsError);
    }

    res.status(201).json({ success: true, message: "Pedido creado correctamente", order });

  } catch (err: any) {
    console.error('Error en createOrder:', err);
    
    // Errores controlados
    if (err?.status && err?.message) {
      return res.status(err.status).json({ success: false, message: err.message });
    }

    // Errores de Prisma u otros
    return res.status(500).json({ 
      success: false, 
      message: "Error interno al procesar el pedido",
      error: err?.message || "Error desconocido"
    });
  }
};

// Obtiene el historial de pedidos del usuario logueado
export const getOrders = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: "No autorizado" });

    const orders = await prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }, 
      include: {
        items: {
          include: {
            product: true 
          }
        }
      }
    });

    res.json(orders);
  } catch (err: any) {
    console.error('Error en getOrders:', err);
    res.status(500).json({ 
      error: "Error al obtener el historial de pedidos",
      details: err?.message 
    });
  }
};