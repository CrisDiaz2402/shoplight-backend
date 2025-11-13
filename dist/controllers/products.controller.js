"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProduct = exports.getProduct = exports.getProducts = void 0;
const prisma_1 = require("../utils/prisma");
const getProducts = async (req, res) => {
    // incluir category si existe y mantener un orden fijo: los más recientes primero (por createdAt)
    // casteamos resultado a any para evitar errores de tipos hasta regenerar Prisma Client
    const products = (await prisma_1.prisma.product.findMany({ include: { /* @ts-ignore */ category: true }, orderBy: { createdAt: 'desc' } }));
    res.json(products);
};
exports.getProducts = getProducts;
const getProduct = async (req, res) => {
    const { id } = req.params;
    const product = (await prisma_1.prisma.product.findUnique({ where: { id: Number(id) }, include: { /* @ts-ignore */ category: true } }));
    if (!product)
        return res.status(404).json({ error: "Producto no encontrado" });
    res.json(product);
};
exports.getProduct = getProduct;
const createProduct = async (req, res) => {
    try {
        const { name, description, price, imageUrl, stock, categoryId } = req.body;
        if (!name || price == null) {
            return res.status(400).json({ error: "Faltan campos: name y price son requeridos" });
        }
        const stockValue = Number.isInteger(stock) ? stock : 0;
        // casteamos a 'any' el objeto de datos para evitar errores de tipos hasta que se regenere Prisma Client
        // incluimos categoryId si fue mandado
        const data = { name, description, price: Number(price), imageUrl, stock: stockValue };
        if (categoryId != null)
            data.categoryId = Number(categoryId);
        const product = await prisma_1.prisma.product.create({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: data,
        });
        res.status(201).json(product);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al crear producto" });
    }
};
exports.createProduct = createProduct;
