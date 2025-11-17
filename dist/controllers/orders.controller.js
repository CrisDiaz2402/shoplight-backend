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
        // Validaciones más específicas
        if (!items) {
            return res.status(400).json({
                success: false,
                message: "El campo 'items' es requerido",
                details: "No se proporcionó la lista de productos para el pedido"
            });
        }
        if (!Array.isArray(items)) {
            return res.status(400).json({
                success: false,
                message: "El campo 'items' debe ser un arreglo",
                details: "Los items deben estar en formato de lista/arreglo"
            });
        }
        if (items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Debe incluir al menos un producto en el pedido",
                details: "La lista de items está vacía"
            });
        }
        // Validar formato de cada item
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item.productId) {
                return res.status(400).json({
                    success: false,
                    message: `El item ${i + 1} no tiene productId`,
                    details: "Cada item debe tener un productId válido"
                });
            }
            if (!item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `El item ${i + 1} no tiene quantity`,
                    details: "Cada item debe tener una cantidad válida"
                });
            }
        }
        const order = await prisma_1.prisma.$transaction(async (tx) => {
            var _a, _b, _c;
            let subtotalTotal = 0;
            const TAX_RATE = 0.15; // 15% IVA
            const orderItemsData = [];
            for (const it of items) {
                const productId = Number(it.productId);
                const quantity = Number(it.quantity);
                if (!productId || isNaN(productId)) {
                    throw { status: 400, message: `ProductId inválido: '${it.productId}' no es un número válido` };
                }
                if (!Number.isInteger(quantity) || quantity <= 0) {
                    throw { status: 400, message: `Cantidad inválida: '${it.quantity}' debe ser un número entero positivo` };
                }
                // casteamos a any porque Prisma Client aún puede no estar regenerado localmente
                const product = (await tx.product.findUnique({ where: { id: productId } }));
                console.log(`createOrder - product lookup id=${productId} ->`, product ? { id: product.id, stock: product.stock, price: product.price } : null);
                if (!product) {
                    throw { status: 400, message: `Producto con ID ${productId} no encontrado. Verifique que el producto exista en el catálogo.` };
                }
                if (((_a = product.stock) !== null && _a !== void 0 ? _a : 0) < quantity) {
                    throw { status: 400, message: `Stock insuficiente para el producto '${product.name}' (ID: ${productId}). Stock disponible: ${(_b = product.stock) !== null && _b !== void 0 ? _b : 0}, solicitado: ${quantity}` };
                }
                const subtotal = product.price * quantity;
                subtotalTotal += subtotal;
                orderItemsData.push({ productId, quantity, subtotal });
                // decrementar stock (casteamos data a any hasta regenerar Prisma Client)
                const updatedProduct = await tx.product.update({ where: { id: productId }, data: { stock: ((_c = product.stock) !== null && _c !== void 0 ? _c : 0) - quantity } });
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
        // Si es un error customizado que lanzamos en el código
        if ((err === null || err === void 0 ? void 0 : err.status) && (err === null || err === void 0 ? void 0 : err.message)) {
            console.error('Error customizado en createOrder:', err.message);
            return res.status(err.status).json({
                success: false,
                message: err.message,
                details: `Error específico: ${err.message}`
            });
        }
        // Si es un error de Prisma
        if (err === null || err === void 0 ? void 0 : err.code) {
            console.error('Error de Prisma en createOrder:', err);
            let message = "Error de base de datos";
            switch (err.code) {
                case 'P2002':
                    message = "Error de duplicación de datos. Verifique que no existan datos duplicados.";
                    break;
                case 'P2025':
                    message = "No se encontró el registro especificado en la base de datos.";
                    break;
                case 'P2003':
                    message = "Error de referencia. Verifique que los datos relacionados existan.";
                    break;
                case 'P2014':
                    message = "Error de relación entre datos. Verifique las referencias.";
                    break;
                default:
                    message = `Error de base de datos: ${err.code}`;
            }
            return res.status(400).json({
                success: false,
                message,
                details: `Código de error: ${err.code}`,
                error: err.message || 'Error de base de datos'
            });
        }
        // Error de validación o parsing
        if ((err === null || err === void 0 ? void 0 : err.name) === 'ValidationError' || (err === null || err === void 0 ? void 0 : err.name) === 'TypeError') {
            console.error('Error de validación en createOrder:', err.message);
            return res.status(400).json({
                success: false,
                message: "Error en los datos proporcionados",
                details: err.message,
                error: "Verifique que todos los campos requeridos estén presentes y sean válidos"
            });
        }
        // Error genérico con más detalles
        console.error('Error no manejado en createOrder:', err);
        return res.status(500).json({
            success: false,
            message: "Error interno del servidor al crear el pedido",
            details: (err === null || err === void 0 ? void 0 : err.message) || "Error desconocido",
            error: "Por favor, contacte al administrador si el problema persiste",
            timestamp: new Date().toISOString()
        });
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
        console.error('Error en getOrders:', err);
        // Si es un error de Prisma
        if (err === null || err === void 0 ? void 0 : err.code) {
            return res.status(400).json({
                error: "Error de base de datos al obtener pedidos",
                details: err.message || `Código de error: ${err.code}`
            });
        }
        res.status(500).json({
            error: "Error interno del servidor al obtener pedidos",
            details: (err === null || err === void 0 ? void 0 : err.message) || "Error desconocido",
            timestamp: new Date().toISOString()
        });
    }
};
exports.getOrders = getOrders;
