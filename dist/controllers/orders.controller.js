"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrders = exports.createOrder = void 0;
const prisma_1 = require("../utils/prisma");
// Crea un pedido, decrementa stock, crea order items y registra ventas (Sale)
const createOrder = async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        console.log('createOrder - start');
        console.log('createOrder - userId:', userId);
        if (!userId)
            return res.status(401).json({ error: "No autorizado" });
        const { items, paymentMethod, paymentDetails } = req.body;
        console.log('createOrder - body items:', Array.isArray(items) ? items.map((i) => ({ productId: i.productId, quantity: i.quantity })) : items);
        console.log('createOrder - paymentMethod:', paymentMethod);
        // items: [{ productId, quantity }]
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: "Items son requeridos" });
        }
        const order = await prisma_1.prisma.$transaction(async (tx) => {
            var _a, _b;
            let subtotalTotal = 0;
            const TAX_RATE = 0.15; // 15% IVA
            const orderItemsData = [];
            for (const it of items) {
                const productId = Number(it.productId);
                const quantity = Number(it.quantity);
                if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
                    throw { status: 400, message: `Item inválido: productId y quantity requeridos` };
                }
                // casteamos a any porque Prisma Client aún puede no estar regenerado localmente
                const product = (await tx.product.findUnique({ where: { id: productId } }));
                console.log(`createOrder - product lookup id=${productId} ->`, product ? { id: product.id, stock: product.stock, price: product.price } : null);
                if (!product)
                    throw { status: 400, message: `Producto ${productId} no encontrado` };
                if (((_a = product.stock) !== null && _a !== void 0 ? _a : 0) < quantity)
                    throw { status: 400, message: `Stock insuficiente para producto ${productId}` };
                const subtotal = product.price * quantity;
                subtotalTotal += subtotal;
                orderItemsData.push({ productId, quantity, subtotal });
                // decrementar stock (casteamos data a any hasta regenerar Prisma Client)
                const updatedProduct = await tx.product.update({ where: { id: productId }, data: { stock: ((_b = product.stock) !== null && _b !== void 0 ? _b : 0) - quantity } });
                console.log(`createOrder - updated product id=${productId} stock from ${product.stock} to ${updatedProduct.stock}`);
                // registrar sale (kardex) — usamos (tx as any).sale para evitar error de tipos si no se ha regenerado el client
                const saleRec = await tx.sale.create({
                    data: {
                        userId,
                        productId,
                        quantity,
                        amount: subtotal,
                        paymentMethod: paymentMethod !== null && paymentMethod !== void 0 ? paymentMethod : "unknown",
                        paymentDetails: paymentDetails !== null && paymentDetails !== void 0 ? paymentDetails : null,
                    },
                });
                console.log(`createOrder - sale created for productId=${productId} saleId=${saleRec === null || saleRec === void 0 ? void 0 : saleRec.id}`);
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
                },
                include: { items: true },
            });
            return created;
        });
        res.status(201).json({ success: true, message: "Pedido creado correctamente", order });
    }
    catch (err) {
        if ((err === null || err === void 0 ? void 0 : err.status) && (err === null || err === void 0 ? void 0 : err.message))
            return res.status(err.status).json({ success: false, message: err.message });
        console.error(err);
        res.status(500).json({ success: false, message: "Error al crear pedido" });
    }
};
exports.createOrder = createOrder;
const getOrders = async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId)
            return res.status(401).json({ error: "No autorizado" });
        const orders = await prisma_1.prisma.order.findMany({ where: { userId }, include: { items: true } });
        res.json(orders);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener pedidos" });
    }
};
exports.getOrders = getOrders;
